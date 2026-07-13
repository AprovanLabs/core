include .env
export

.PHONY: deploy
deploy:
	pnpm run build
	pnpm run synth
	pnpm run deploy

.PHONY: bootstrap
bootstrap:
	pnpm run cdk bootstrap
