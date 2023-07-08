include .env
export

.PHONY: deploy
deploy: terraform.tfstate
	terraform plan
	terraform apply --auto-approve

.terraform:
	terraform init

clean:
	rm -f terraform.tfstate
	rm -f terraform.tfstate.backup
	rm -f .terraform.lock.hcl

install:
	sudo apt-get update && sudo apt-get install -y gnupg software-properties-common
	wget -O- https://apt.releases.hashicorp.com/gpg | \
		gpg --dearmor | \
		sudo tee /usr/share/keyrings/hashicorp-archive-keyring.gpg
	gpg --no-default-keyring \
		--keyring /usr/share/keyrings/hashicorp-archive-keyring.gpg \
		--fingerprint
	echo "deb [signed-by=/usr/share/keyrings/hashicorp-archive-keyring.gpg] \
		https://apt.releases.hashicorp.com $(lsb_release -cs) main" | \
		sudo tee /etc/apt/sources.list.d/hashicorp.list

	sudo apt update
	sudo apt-get install terraform

	# brew install cloudflare/cloudflare/cloudflared

tunnel:
	sudo cloudflared service install ${CLOUDFLARE_TUNNEL_ID}
