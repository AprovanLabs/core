import { Stack, type StackProps } from "aws-cdk-lib";
import { StringParameter } from "aws-cdk-lib/aws-ssm";
import type { Construct } from "constructs";
import type { IdentityStack } from "./identity.js";
import type { IdentityTablesStack } from "./tables.js";

export interface EnvironmentStackProps extends StackProps {
  environmentName: string;
  identity: IdentityStack;
  tables: IdentityTablesStack;
}

export class EnvironmentStack extends Stack {
  constructor(scope: Construct, id: string, props: EnvironmentStackProps) {
    super(scope, id, props);
    const region = Stack.of(this).region;
    const authority = `https://cognito-idp.${region}.amazonaws.com/${props.identity.userPool.userPoolId}`;
    const domain = `https://aprovan.auth.${region}.amazoncognito.com`;
    const values = [
      `COGNITO_USER_POOL_ID=${props.identity.userPool.userPoolId}`,
      `COGNITO_CLIENT_ID=${props.identity.client.userPoolClientId}`,
      `COGNITO_AUTHORITY=${authority}`,
      `COGNITO_DOMAIN=${domain}`,
      `GATEWAY_OIDC_ISSUER=${authority}`,
      `GATEWAY_OIDC_AUDIENCE=${props.identity.client.userPoolClientId}`,
      "GATEWAY_URL=https://aprovan.com/api/gateway",
      `USERS_TABLE=${props.tables.users.tableName}`,
      `WORKSPACES_TABLE=${props.tables.workspaces.tableName}`,
      `MEMBERSHIPS_TABLE=${props.tables.memberships.tableName}`,
      `INVITES_TABLE=${props.tables.invites.tableName}`,
    ].join("\n");

    new StringParameter(this, "AprovanEnvironment", {
      parameterName: `/aprovan/${props.environmentName}/env`,
      description: `Aprovan ${props.environmentName} shared environment`,
      stringValue: values,
    });
  }
}
