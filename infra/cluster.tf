resource "flux_bootstrap_git" "core" {
  embedded_manifests = true
  path               = "k8s/clusters/production"
}
