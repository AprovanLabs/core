resource "cloudflare_record" "aprovan_root" {
  zone_id = var.aprovan_zone_id
  name    = "@"
  type    = "CNAME"
  value   = var.cloudfront_distribution_domain
  proxied = false
}
