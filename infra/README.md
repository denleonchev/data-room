# infra

AWS resources for `apps/api`: one EC2 instance running the API container
behind Caddy at `api.data.bonadev.xyz`, its Elastic IP, an ECR repository, and
the IAM role the [deploy workflow](../.github/workflows/deploy-api.yml) assumes
over GitHub OIDC. Rationale lives in
[docs/architecture.md](../docs/architecture.md#hosting).

- `bootstrap.sh` — first-boot user data: Docker, nightly security updates, swap.
- `deploy.sh` — runs on the instance for every deploy, shipped by the workflow:
  env from Parameter Store, migrations, container swap, Caddy config.

## First-time setup

Needs the AWS CLI and credentials for the target account.

1. State bucket — once, since the backend can't create its own bucket:

   ```sh
   aws s3api create-bucket --bucket data-room-tfstate --region eu-west-1 \
     --create-bucket-configuration LocationConstraint=eu-west-1
   aws s3api put-bucket-versioning --bucket data-room-tfstate \
     --versioning-configuration Status=Enabled
   ```

2. Infrastructure:

   ```sh
   terraform init
   terraform apply
   ```

   Point `api.data.bonadev.xyz` (A record, DNS only) at `terraform output public_ip`.
   Caddy requests its certificate once the record resolves. The `data.bonadev.xyz`
   CAA records must allow `letsencrypt.org` — they're inherited by `api.data`.

3. Repository variables (GitHub → Settings → Secrets and variables → Actions →
   Variables): `AWS_DEPLOY_ROLE_ARN` = `terraform output deploy_role_arn`,
   `AWS_INSTANCE_ID` = `terraform output instance_id`.

4. API environment — one SecureString per variable under `/data-room/api`, named
   exactly like the keys in [`apps/api/.env.example`](../apps/api/.env.example),
   except `PORT`, which `deploy.sh` pins. Kept out of Terraform so secrets never
   land in state:

   ```sh
   put() { aws ssm put-parameter --overwrite --type SecureString --name "/data-room/api/$1" --value "$2"; }
   put CORS_ORIGIN https://data.bonadev.xyz
   put BETTER_AUTH_URL https://api.data.bonadev.xyz
   put COOKIE_DOMAIN .data.bonadev.xyz
   put DATABASE_URL '...'
   # DIRECT_URL, BETTER_AUTH_SECRET, GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET,
   # SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_STORAGE_BUCKET likewise
   ```

5. Run **Deploy API** from the Actions tab (`workflow_dispatch`), then check
   `https://api.data.bonadev.xyz/health`.

A changed parameter takes effect on the next deploy — rerun the workflow.

## Operating

- Shell: `aws ssm start-session --target <instance_id>` (needs the Session
  Manager plugin). No SSH key exists.
- Logs: `docker logs api` / `docker logs caddy` from that shell.
- Kernel updates install nightly but only apply on reboot:
  `aws ec2 reboot-instances --instance-ids <instance_id>`. Both containers come
  back on their own.
