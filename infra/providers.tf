provider "cloudflare" {
  api_key = var.cloudflare_api_key
  email   = var.email
}

provider "flux" {
  kubernetes = {
    host                   = var.cluster_endpoint
    client_certificate     = var.cluster_client_certificate
    client_key             = var.cluster_client_key
    cluster_ca_certificate = var.cluster_ca_certificate
  }
  git = {
    url = "https://github.com/${var.github_org}/${var.github_repository}.git"
    http = {
      username = "git"
      password = var.github_token
    }
  }
}

provider "github" {
  owner = var.github_org
  token = var.github_token
}
