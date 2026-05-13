#!/usr/bin/env bash
# provision-aws.sh — Provision EC2 + RDS for Lavadero Platform
# Run once from your local machine after `aws configure`.
#
# Usage:
#   chmod +x scripts/provision-aws.sh
#   ./scripts/provision-aws.sh
#
# What it creates:
#   - Security group for RDS  (port 5432 from EC2 SG only)
#   - Security group for EC2  (port 80/443 open, port 22 from your IP only)
#   - RDS subnet group using default VPC subnets
#   - RDS PostgreSQL 16 instance (db.t3.micro, single-AZ, 20 GB)
#   - EC2 Amazon Linux 2023 instance (t3.micro) with Docker pre-installed
#
# Outputs:  EC2 public IP + RDS endpoint — save these.
# Cost est: ~$22-25/mo (free tier: t2.micro + db.t2.micro free for 12 months)

set -euo pipefail

# ── CONFIG — change these if needed ────────────────────────────────────────
REGION="us-east-1"
AZ="us-east-1a"
DB_NAME="lavadero"
DB_USER="lavadero"
DB_PASS="${DB_PASS:-CHANGE_ME_$(openssl rand -hex 8)}"  # override via env var
KEY_PAIR_NAME="lavadero-key"          # will be created if it doesn't exist
EC2_INSTANCE_TYPE="t2.micro"          # free tier eligible (750 hrs/mo for 12 months)
RDS_INSTANCE_CLASS="db.t2.micro"      # free tier eligible (750 hrs/mo for 12 months)
PROJECT_TAG="lavadero-platform"
# ───────────────────────────────────────────────────────────────────────────

echo "==> Region: $REGION"
echo "==> DB password: $DB_PASS  (save this — you'll need it for .env)"
echo ""

# Get default VPC
VPC_ID=$(aws ec2 describe-vpcs \
  --region "$REGION" \
  --filters "Name=is-default,Values=true" \
  --query "Vpcs[0].VpcId" --output text)
echo "==> Default VPC: $VPC_ID"

# Get all subnets in default VPC
SUBNET_IDS=$(aws ec2 describe-subnets \
  --region "$REGION" \
  --filters "Name=vpc-id,Values=$VPC_ID" \
  --query "Subnets[*].SubnetId" --output text | tr '\t' ' ')
echo "==> Subnets: $SUBNET_IDS"

