/**
 * Lambda@Edge (origin request, includeBody) for the `api/gateway/*` behavior.
 *
 * CloudFront's Origin Access Control SigV4-signs origin requests to the
 * gateway's IAM-protected Lambda Function URL, but never hashes request
 * bodies itself — it signs whatever `x-amz-content-sha256` the request
 * carries. Browsers under our control send the header (gatewayFetch); a
 * third-party client (an MCP client POSTing JSON-RPC) does not, so its
 * requests fail signature validation. This function fills the header in from
 * the actual body before OAC signs.
 *
 * Bodies CloudFront truncates (>1 MB at the origin-request event) are left
 * untouched — a hash of a truncated body would be wrong — so oversized
 * uploads keep the client-supplied-header contract.
 *
 * The OAC signature also *overwrites* the viewer's `Authorization` header, so
 * clients speaking standard OAuth (MCP clients, per spec) would arrive at the
 * gateway tokenless. Since this function runs before OAC signs, it preserves
 * the viewer token by copying `Authorization` → `X-Aprovan-Authorization`
 * (the header the gateway reads first) unless the client already set it.
 */

import { createHash } from "node:crypto";
import type { CloudFrontRequestEvent, CloudFrontRequestResult } from "aws-lambda";

const HASH_HEADER = "x-amz-content-sha256";
const AUTH_HEADER = "x-aprovan-authorization";

export const handler = async (
  event: CloudFrontRequestEvent,
): Promise<CloudFrontRequestResult> => {
  const request = event.Records[0]!.cf.request;
  const { headers, body } = request;

  if (!headers[HASH_HEADER] && body && !body.inputTruncated) {
    const payload = Buffer.from(
      body.data ?? "",
      body.encoding === "base64" ? "base64" : "utf8",
    );
    headers[HASH_HEADER] = [
      { key: HASH_HEADER, value: createHash("sha256").update(payload).digest("hex") },
    ];
  }

  const authorization = headers["authorization"]?.[0]?.value;
  if (authorization && !headers[AUTH_HEADER]) {
    headers[AUTH_HEADER] = [
      { key: "X-Aprovan-Authorization", value: authorization },
    ];
  }

  return request;
};
