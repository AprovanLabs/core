provider "cloudflare" {
  api_key = var.cloudflare_api_key
  email   = var.email
}

provider "flux" {
  kubernetes = {
    cluster                = var.cluster
    host                   = var.cluster_endpoint
    client_certificate     = base64decode(var.cluster_client_certificate)
    client_key             = base64decode(var.cluster_client_key)
    cluster_ca_certificate = base64decode(var.cluster_ca_certificate)
  }
  git = {
    url = "https://${var.github_username}${var.github_token}:@github.com/${var.github_org}/${var.github_repository}.git"
    http = {
      username = var.github_username
      password = var.github_token
    }
  }
}
