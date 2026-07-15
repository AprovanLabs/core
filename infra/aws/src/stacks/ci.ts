import { type Namer } from "@aprovan/cdk";
import { CfnOutput, Stack, type StackProps } from "aws-cdk-lib";
import * as iam from "aws-cdk-lib/aws-iam";
import type { Construct } from "constructs";

export interface CiStackProps extends StackProps {
  environmentName: string;
  names: Namer;
  /**
   * GitHub repositories (owner/name) allowed to assume the deploy role. Each is
   * matched against the OIDC `sub` claim as `repo:<owner>/<name>:*`.
   */
  repositories: string[];
}

const GITHUB_OIDC_URL = "https://token.actions.githubusercontent.com";

/**
 * GitHub Actions OIDC provider and the deploy role sibling repos assume to ship
 * their web/infra from CI — no long-lived AWS keys. The role is intentionally
 * scoped to what the registry deploy scripts need:
 *   - sync the static site into the shared aprovan.com bucket + invalidate it
 *   - read the SSM discovery/identity parameters
 *   - drive `cdk deploy` through the CDK bootstrap roles
 */
export class CiStack extends Stack {
  readonly deployRole: iam.Role;

  constructor(scope: Construct, id: string, props: CiStackProps) {
    super(scope, id, props);
    const { environmentName, names, repositories } = props;
    const { account } = this;

    const provider = new iam.OpenIdConnectProvider(this, "GitHubOidc", {
      url: GITHUB_OIDC_URL,
      clientIds: ["sts.amazonaws.com"],
    });

    const principal = new iam.OpenIdConnectPrincipal(provider, {
      StringEquals: {
        "token.actions.githubusercontent.com:aud": "sts.amazonaws.com",
      },
      StringLike: {
        "token.actions.githubusercontent.com:sub": repositories.map(
          (repo) => `repo:${repo}:*`,
        ),
      },
    });

    const webBucketName = names.global("web");

    this.deployRole = new iam.Role(this, "RegistryDeployRole", {
      roleName: names.regional("registry-deploy"),
      description:
        "Assumed by GitHub Actions to deploy the registry web app + infra",
      assumedBy: principal,
    });

    // Static site → shared aprovan.com bucket.
    this.deployRole.addToPolicy(
      new iam.PolicyStatement({
        sid: "SyncWebBucket",
        actions: [
          "s3:PutObject",
          "s3:DeleteObject",
          "s3:GetObject",
          "s3:GetBucketLocation",
          "s3:ListBucket",
        ],
        resources: [
          `arn:aws:s3:::${webBucketName}`,
          `arn:aws:s3:::${webBucketName}/*`,
        ],
      }),
    );

    // Invalidate the CloudFront cache after a sync.
    this.deployRole.addToPolicy(
      new iam.PolicyStatement({
        sid: "InvalidateDistribution",
        actions: [
          "cloudfront:CreateInvalidation",
          "cloudfront:GetInvalidation",
        ],
        resources: [`arn:aws:cloudfront::${account}:distribution/*`],
      }),
    );

    // Discovery + shared identity parameters the deploy scripts read, plus the
    // CDK bootstrap version parameter the CLI checks.
    this.deployRole.addToPolicy(
      new iam.PolicyStatement({
        sid: "ReadDeployParameters",
        actions: ["ssm:GetParameter", "ssm:GetParameters"],
        resources: [
          `arn:aws:ssm:*:${account}:parameter/aprovan/*`,
          `arn:aws:ssm:*:${account}:parameter/cdk-bootstrap/*`,
        ],
      }),
    );

    // `cdk deploy` performs all privileged actions by assuming the bootstrap
    // roles, so the CI role only needs to assume those.
    this.deployRole.addToPolicy(
      new iam.PolicyStatement({
        sid: "AssumeCdkBootstrapRoles",
        actions: ["sts:AssumeRole", "sts:TagSession"],
        resources: [`arn:aws:iam::${account}:role/cdk-hnb659fds-*`],
      }),
    );

    new CfnOutput(this, "GitHubOidcProviderArn", {
      value: provider.openIdConnectProviderArn,
    });
    new CfnOutput(this, "RegistryDeployRoleArn", {
      value: this.deployRole.roleArn,
      description: `Set as vars.AWS_DEPLOY_ROLE_ARN in the ${environmentName} registry repo`,
      exportName: names.regional("registry-deploy-role-arn"),
    });
  }
}
