import { GetParameterCommand, SSMClient } from "@aws-sdk/client-ssm";
import { parse } from "dotenv";

export const aprovanEnvParameterName = (environment = "prd"): string =>
  `/aprovan/${environment}/env`;

export interface LoadAprovanEnvOptions {
  client?: SSMClient;
  overwrite?: boolean;
}

export async function getAprovanEnv(
  environment = "prd",
  client = new SSMClient({}),
): Promise<{ raw: string; values: Record<string, string> }> {
  const response = await client.send(
    new GetParameterCommand({
      Name: aprovanEnvParameterName(environment),
      WithDecryption: true,
    }),
  );
  const raw = response.Parameter?.Value;
  if (raw === undefined) {
    throw new Error(`Aprovan environment parameter ${environment} has no value`);
  }
  return { raw, values: parse(raw) };
}

export async function loadAprovanEnv(
  environment = "prd",
  options: LoadAprovanEnvOptions = { overwrite: true },
): Promise<Record<string, string>> {
  const { values } = await getAprovanEnv(environment, options.client);
  for (const [key, value] of Object.entries(values)) {
    if (options.overwrite !== false || process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
  return values;
}
