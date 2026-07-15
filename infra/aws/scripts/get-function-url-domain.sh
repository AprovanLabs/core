#!/bin/sh

set -e

lambda_function_name=$1

# Emit the bare host (no scheme, no trailing slash) so it can be stored directly
# in SSM and used as a CloudFront origin domain without further normalization.
aws lambda list-function-url-configs \
  --function-name "$lambda_function_name" \
  --region us-east-2 \
  --query 'FunctionUrlConfigs[0].FunctionUrl' \
  --output text \
  | sed -e 's#^https\{0,1\}://##' -e 's#/$##'
