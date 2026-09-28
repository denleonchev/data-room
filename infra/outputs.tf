output "public_ip" {
  description = "A record target for api.data.bonadev.xyz"
  value       = aws_eip.api.public_ip
}

output "instance_id" {
  description = "Goes into the AWS_INSTANCE_ID repository variable"
  value       = aws_instance.api.id
}

output "deploy_role_arn" {
  description = "Goes into the AWS_DEPLOY_ROLE_ARN repository variable"
  value       = aws_iam_role.deploy.arn
}
