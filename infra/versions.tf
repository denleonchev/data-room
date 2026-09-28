terraform {
  required_version = ">= 1.10"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 6.0"
    }
  }

  # The bucket is created once by hand (see README) — it can't manage itself.
  backend "s3" {
    bucket       = "data-room-tfstate"
    key          = "infra.tfstate"
    region       = "eu-west-1"
    use_lockfile = true
  }
}

# Same region as the Supabase project: every authenticated request reaches
# Postgres, so a mismatch shows up directly as API latency.
provider "aws" {
  region = var.region
}
