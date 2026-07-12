resource "random_password" "tunnel_secret" {
  length = 64
}

resource "cloudflare_tunnel" "tunnel" {
  account_id = var.cloudflare_account_id
  name       = "internal"
  secret     = base64sha256(random_password.tunnel_secret.result)
}

resource "cloudflare_tunnel_config" "example_config" {
  account_id = var.cloudflare_account_id
  tunnel_id  = cloudflare_tunnel.tunnel.id

  config {
    warp_routing {
      enabled = true
    }

    origin_request {
      connect_timeout          = "1m0s"
      tls_timeout              = "1m0s"
      tcp_keep_alive           = "1m0s"
      no_happy_eyeballs        = false
      keep_alive_connections   = 1024
      keep_alive_timeout       = "1m0s"
      http_host_header         = "baz"
      origin_server_name       = "foobar"
      ca_pool                  = "/path/to/unsigned/ca/pool"
      no_tls_verify            = false
      disable_chunked_encoding = false
      bastion_mode             = false
      proxy_address            = "10.0.0.1"
      proxy_port               = "8123"
      proxy_type               = "socks"

      ip_rules {
        prefix = "/web"
        ports  = [80, 443]
        allow  = false
      }
    }
    ingress_rule {
      hostname = var.domain
      path     = "/"
      service  = "http://10.0.0.2:8080"
    }
    ingress_rule {
      service = "https://10.0.0.3:8081"
    }
  }
}
