data "aws_ssm_parameter" "al2023" {
  name = "/aws/service/ami-amazon-linux-latest/al2023-ami-kernel-default-x86_64"
}

data "aws_caller_identity" "current" {}

# No SSH: shell access and deploys both go through SSM, so only Caddy's ports
# are open.
resource "aws_security_group" "api" {
  name        = "data-room-api"
  description = "HTTP and HTTPS to Caddy"

  ingress {
    from_port        = 80
    to_port          = 80
    protocol         = "tcp"
    cidr_blocks      = ["0.0.0.0/0"]
    ipv6_cidr_blocks = ["::/0"]
  }

  ingress {
    from_port        = 443
    to_port          = 443
    protocol         = "tcp"
    cidr_blocks      = ["0.0.0.0/0"]
    ipv6_cidr_blocks = ["::/0"]
  }

  egress {
    from_port        = 0
    to_port          = 0
    protocol         = "-1"
    cidr_blocks      = ["0.0.0.0/0"]
    ipv6_cidr_blocks = ["::/0"]
  }
}

data "aws_iam_policy_document" "instance_trust" {
  statement {
    actions = ["sts:AssumeRole"]
    principals {
      type        = "Service"
      identifiers = ["ec2.amazonaws.com"]
    }
  }
}

resource "aws_iam_role" "instance" {
  name               = "data-room-api-instance"
  assume_role_policy = data.aws_iam_policy_document.instance_trust.json
}

resource "aws_iam_role_policy_attachment" "instance_ssm" {
  role       = aws_iam_role.instance.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonSSMManagedInstanceCore"
}

resource "aws_iam_role_policy_attachment" "instance_ecr" {
  role       = aws_iam_role.instance.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonEC2ContainerRegistryReadOnly"
}

# The deploy script reads the API's env on the instance, so secrets never pass
# through GitHub.
data "aws_iam_policy_document" "instance_env" {
  statement {
    actions   = ["ssm:GetParametersByPath"]
    resources = ["arn:aws:ssm:${var.region}:${data.aws_caller_identity.current.account_id}:parameter${var.ssm_prefix}"]
  }

  # SecureString parameters use the AWS-managed alias/aws/ssm key.
  statement {
    actions   = ["kms:Decrypt"]
    resources = ["*"]
    condition {
      test     = "StringEquals"
      variable = "kms:ViaService"
      values   = ["ssm.${var.region}.amazonaws.com"]
    }
  }
}

resource "aws_iam_role_policy" "instance_env" {
  role   = aws_iam_role.instance.id
  policy = data.aws_iam_policy_document.instance_env.json
}

resource "aws_iam_instance_profile" "api" {
  name = "data-room-api"
  role = aws_iam_role.instance.name
}

resource "aws_instance" "api" {
  ami                    = data.aws_ssm_parameter.al2023.value
  instance_type          = var.instance_type
  iam_instance_profile   = aws_iam_instance_profile.api.name
  vpc_security_group_ids = [aws_security_group.api.id]
  user_data              = file("${path.module}/bootstrap.sh")

  metadata_options {
    http_tokens = "required"
  }

  root_block_device {
    volume_type = "gp3"
    volume_size = 16
  }

  # A newer AMI or an edited bootstrap would otherwise replace the instance;
  # the running one takes security updates itself (see bootstrap.sh).
  lifecycle {
    ignore_changes = [ami, user_data]
  }

  tags = {
    Name = "data-room-api"
  }
}

# api.data.bonadev.xyz points here, so the address must outlive the instance.
resource "aws_eip" "api" {
  instance = aws_instance.api.id
  domain   = "vpc"
}

resource "aws_ecr_repository" "api" {
  name                 = "data-room-api"
  image_tag_mutability = "IMMUTABLE"
}

resource "aws_ecr_lifecycle_policy" "api" {
  repository = aws_ecr_repository.api.name
  policy = jsonencode({
    rules = [{
      rulePriority = 1
      description  = "Keep the last 10 images"
      selection = {
        tagStatus   = "any"
        countType   = "imageCountMoreThan"
        countNumber = 10
      }
      action = { type = "expire" }
    }]
  })
}
