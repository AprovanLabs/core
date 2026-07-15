include .env
export
CDK_DEFAULT_REGION ?= $(AWS_DEFAULT_REGION)
CDK_DEFAULT_ACCOUNT ?= $(AWS_ACCOUNT_ID)
export CDK_DEFAULT_REGION CDK_DEFAULT_ACCOUNT

.PHONY: deploy
deploy:
	pnpm run build
	pnpm run synth
	pnpm run deploy

.PHONY: bootstrap
bootstrap:
	pnpm run cdk bootstrap

# Seeds the ACM certificate ARN the WebStack reads. Pass ARN=arn:aws:acm:us-east-1:...
.PHONY: set-certificate-arn
set-certificate-arn:
	@test -n "$(ARN)" || { echo "ARN=<certificate-arn> is required"; exit 1; }
	aws ssm put-parameter --overwrite --type String \
	  --region us-east-1 \
	  --name /aprovan/$(ENVIRONMENT)/web/certificate-arn \
	  --value "$(ARN)"
