import { namer, type Namer } from "@aprovan/cdk";
import {
  CfnOutput,
  Duration,
  RemovalPolicy,
  Stack,
  type StackProps,
} from "aws-cdk-lib";
import { Certificate } from "aws-cdk-lib/aws-certificatemanager";
import * as cloudfront from "aws-cdk-lib/aws-cloudfront";
import * as origins from "aws-cdk-lib/aws-cloudfront-origins";
import * as s3 from "aws-cdk-lib/aws-s3";
import { StringParameter } from "aws-cdk-lib/aws-ssm";
import type { Construct } from "constructs";

export interface WebStackProps extends StackProps {
  environmentName: string;
  names: Namer;
}

export class WebStack extends Stack {
  constructor(scope: Construct, id: string, props: WebStackProps) {
    super(scope, id, props);
    const { environmentName, names } = props;

    const certificateArn = StringParameter.valueForStringParameter(
      this,
      `/aprovan/${environmentName}/web/certificate-arn`
    );

    const gatewayFunctionUrlDomain = `registry-${namer().getEnvironment()}-use2-gateway`

    const certificate = Certificate.fromCertificateArn(
      this,
      "Certificate",
      certificateArn
    );

    const bucket = new s3.Bucket(this, "Bucket", {
      bucketName: names.global("web"),
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      encryption: s3.BucketEncryption.S3_MANAGED,
      enforceSSL: true,
      removalPolicy: RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
    });

    const rewrite = new cloudfront.Function(this, "StaticRewrite", {
      runtime: cloudfront.FunctionRuntime.JS_2_0,
      code: cloudfront.FunctionCode.fromInline(`
function handler(event) {
  var request = event.request;
  if (!request.uri.includes(".") && !request.uri.endsWith("/")) request.uri += "/";
  if (request.uri.endsWith("/")) request.uri += "index.html";
  return request;
}`),
    });

    // SigV4-signs CloudFront's requests to the gateway Lambda Function URL so
    // the IAM-protected URL accepts them (unsigned public invocation is blocked
    // org-wide). Origin type "lambda" tells CloudFront to sign for the Lambda
    // service; the Lambda grants cloudfront.amazonaws.com invoke in the registry
    // repo's gateway stack.
    const gatewayOac = new cloudfront.CfnOriginAccessControl(this, "GatewayOac", {
      originAccessControlConfig: {
        name: names.global("gateway-oac"),
        originAccessControlOriginType: "lambda",
        signingBehavior: "always",
        signingProtocol: "sigv4",
      },
    });

    const distribution = new cloudfront.Distribution(this, "Distribution", {
      domainNames: ["aprovan.com"],
      certificate,
      minimumProtocolVersion:
        cloudfront.SecurityPolicyProtocol.TLS_V1_2_2021,
      defaultRootObject: "index.html",
      defaultBehavior: {
        origin: origins.S3BucketOrigin.withOriginAccessControl(bucket),
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        cachePolicy: cloudfront.CachePolicy.CACHING_OPTIMIZED,
        functionAssociations: [
          {
            function: rewrite,
            eventType: cloudfront.FunctionEventType.VIEWER_REQUEST,
          },
        ],
      },
      additionalBehaviors: {
        "api/gateway/*": {
          // Plain HttpOrigin to the gateway Function URL, with the lambda OAC
          // attached so CloudFront SigV4-signs each request. We can't use
          // `FunctionUrlOrigin.withOriginAccessControl` (which wants a live
          // IFunctionUrl and adds the invoke permission here) because the
          // gateway Lambda lives in another repo/region — we only have its
          // domain string. The invoke permission is granted on the Lambda in
          // the registry repo's gateway stack.
          origin: new origins.HttpOrigin(gatewayFunctionUrlDomain, {
            protocolPolicy: cloudfront.OriginProtocolPolicy.HTTPS_ONLY,
            readTimeout: Duration.seconds(60),
            keepaliveTimeout: Duration.seconds(60),
            originAccessControlId: gatewayOac.attrId,
          }),
          allowedMethods: cloudfront.AllowedMethods.ALLOW_ALL,
          cachePolicy: cloudfront.CachePolicy.CACHING_DISABLED,
          originRequestPolicy:
            cloudfront.OriginRequestPolicy.ALL_VIEWER_EXCEPT_HOST_HEADER,
          viewerProtocolPolicy:
            cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        },
      },
    });

    new CfnOutput(this, "CertificateArn", {
      value: certificate.certificateArn,
    });
    new CfnOutput(this, "DistributionDomain", {
      value: distribution.distributionDomainName,
    });
    new CfnOutput(this, "DistributionId", {
      value: distribution.distributionId,
    });
    new CfnOutput(this, "BucketName", { value: bucket.bucketName });

    // Cross-repo discovery contract: sibling projects (e.g. the registry) that
    // sync static assets into this bucket read these to find the deploy target
    // instead of hardcoding ids. Parameters live in this stack's region.
    new StringParameter(this, "WebBucketParam", {
      parameterName: `/aprovan/${environmentName}/web/bucket`,
      description: `Aprovan ${environmentName} shared web bucket name`,
      stringValue: bucket.bucketName,
    });
    new StringParameter(this, "WebDistributionIdParam", {
      parameterName: `/aprovan/${environmentName}/web/distribution-id`,
      description: `Aprovan ${environmentName} aprovan.com CloudFront distribution id`,
      stringValue: distribution.distributionId,
    });
  }
}
