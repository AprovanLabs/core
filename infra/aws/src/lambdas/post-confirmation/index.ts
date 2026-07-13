import {
  ConditionalCheckFailedException,
  DynamoDBClient,
} from "@aws-sdk/client-dynamodb";
import {
  DeleteCommand,
  DynamoDBDocumentClient,
  PutCommand,
  QueryCommand,
} from "@aws-sdk/lib-dynamodb";
import type { PostConfirmationTriggerEvent } from "aws-lambda";

const database = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const env = (name: string): string => {
  const value = process.env[name];
  if (!value) throw new Error(`Missing ${name}`);
  return value;
};

export async function handler(
  event: PostConfirmationTriggerEvent,
): Promise<PostConfirmationTriggerEvent> {
  if (event.triggerSource !== "PostConfirmation_ConfirmSignUp") return event;
  const email = event.request.userAttributes["email"];
  if (!email) return event;
  const sub = event.userName;
  const createdAt = new Date().toISOString();

  try {
    await database.send(
      new PutCommand({
        TableName: env("DYNAMODB_USERS_TABLE"),
        Item: { sub, email, createdAt },
        // `sub` is a DynamoDB reserved word; alias it via ExpressionAttributeNames.
        ConditionExpression: "attribute_not_exists(#sub)",
        ExpressionAttributeNames: { "#sub": "sub" },
      }),
    );
  } catch (error) {
    if (error instanceof ConditionalCheckFailedException) return event;
    throw error;
  }

  const result = await database.send(
    new QueryCommand({
      TableName: env("DYNAMODB_INVITES_TABLE"),
      IndexName: "ByEmailWorkspace",
      KeyConditionExpression: "email = :email",
      ExpressionAttributeValues: { ":email": email },
      Limit: 1,
    }),
  );
  const invite = result.Items?.[0];
  const workspaceId =
    typeof invite?.["workspaceId"] === "string"
      ? invite["workspaceId"]
      : crypto.randomUUID();

  if (!invite) {
    await database.send(
      new PutCommand({
        TableName: env("DYNAMODB_WORKSPACES_TABLE"),
        Item: {
          workspaceId,
          name: `${email}'s workspace`,
          plan: "free",
          createdAt,
          updatedAt: createdAt,
        },
      }),
    );
  }

  await database.send(
    new PutCommand({
      TableName: env("DYNAMODB_MEMBERSHIPS_TABLE"),
      Item: {
        workspaceId,
        userId: sub,
        role:
          typeof invite?.["role"] === "string" ? invite["role"] : "admin",
        createdAt,
      },
    }),
  );

  if (typeof invite?.["inviteToken"] === "string") {
    await database.send(
      new DeleteCommand({
        TableName: env("DYNAMODB_INVITES_TABLE"),
        Key: { inviteToken: invite["inviteToken"] },
      }),
    );
  }
  return event;
}
