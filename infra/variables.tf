variable "cloudflare_account_id" {
  description = "Cloudflare account ID."
}

variable "cloudflare_zone_id" {
  description = "Cloudflare zone ID."
}

variable "cloudflare_api_key" {
  description = "Cloudflare API key."
}

variable "domain" {
  description = "Domain."
  default     = "local.aprovan.work"
}

variable "email" {
  description = "Cloudflare email address."
  type        = string
  default     = "jacob.samps@gmail.com"
}

variable "github_client_id" {
  description = "GitHub client ID."
  type        = string
}

variable "github_client_secret" {
  description = "GitHub client secret."
  type        = string
}
