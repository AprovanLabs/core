import { type Namer } from "@aprovan/cdk";
import {
  CfnOutput,
  CfnParameter,
  Duration,
  RemovalPolicy,
  Stack,
  type StackProps,
} from "aws-cdk-lib";
import {
  Certificate,
  CertificateValidation,
} from "aws-cdk-lib/aws-certificatemanager";
import * as cloudfront from "aws-cdk-lib/aws-cloudfront";
import * as origins from "aws-cdk-lib/aws-cloudfront-origins";
import * as s3 from "aws-cdk-lib/aws-s3";
import type { Construct } from "constructs";

export interface WebStackProps extends StackProps {
  names: Namer;
}

export class WebStack extends Stack {
  readonly certificate: Certificate;

  constructor(scope: Construct, id: string, props: WebStackProps) {
    super(scope, id, props);
    const { names } = props;

    this.certificate = new Certificate(this, "Certificate", {
      certificateName: names.global("aprovan-com"),
      domainName: "aprovan.com",
      subjectAlternativeNames: ["*.aprovan.com"],
      validation: CertificateValidation.fromDns(),
    });

    const gatewayDomain = new CfnParameter(this, "GatewayFunctionUrlDomain", {
      type: "String",
      description: "Gateway Lambda Function URL domain without a scheme",
    });
    const buckets = {
      root: this.siteBucket("Root"),
      registry: this.siteBucket("Registry"),
      chat: this.siteBucket("Chat"),
    };
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
    const staticBehavior = (
      bucket: s3.IBucket,
    ): cloudfront.BehaviorOptions => ({
      origin: origins.S3BucketOrigin.withOriginAccessControl(bucket),
      viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
      cachePolicy: cloudfront.CachePolicy.CACHING_OPTIMIZED,
      functionAssociations: [
        {
          function: rewrite,
          eventType: cloudfront.FunctionEventType.VIEWER_REQUEST,
        },
      ],
    });
    const distribution = new cloudfront.Distribution(this, "Distribution", {
      domainNames: ["aprovan.com"],
      certificate: this.certificate,
      minimumProtocolVersion:
        cloudfront.SecurityPolicyProtocol.TLS_V1_2_2021,
      defaultRootObject: "index.html",
      defaultBehavior: staticBehavior(buckets.root),
      additionalBehaviors: {
        "registry/*": staticBehavior(buckets.registry),
        "chat/*": staticBehavior(buckets.chat),
        "api/gateway/*": {
          origin: new origins.HttpOrigin(gatewayDomain.valueAsString, {
            protocolPolicy: cloudfront.OriginProtocolPolicy.HTTPS_ONLY,
            readTimeout: Duration.seconds(60),
            keepaliveTimeout: Duration.seconds(60),
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
      value: this.certificate.certificateArn,
    });
    new CfnOutput(this, "DistributionDomain", {
      value: distribution.distributionDomainName,
    });
    for (const [name, bucket] of Object.entries(buckets)) {
      new CfnOutput(this, `${name}BucketName`, { value: bucket.bucketName });
    }
  }

  private siteBucket(id: string): s3.Bucket {
    return new s3.Bucket(this, `${id}Bucket`, {
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      encryption: s3.BucketEncryption.S3_MANAGED,
      enforceSSL: true,
      removalPolicy: RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
    });
  }
}
