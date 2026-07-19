/**
 * Lambda@Edge (origin response) for the gateway behaviors.
 *
 * Lambda Function URLs remap the `WWW-Authenticate` response header to
 * `x-amzn-remapped-www-authenticate`, hiding the RFC 9728 OAuth challenge
 * (with its `resource_metadata` pointer) from MCP clients. A CloudFront
 * viewer-response function can't restore it — CloudFront skips viewer-response
 * functions when the origin returns a 4xx/5xx, which is exactly when the
 * challenge is sent — so this runs at origin response, which fires on every
 * origin status. Must be x86_64 + env-free (Lambda@Edge).
 */

import type {
  CloudFrontResponseEvent,
  CloudFrontResponseResult,
} from "aws-lambda";

const REMAPPED = "x-amzn-remapped-www-authenticate";

export const handler = async (
  event: CloudFrontResponseEvent,
): Promise<CloudFrontResponseResult> => {
  const response = event.Records[0]!.cf.response;
  const remapped = response.headers[REMAPPED]?.[0]?.value;
  if (remapped && !response.headers["www-authenticate"]) {
    response.headers["www-authenticate"] = [
      { key: "WWW-Authenticate", value: remapped },
    ];
    delete response.headers[REMAPPED];
  }
  return response;
};
