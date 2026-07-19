import path from "node:path";
import { type Namer, namer } from "@aprovan/cdk";
import {
  Duration,
  RemovalPolicy,
  Stack,
  type StackProps,
} from "aws-cdk-lib";
import * as cognito from "aws-cdk-lib/aws-cognito";
import {
  AttributeType,
  BillingMode,
  ProjectionType,
  Table,
} from "aws-cdk-lib/aws-dynamodb";
import * as iam from "aws-cdk-lib/aws-iam";
import * as lambda from "aws-cdk-lib/aws-lambda";
import { NodejsFunction } from "aws-cdk-lib/aws-lambda-nodejs";
import {
  AwsCustomResource,
  AwsCustomResourcePolicy,
  PhysicalResourceId,
} from "aws-cdk-lib/custom-resources";
import type { Construct } from "constructs";

export interface MainStackProps extends StackProps {
  environmentName: string;
  names: Namer;
}

/**
 * Single core stack for an environment: identity tables, the Cognito user
 * pool and its triggers, and the shared SSM environment parameter.
 */
export class MainStack extends Stack {
  readonly users: Table;
  readonly workspaces: Table;
  readonly memberships: Table;
  readonly invites: Table;
  readonly userPool: cognito.UserPool;
  readonly client: cognito.UserPoolClient;
  readonly domain: cognito.UserPoolDomain;

