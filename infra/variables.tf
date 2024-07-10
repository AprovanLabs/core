variable "cloudflare_account_id" {
  description = "Cloudflare account ID"
}

variable "cloudflare_zone_id" {
  description = "Cloudflare zone ID"
}

variable "cloudflare_api_key" {
  description = "Cloudflare API key"
}

variable "domain" {
  description = "Domain"
  default     = "internal.aprovan.app"
}

variable "email" {
  description = "Cloudflare email address"
  type        = string
  default     = "jacob.samps@gmail.com"
}

variable "github_client_id" {
  description = "GitHub client ID"
  type        = string
}

variable "github_client_secret" {
  description = "GitHub client secret"
  type        = string
}

variable "github_org" {
  description = "GitHub organization name"
  type        = string
  default     = "AprovanLabs"
}

variable "github_repository" {
  description = "GitHub infra repository"
  type        = string
  default     = "core"
}

variable "github_token" {
  description = "GitHub platform token"
  type        = string
  default     = "AprovanBot"
}

variable "cluster_endpoint" {
  description = "K8s cluster endpoint"
  type        = string
}

variable "cluster_client_certificate" {
  description = "K8s cluster client certificate"
  type        = string
}

variable "cluster_client_key" {
  description = "K8s cluster client key"
  type        = string
}

variable "cluster_ca_certificate" {
  description = "K8s cluster CA certificate"
  type        = string
}

