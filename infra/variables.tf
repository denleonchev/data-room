variable "region" {
  type    = string
  default = "eu-west-1"
}

variable "instance_type" {
  description = "1 GB is enough at runtime: images are built in CI, not here"
  type        = string
  default     = "t3.micro"
}

variable "github_repo" {
  description = "owner/name allowed to deploy through the OIDC role"
  type        = string
  default     = "denleonchev/data-room"
}

variable "ssm_prefix" {
  description = "Parameter Store path holding the API's environment"
  type        = string
  default     = "/data-room/api"
}
