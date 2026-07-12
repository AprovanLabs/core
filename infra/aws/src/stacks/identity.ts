import path from "node:path";
import {
  Duration,
  RemovalPolicy,
  Stack,
  type StackProps,
} from "aws-cdk-lib";
import * as cognito from "aws-cdk-lib/aws-cognito";
import * as lambda from "aws-cdk-lib/aws-lambda";
import { NodejsFunction } from "aws-cdk-lib/aws-lambda-nodejs";
import type { Construct } from "constructs";
import { namer } from "../naming.js";
import type { IdentityTablesStack } from "./tables.js";

export interface IdentityStackProps extends StackProps {
  tables: IdentityTablesStack;
}

export class IdentityStack extends Stack {
  readonly userPool: cognito.UserPool;
  readonly client: cognito.UserPoolClient;
  readonly domain: cognito.UserPoolDomain;

  constructor(scope: Construct, id: string, props: IdentityStackProps) {
    super(scope, id, props);
    const names = namer();
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
      entry: path.join(
        process.cwd(),
        "src/lambdas/post-confirmation/index.ts",
      ),
      handler: "handler",
      runtime: lambda.Runtime.NODEJS_22_X,
      architecture: lambda.Architecture.ARM_64,
      timeout: Duration.seconds(10),
      environment: {
        USERS_TABLE: props.tables.users.tableName,
        WORKSPACES_TABLE: props.tables.workspaces.tableName,
        MEMBERSHIPS_TABLE: props.tables.memberships.tableName,
        INVITES_TABLE: props.tables.invites.tableName,
      },
    });
    for (const table of [
      props.tables.users,
      props.tables.workspaces,
      props.tables.memberships,
      props.tables.invites,
    ]) {
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
      "https://aprovan.com/registry/auth/callback",
      "https://aprovan.com/chat/auth/callback",
      "http://localhost",
      "http://localhost:3000/auth/callback",
      "http://localhost:4000/auth/callback",
      "http://127.0.0.1:8400/callback",
    ];
    this.client = this.userPool.addClient("PublicClient", {
      userPoolClientName: names.regional("public-client"),
      generateSecret: false,
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
  }
}
