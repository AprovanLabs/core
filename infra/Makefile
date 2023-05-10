include .env
export

.PHONY: deploy
deploy: terraform.tfstate
	terraform plan
	terraform apply --auto-approve

terraform.tfstate:
	terraform init

clean:
	rm -f terraform.tfstate
	rm -f terraform.tfstate.backup
	rm -f .terraform.lock.hcl