# ── Security group: EC2 ────────────────────────────────────────────────────
MY_IP=$(curl -s https://checkip.amazonaws.com)/32
echo "==> Your IP: $MY_IP (SSH will be restricted to this)"

EC2_SG=$(aws ec2 create-security-group \
  --region "$REGION" \
  --group-name "lavadero-ec2-sg" \
  --description "Lavadero EC2: HTTP open, SSH from my IP" \
  --vpc-id "$VPC_ID" \
  --query "GroupId" --output text)
echo "==> EC2 SG: $EC2_SG"

aws ec2 authorize-security-group-ingress --region "$REGION" --group-id "$EC2_SG" \
  --ip-permissions \
  "IpProtocol=tcp,FromPort=80,ToPort=80,IpRanges=[{CidrIp=0.0.0.0/0}]" \
  "IpProtocol=tcp,FromPort=443,ToPort=443,IpRanges=[{CidrIp=0.0.0.0/0}]" \
  "IpProtocol=tcp,FromPort=22,ToPort=22,IpRanges=[{CidrIp=$MY_IP,Description=my-ip}]"
echo "==> EC2 SG rules added (80, 443 open; 22 from $MY_IP)"

aws ec2 create-tags --region "$REGION" --resources "$EC2_SG" \
  --tags "Key=Project,Value=$PROJECT_TAG"

# ── Security group: RDS ────────────────────────────────────────────────────
RDS_SG=$(aws ec2 create-security-group \
  --region "$REGION" \
  --group-name "lavadero-rds-sg" \
  --description "Lavadero RDS: Postgres from EC2 only" \
  --vpc-id "$VPC_ID" \
  --query "GroupId" --output text)
echo "==> RDS SG: $RDS_SG"

aws ec2 authorize-security-group-ingress --region "$REGION" --group-id "$RDS_SG" \
  --protocol tcp --port 5432 --source-group "$EC2_SG"
echo "==> RDS SG rule added (5432 from EC2 SG only)"

aws ec2 create-tags --region "$REGION" --resources "$RDS_SG" \
  --tags "Key=Project,Value=$PROJECT_TAG"

# ── RDS subnet group ───────────────────────────────────────────────────────
aws rds create-db-subnet-group \
  --region "$REGION" \
  --db-subnet-group-name "lavadero-subnet-group" \
  --db-subnet-group-description "Lavadero RDS subnet group" \
  --subnet-ids $SUBNET_IDS \
  --tags "Key=Project,Value=$PROJECT_TAG" > /dev/null
echo "==> RDS subnet group created"

# ── RDS instance ──────────────────────────────────────────────────────────
echo "==> Creating RDS instance (takes ~5 min)..."
aws rds create-db-instance \
  --region "$REGION" \
  --db-instance-identifier "lavadero-db" \
  --db-instance-class "$RDS_INSTANCE_CLASS" \
  --engine postgres \
  --engine-version "16" \
  --master-username "$DB_USER" \
  --master-user-password "$DB_PASS" \
  --db-name "$DB_NAME" \
  --allocated-storage 20 \
  --storage-type gp2 \
  --no-multi-az \
  --no-publicly-accessible \
  --vpc-security-group-ids "$RDS_SG" \
  --db-subnet-group-name "lavadero-subnet-group" \
  --backup-retention-period 14 \
  --deletion-protection \
  --no-auto-minor-version-upgrade \
  --tags "Key=Project,Value=$PROJECT_TAG" > /dev/null
echo "==> RDS instance requested (creating in background)"

# ── EC2 key pair ──────────────────────────────────────────────────────────
if ! aws ec2 describe-key-pairs --region "$REGION" --key-names "$KEY_PAIR_NAME" &>/dev/null; then
  aws ec2 create-key-pair \
    --region "$REGION" \
    --key-name "$KEY_PAIR_NAME" \
    --query "KeyMaterial" --output text > "${KEY_PAIR_NAME}.pem"
  chmod 400 "${KEY_PAIR_NAME}.pem"
  echo "==> Key pair saved to ${KEY_PAIR_NAME}.pem — keep this safe, you can't download it again"
else
  echo "==> Key pair '$KEY_PAIR_NAME' already exists"
fi

# ── EC2 AMI (latest Amazon Linux 2023) ───────────────────────────────────
AMI_ID=$(aws ec2 describe-images \
  --region "$REGION" \
  --owners amazon \
  --filters \
    "Name=name,Values=al2023-ami-*-x86_64" \
    "Name=state,Values=available" \
  --query "sort_by(Images,&CreationDate)[-1].ImageId" --output text)
echo "==> AMI: $AMI_ID"

# ── EC2 instance ──────────────────────────────────────────────────────────
SUBNET_ID=$(echo $SUBNET_IDS | awk '{print $1}')
INSTANCE_ID=$(aws ec2 run-instances \
  --region "$REGION" \
  --image-id "$AMI_ID" \
  --instance-type "$EC2_INSTANCE_TYPE" \
  --key-name "$KEY_PAIR_NAME" \
  --security-group-ids "$EC2_SG" \
  --subnet-id "$SUBNET_ID" \
  --associate-public-ip-address \
  --user-data file://scripts/setup-ec2.sh \
  --block-device-mappings "DeviceName=/dev/xvda,Ebs={VolumeSize=20,VolumeType=gp3,DeleteOnTermination=true}" \
  --tag-specifications \
    "ResourceType=instance,Tags=[{Key=Name,Value=lavadero-app},{Key=Project,Value=$PROJECT_TAG}]" \
  --query "Instances[0].InstanceId" --output text)
echo "==> EC2 instance: $INSTANCE_ID"

echo ""
echo "==> Waiting for EC2 to get a public IP..."
aws ec2 wait instance-running --region "$REGION" --instance-ids "$INSTANCE_ID"
EC2_IP=$(aws ec2 describe-instances \
  --region "$REGION" \
  --instance-ids "$INSTANCE_ID" \
  --query "Reservations[0].Instances[0].PublicIpAddress" --output text)

echo ""
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║  DONE — save these values                                    ║"
echo "╠══════════════════════════════════════════════════════════════╣"
echo "║  EC2 public IP  : $EC2_IP"
echo "║  RDS password   : $DB_PASS"
echo "║  Key pair file  : ${KEY_PAIR_NAME}.pem"
echo "╠══════════════════════════════════════════════════════════════╣"
echo "║  Next steps:                                                 ║"
echo "║  1. Wait ~5 min for RDS to finish (aws rds describe-db-instances)"
echo "║  2. Get RDS endpoint: aws rds describe-db-instances \\"
echo "║       --query 'DBInstances[0].Endpoint.Address' --output text"
echo "║  3. SSH: ssh -i ${KEY_PAIR_NAME}.pem ec2-user@$EC2_IP"
echo "║  4. Run scripts/setup-secrets.sh on the EC2 host             ║"
echo "║  5. Add GitHub Actions secrets (see README for names)        ║"
echo "╚══════════════════════════════════════════════════════════════╝"
