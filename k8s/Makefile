include ../.env
export

run:
	kubectl ctx rancher-desktop
	kustomize build . | kubectl apply -f -

delete:
	kustomize build . | kubectl delete -f -

db:
	kubectl port-forward service/postgres 5432

bootstrap:
	curl -s https://fluxcd.io/install.sh | sudo bash
	. <(flux completion bash)

	flux bootstrap github \
		--token-auth \
		--owner=AprovanLabs \
		--repository=core \
		--branch=main \
		--path=k8s/clusters/ \
		--team=ci