  constructor(scope: Construct, id: string, props: MainStackProps) {
    super(scope, id, props);
    const { names, environmentName } = props;

    // --- Identity tables ---------------------------------------------------
    const common = {
      billingMode: BillingMode.PAY_PER_REQUEST,
      removalPolicy: RemovalPolicy.DESTROY,
    };

    this.users = new Table(this, "Users", {
      ...common,
      tableName: names.regional("users"),
      partitionKey: { name: "sub", type: AttributeType.STRING },
    });
    this.users.addGlobalSecondaryIndex({
      indexName: "ByEmail",
      partitionKey: { name: "email", type: AttributeType.STRING },
      projectionType: ProjectionType.ALL,
    });

    this.workspaces = new Table(this, "Workspaces", {
      ...common,
      tableName: names.regional("workspaces"),
      partitionKey: { name: "workspaceId", type: AttributeType.STRING },
    });

    this.memberships = new Table(this, "Memberships", {
      ...common,
      tableName: names.regional("memberships"),
      partitionKey: { name: "workspaceId", type: AttributeType.STRING },
      sortKey: { name: "userId", type: AttributeType.STRING },
    });
    this.memberships.addGlobalSecondaryIndex({
      indexName: "ByUserId",
      partitionKey: { name: "userId", type: AttributeType.STRING },
      projectionType: ProjectionType.ALL,
    });

    this.invites = new Table(this, "Invites", {
      ...common,
      tableName: names.regional("invites"),
      partitionKey: { name: "inviteToken", type: AttributeType.STRING },
    });
    this.invites.addGlobalSecondaryIndex({
      indexName: "ByEmailWorkspace",
      partitionKey: { name: "email", type: AttributeType.STRING },
      sortKey: { name: "workspaceId", type: AttributeType.STRING },
      projectionType: ProjectionType.ALL,
    });

    const tables = [this.users, this.workspaces, this.memberships, this.invites];

    // --- Identity (Cognito) ------------------------------------------------
    this.userPool = new cognito.UserPool(this, "UserPool", {
      userPoolName: names.regional("identity"),
      removalPolicy: RemovalPolicy.DESTROY,
      selfSignUpEnabled: true,
      signInAliases: { email: true },
      autoVerify: { email: true },
      passwordPolicy: {
        minLength: 8,
        requireLowercase: true,
        requireUppercase: true,
        requireDigits: true,
        requireSymbols: false,
        tempPasswordValidity: Duration.days(7),
      },
      standardAttributes: {
        email: { required: true, mutable: true },
      },
      userVerification: {
        emailStyle: cognito.VerificationEmailStyle.LINK,
        emailSubject: "Verify your email for Aprovan",
        emailBody: "Verify your Aprovan account at {##Verify Email##}",
      },
    });

    const postConfirmation = new NodejsFunction(this, "PostConfirmation", {
      functionName: names.regional("post-confirmation"),
      entry: path.join(process.cwd(), "src/lambdas/post-confirmation/index.ts"),
      handler: "handler",
      runtime: lambda.Runtime.NODEJS_22_X,
      architecture: lambda.Architecture.ARM_64,
      timeout: Duration.seconds(10),
      environment: {
        DYNAMODB_USERS_TABLE: this.users.tableName,
        DYNAMODB_WORKSPACES_TABLE: this.workspaces.tableName,
        DYNAMODB_MEMBERSHIPS_TABLE: this.memberships.tableName,
        DYNAMODB_INVITES_TABLE: this.invites.tableName,
      },
    });
    for (const table of tables) {
      table.grantReadWriteData(postConfirmation);
    }
    this.userPool.addTrigger(
      cognito.UserPoolOperation.POST_CONFIRMATION,
      postConfirmation,
    );

    const googleClientId = process.env["GOOGLE_CLIENT_ID"];
    const googleClientSecret = process.env["GOOGLE_CLIENT_SECRET"];
    if (googleClientId && googleClientSecret) {
      new cognito.UserPoolIdentityProviderGoogle(this, "Google", {
        userPool: this.userPool,
        clientId: googleClientId,
        clientSecret: googleClientSecret,
        attributeMapping: {
          email: cognito.ProviderAttribute.GOOGLE_EMAIL,
        },
        scopes: ["email", "openid", "profile"],
      });
    }

    const callbackUrls = [
      "https://aprovan.com/auth/callback",
      "http://localhost",
      "http://localhost:3000/auth/callback",
      "http://localhost:4000/auth/callback",
      "http://127.0.0.1:8400/callback",
      // Patchwork
      "http://localhost:5173/auth/callback",
      "http://localhost:5173/chat/auth/callback",
      "https://patchwork.com/chat/auth/callback",
      "https://aprovan.com/chat/auth/callback",
      // Registry
      "http://localhost:4321/auth/callback",
      "https://aprovan.com/registry/auth/callback",
    ];
    this.client = this.userPool.addClient("PublicClient", {
      userPoolClientName: names.regional("public-client"),
      generateSecret: false,
      // Sessions stay signed in for 30 days: web clients renew the ~1h access
      // token silently with the refresh token (see @aprovan/ui/auth).
      accessTokenValidity: Duration.hours(1),
      idTokenValidity: Duration.hours(1),
      refreshTokenValidity: Duration.days(30),
      oAuth: {
        flows: { authorizationCodeGrant: true },
        scopes: [
          cognito.OAuthScope.OPENID,
          cognito.OAuthScope.PROFILE,
          cognito.OAuthScope.EMAIL,
        ],
        callbackUrls,
        logoutUrls: [
          "https://aprovan.com/registry",
          "https://aprovan.com/chat",
          "http://localhost",
          "http://localhost:5173/chat",
        ],
      },
      supportedIdentityProviders: [
        cognito.UserPoolClientIdentityProvider.COGNITO,
        ...(googleClientId && googleClientSecret
          ? [cognito.UserPoolClientIdentityProvider.GOOGLE]
          : []),
      ],
    });
    this.domain = this.userPool.addDomain("HostedDomain", {
      cognitoDomain: { domainPrefix: "aprovan" },
    });

    // --- Shared environment parameter --------------------------------------
    const region = Stack.of(this).region;
    const authority = `https://cognito-idp.${region}.amazonaws.com/${this.userPool.userPoolId}`;
    const cognitoDomain = `https://aprovan.auth.${region}.amazoncognito.com`;
    const values = [
      `ORG=${namer().getOrg()}`,
      `AWS_REGION=${namer().getRegion()}`,
      `REGION=${namer().getRegion()}`,
      `ENVIRONMENT=${namer().getEnvironment()}`,
      `REGION_SHORT_CODE=${namer().getRegionShortCode()}`,
      `COGNITO_USER_POOL_ID=${this.userPool.userPoolId}`,
      `COGNITO_CLIENT_ID=${this.client.userPoolClientId}`,
      `COGNITO_AUTHORITY=${authority}`,
      `COGNITO_DOMAIN=${cognitoDomain}`,
      `OIDC_ISSUER=${authority}`,
      `OIDCAUDIENCE=${this.client.userPoolClientId}`,
      "GATEWAY_URL=https://aprovan.com/api/gateway",
      `DYNAMODB_USERS_TABLE=${this.users.tableName}`,
      `DYNAMODB_WORKSPACES_TABLE=${this.workspaces.tableName}`,
      `DYNAMODB_MEMBERSHIPS_TABLE=${this.memberships.tableName}`,
      `DYNAMODB_INVITES_TABLE=${this.invites.tableName}`,
    ].join("\n");

    const envParameterName = `/aprovan/${environmentName}/env`;
    const putEnvironmentParameter = {
      service: "SSM" as const,
      action: "putParameter" as const,
      parameters: {
        Name: envParameterName,
        Description: `Aprovan ${environmentName} shared environment`,
        Type: "String",
        Value: values,
        Overwrite: true,
      },
      physicalResourceId: PhysicalResourceId.of(envParameterName),
    };

    // "AprovanEnvironmentWriter" (not "AprovanEnvironment"): the previous
    // deploy managed this parameter as an AWS::SSM::Parameter under that id,
    // and CloudFormation forbids changing a logical resource's type in place.
    // The old resource carries DeletionPolicy: Retain, so replacing it leaves
    // the live parameter for this writer to overwrite.
    new AwsCustomResource(this, "AprovanEnvironmentWriter", {
      onCreate: putEnvironmentParameter,
      onUpdate: putEnvironmentParameter,
      onDelete: {
        service: "SSM",
        action: "deleteParameter",
        parameters: {
          Name: envParameterName,
        },
      },
      policy: AwsCustomResourcePolicy.fromStatements([
        new iam.PolicyStatement({
          actions: ["ssm:PutParameter", "ssm:DeleteParameter"],
          resources: [
            `arn:aws:ssm:${region}:${this.account}:parameter/aprovan/${environmentName}/env`,
          ],
        }),
      ]),
    });
  }
}
