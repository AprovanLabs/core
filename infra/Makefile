include ../.env
PRODUCT=terraform
VERSION=1.7.2
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

install-alpine:
	apk add --update --virtual .deps --no-cache gnupg && \
		cd /tmp && \
		wget https://releases.hashicorp.com/${PRODUCT}/${VERSION}/${PRODUCT}_${VERSION}_linux_amd64.zip && \
		wget https://releases.hashicorp.com/${PRODUCT}/${VERSION}/${PRODUCT}_${VERSION}_SHA256SUMS && \
		wget https://releases.hashicorp.com/${PRODUCT}/${VERSION}/${PRODUCT}_${VERSION}_SHA256SUMS.sig && \
		wget -qO- https://www.hashicorp.com/.well-known/pgp-key.txt | gpg --import && \
		gpg --verify ${PRODUCT}_${VERSION}_SHA256SUMS.sig ${PRODUCT}_${VERSION}_SHA256SUMS && \
		grep ${PRODUCT}_${VERSION}_linux_amd64.zip ${PRODUCT}_${VERSION}_SHA256SUMS | sha256sum -c && \
		unzip /tmp/${PRODUCT}_${VERSION}_linux_amd64.zip -d /tmp && \
		mv /tmp/${PRODUCT} /usr/local/bin/${PRODUCT} && \
		rm -f /tmp/${PRODUCT}_${VERSION}_linux_amd64.zip ${PRODUCT}_${VERSION}_SHA256SUMS ${VERSION}/${PRODUCT}_${VERSION}_SHA256SUMS.sig && \
		apk del .deps

tunnel:
	sudo cloudflared service install ${CLOUDFLARE_TUNNEL_ID}

import:
	terraform import github_repository.core core
