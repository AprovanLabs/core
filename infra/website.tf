
resource "cloudflare_access_application" "internal_app" {
  zone_id                   = var.cloudflare_zone_id
  name                      = var.domain
  domain                    = var.domain
  type                      = "self_hosted"
  session_duration          = "24h"
  logo_url                  = "https://github.com/AprovanLabs.png"
  auto_redirect_to_identity = true
  allowed_idps = [
    cloudflare_access_identity_provider.github_oauth.id
  ]
}

resource "cloudflare_access_identity_provider" "github_oauth" {
  account_id = var.cloudflare_account_id
  name       = "GitHub OAuth"
  type       = "github"
  config {
    client_id     = var.github_client_id
    client_secret = var.github_client_secret
  }
}

resource "cloudflare_access_policy" "github_aprovan_labs_org_members" {
  name           = "AprovanLabs Access Policy"
  zone_id        = var.cloudflare_zone_id
  application_id = cloudflare_access_application.internal_app.id
  precedence     = "1"
  decision       = "allow"

  include {
    github {
      identity_provider_id = cloudflare_access_identity_provider.github_oauth.id
      name                 = "AprovanLabs"
    }
  }

  require {
    github {
      identity_provider_id = cloudflare_access_identity_provider.github_oauth.id
      name                 = "AprovanLabs"
    }
  }
}
