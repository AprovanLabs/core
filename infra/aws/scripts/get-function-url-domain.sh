#!/bin/sh

set -e

lambda_function_name=$1

aws lambda list-function-url-configs \
  --function-name $lambda_function_name \
  --region us-east-2 \
  --query 'FunctionUrlConfigs[0].FunctionUrl' \
  --output text
