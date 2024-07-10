terraform {
  required_version = ">= 1.7.0"

  required_providers {
    flux = {
      source  = "fluxcd/flux"
      version = ">= 1.2"
    }
    github = {
      source  = "integrations/github"
      version = ">= 6.1"
    }
    kind = {
      source  = "tehcyx/kind"
      version = ">= 0.4"
    }
  }
}

resource "github_repository" "core" {
  name        = var.github_repository
  description = var.github_repository
  visibility  = "private"
  auto_init   = true
}

resource "flux_bootstrap_git" "core" {
  depends_on = [github_repository.this]

  embedded_manifests = true
  path               = "k8s/clusters/internal"
}
