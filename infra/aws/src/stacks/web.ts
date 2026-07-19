import * as path from "node:path";
import { type Namer } from "@aprovan/cdk";
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
import * as lambda from "aws-cdk-lib/aws-lambda";
import { NodejsFunction } from "aws-cdk-lib/aws-lambda-nodejs";
import * as s3 from "aws-cdk-lib/aws-s3";
import { StringParameter } from "aws-cdk-lib/aws-ssm";
import type { Construct } from "constructs";

export interface WebStackProps extends StackProps {
  environmentName: string;
  gatewayFunctionUrlDomain: string;
  names: Namer;
}

export class WebStack extends Stack {
  constructor(scope: Construct, id: string, props: WebStackProps) {
    super(scope, id, props);
    const { environmentName, gatewayFunctionUrlDomain, names } = props;

    const certificateArn = StringParameter.valueForStringParameter(
      this,
      `/aprovan/${environmentName}/web/certificate-arn`
    );

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
    // OAC signs whatever `x-amz-content-sha256` a request carries but never
    // hashes bodies itself, so bodied requests from clients we don't control
    // (MCP clients POSTing JSON-RPC) fail signature validation. This edge
    // function fills the header in from the body before OAC signs. Must be
    // x86_64 + env-free (Lambda@Edge), and this stack is already us-east-1.
    const oacBodyHash = new NodejsFunction(this, "OacBodyHash", {
      entry: path.join(process.cwd(), "src/lambdas/oac-body-hash/index.ts"),
      handler: "handler",
      runtime: lambda.Runtime.NODEJS_22_X,
      architecture: lambda.Architecture.X86_64,
      memorySize: 128,
      timeout: Duration.seconds(5),
    });

    // The origin request policy swaps Host for the Lambda URL domain, so the
    // gateway builds public URLs (MCP resource metadata, WWW-Authenticate)
    // from X-Forwarded-Host — set here from the viewer's Host.
    const forwardHost = new cloudfront.Function(this, "GatewayForwardHost", {
      runtime: cloudfront.FunctionRuntime.JS_2_0,
      code: cloudfront.FunctionCode.fromInline(`
function handler(event) {
  var request = event.request;
  request.headers["x-forwarded-host"] = { value: request.headers.host.value };
  return request;
}`),
    });

    // Lambda Function URLs remap WWW-Authenticate to
    // x-amzn-remapped-www-authenticate; restore it so OAuth-aware MCP clients
    // see the RFC 9728 resource_metadata challenge. Must be Lambda@Edge at
    // origin response — CloudFront skips viewer-response functions on 4xx/5xx.
    const restoreAuthHeader = new NodejsFunction(this, "RestoreAuthHeader", {
      entry: path.join(process.cwd(), "src/lambdas/restore-auth-header/index.ts"),
      handler: "handler",
      runtime: lambda.Runtime.NODEJS_22_X,
      architecture: lambda.Architecture.X86_64,
      memorySize: 128,
      timeout: Duration.seconds(5),
    });

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
      additionalBehaviors: (() => {
        // Plain HttpOrigin to the gateway Function URL, with the lambda OAC
        // attached so CloudFront SigV4-signs each request. We can't use
        // `FunctionUrlOrigin.withOriginAccessControl` (which wants a live
        // IFunctionUrl and adds the invoke permission here) because the
        // gateway Lambda lives in another repo/region — we only have its
        // domain string. The invoke permission is granted on the Lambda in
        // the registry repo's gateway stack.
        const gatewayBehavior: cloudfront.BehaviorOptions = {
          origin: new origins.HttpOrigin(gatewayFunctionUrlDomain, {
            protocolPolicy: cloudfront.OriginProtocolPolicy.HTTPS_ONLY,
            readTimeout: Duration.seconds(60),
            keepaliveTimeout: Duration.seconds(60),
            originAccessControlId: gatewayOac.attrId,
          }),
          allowedMethods: cloudfront.AllowedMethods.ALLOW_ALL,
          cachePolicy: cloudfront.CachePolicy.CACHING_DISABLED,
          functionAssociations: [
            {
              function: forwardHost,
              eventType: cloudfront.FunctionEventType.VIEWER_REQUEST,
            },
          ],
          edgeLambdas: [
            {
              functionVersion: oacBodyHash.currentVersion,
              eventType: cloudfront.LambdaEdgeEventType.ORIGIN_REQUEST,
              includeBody: true,
            },
            {
              functionVersion: restoreAuthHeader.currentVersion,
              eventType: cloudfront.LambdaEdgeEventType.ORIGIN_RESPONSE,
            },
          ],
          originRequestPolicy:
            cloudfront.OriginRequestPolicy.ALL_VIEWER_EXCEPT_HOST_HEADER,
          viewerProtocolPolicy:
            cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        };
        return {
          // Whole /api/* namespace: /api/gateway/* (REST) + /api/mcp (MCP).
          "api/*": gatewayBehavior,
          // RFC 9728 OAuth resource metadata for the MCP endpoint — resolved
          // by MCP clients at the domain root.
          ".well-known/*": gatewayBehavior,
        };
      })(),
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
