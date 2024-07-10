terraform {
  required_providers {
    cloudflare = {
      source  = "cloudflare/cloudflare"
      version = "~> 4.36"
    }

    flux = {
      source  = "fluxcd/flux"
      version = ">= 1.2"
    }
  }
}
