import { RemovalPolicy, Stack, type StackProps } from "aws-cdk-lib";
import {
  AttributeType,
  BillingMode,
  ProjectionType,
  Table,
} from "aws-cdk-lib/aws-dynamodb";
import type { Construct } from "constructs";
import { namer } from "../naming.js";

export class IdentityTablesStack extends Stack {
  readonly users: Table;
  readonly workspaces: Table;
  readonly memberships: Table;
  readonly invites: Table;

  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);
    const names = namer();
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
      sortKey: { name: "userSub", type: AttributeType.STRING },
    });
    this.memberships.addGlobalSecondaryIndex({
      indexName: "ByUserSub",
      partitionKey: { name: "userSub", type: AttributeType.STRING },
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
  }
}
