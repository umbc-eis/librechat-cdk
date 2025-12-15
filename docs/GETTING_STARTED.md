# Getting Started with LibreChat on AWS

Complete guide for first-time deployment of LibreChat on AWS using CDK.

## Prerequisites

### Required Tools

- **Node.js** v14.x or later ([Download](https://nodejs.org/))
- **AWS CLI** configured with credentials ([Install Guide](https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html))
- **AWS CDK CLI** - Install globally:
  ```bash
  npm install -g aws-cdk
  ```
- **Docker Desktop** - Running before deployment ([Download](https://www.docker.com/products/docker-desktop))
- **Git** - For cloning the repository

### AWS Account Requirements

- AWS account with administrative privileges
- Registered domain name (from any registrar: GoDaddy, Namecheap, Route53, etc.)
- Access to domain DNS settings

### Verify Prerequisites

```bash
# Check Node.js
node --version  # Should be v14.x or later

# Check AWS CLI
aws --version
aws sts get-caller-identity  # Should show your AWS account

# Check CDK
cdk --version

# Check Docker
docker --version
docker ps  # Should not error
```

## Step 1: Clone and Install

```bash
# Clone repository
git clone <repository-url>
cd librechat-cdk

# Install dependencies
npm install

# Verify installation
npm run build
```

## Step 2: SSL Certificate Setup

**Required for HTTPS deployment.** See [SSL & DNS Setup Guide](SSL_DNS_SETUP.md) for detailed instructions.

### Quick Steps:

1. Go to AWS Certificate Manager (ACM) in your deployment region
2. Request a public certificate for your domain
3. Validate via DNS (add CNAME record) or email
4. Wait for "Issued" status (5-30 minutes)
5. Copy the Certificate ARN

**Important:** Certificate must be in the same region as your deployment.

## Step 3: Configure Deployment

### Create Local Config

```bash
# Copy template to local config (Git-ignored)
cp config/config.json config/config.local.json
```

### Edit config.local.json

```json
{
  "region": "us-west-2",
  "domain": {
    "name": "librechat.yourdomain.com",
    "certificateArn": "arn:aws:acm:us-west-2:123456789012:certificate/your-cert-id"
  }
}
```

**Minimum required changes:**
- `region` - Your AWS region
- `domain.name` - Your domain name
- `domain.certificateArn` - Your ACM certificate ARN

See [Configuration Guide](CONFIGURATION.md) for all options.

### Optional: Configure Environment Files

```bash
# Copy LibreChat config files
cp config/Libre_config/librechat.env config/Libre_config/librechat.local.env

# Edit librechat.local.env with your API keys and settings
```

## Step 4: Bootstrap CDK

**First time only** - Creates CDK resources in your AWS account:

```bash
cdk bootstrap aws://ACCOUNT-NUMBER/REGION
```

Example:
```bash
cdk bootstrap aws://123456789012/us-west-2
```

## Step 5: Review Changes

Preview what will be created:

```bash
cdk diff
```

Review the output to ensure:
- ✅ Correct region
- ✅ Correct domain and certificate
- ✅ Expected resources (VPC, databases, ECS, etc.)

## Step 6: Deploy

```bash
cdk deploy --all
```

**Deployment time:** 15-25 minutes

The deployment creates two stacks:
1. **LibreSecretTokensStack** - Secrets and tokens
2. **LibreChatCdkStack** - Main infrastructure

### Monitor Deployment

Watch for:
- Stack creation progress
- Any error messages
- CDK outputs at the end

### Save CDK Outputs

After deployment, save these values:

```
Outputs:
LibreChatCdkStack.LoadBalancerDNS = LibreChat-ALB-xxxxx.us-west-2.elb.amazonaws.com
LibreChatCdkStack.LibreChatServiceUrl = https://librechat.yourdomain.com
LibreChatCdkStack.DocumentDBEndpoint = librechat-docdb.cluster-xxxxx.us-west-2.docdb.amazonaws.com
LibreChatCdkStack.EFSFileSystemId = fs-xxxxx
```

## Step 7: Post-Deployment

### Create DNS Record

Point your domain to the Application Load Balancer.

#### Option A: AWS Console

1. Go to **Route53** → **Hosted zones**
2. Select your domain
3. Click **Create record**
4. Configure:
   - **Record name:** `librechat` (or subdomain)
   - **Record type:** A
   - **Alias:** ON
   - **Route traffic to:** Application Load Balancer
   - **Region:** Your deployment region
   - **Load balancer:** Select from dropdown (matches LoadBalancerDNS)
5. Click **Create records**

#### Option B: AWS CLI

```bash
# Set your values
HOSTED_ZONE_ID="Z1234567890ABC"
DOMAIN_NAME="librechat.yourdomain.com"
ALB_DNS_NAME="LibreChat-ALB-xxxxx.us-west-2.elb.amazonaws.com"
ALB_ZONE_ID="Z1H1FL5HABSF5"  # us-west-2 ALB zone

# Create DNS record
aws route53 change-resource-record-sets \
  --hosted-zone-id ${HOSTED_ZONE_ID} \
  --change-batch '{
    "Changes": [{
      "Action": "CREATE",
      "ResourceRecordSet": {
        "Name": "'${DOMAIN_NAME}'",
        "Type": "A",
        "AliasTarget": {
          "HostedZoneId": "'${ALB_ZONE_ID}'",
          "DNSName": "'${ALB_DNS_NAME}'",
          "EvaluateTargetHealth": true
        }
      }
    }]
  }'
```

**ALB Hosted Zone IDs by Region:**
- us-east-1: Z35SXDOTRQ7X7K
- us-west-2: Z1H1FL5HABSF5
- eu-west-1: Z32O12XQLNTSW2
- [Full list](https://docs.aws.amazon.com/general/latest/gr/elb.html)

### Verify DNS

Wait 2-5 minutes, then test:

```bash
# Check DNS resolution
dig librechat.yourdomain.com

# Test HTTPS
curl -I https://librechat.yourdomain.com
```

### Access Application

Open browser to: `https://librechat.yourdomain.com`

You should see the LibreChat interface with no certificate warnings.

## Step 8: Verify Deployment

### Check ECS Services

```bash
aws ecs list-services --cluster LibreChatCluster --region us-west-2
```

All services should be in RUNNING state:
- LibreChat service
- Meilisearch service
- RAG API service

### Check Database Initialization

```bash
# View init logs
aws logs tail /aws/lambda/init-postgres --follow --region us-west-2
```

Should show successful database setup and extension installation.

### Check Application Logs

```bash
# LibreChat logs
aws logs tail /aws/ecs/librechat-service --follow --region us-west-2
```

## Success Checklist

- ✅ CDK deployment completed without errors
- ✅ DNS resolves to ALB IP address
- ✅ HTTPS connection works (no certificate errors)
- ✅ Application loads in browser
- ✅ All ECS services are RUNNING
- ✅ No errors in CloudWatch logs

## Next Steps

- Configure authentication in `librechat.env`
- Set up API keys for AI providers
- Configure file upload limits
- Set up monitoring and alerts
- Review security settings

See [Configuration Guide](CONFIGURATION.md) for customization options.

## Common Issues

### Deployment Fails

**Docker not running:**
```bash
# Start Docker Desktop, then retry
cdk deploy --all
```

**AWS credentials expired:**
```bash
# Re-authenticate and retry
aws sts get-caller-identity
cdk deploy --all
```

**Certificate not found:**
- Verify certificate ARN is correct
- Ensure certificate is in "Issued" status
- Check certificate is in same region as deployment

### DNS Not Resolving

**Route53 record not created:**
- Verify A record exists in hosted zone
- Check record points to correct ALB
- Wait 2-5 minutes for propagation

**Nameservers not updated:**
- If using Route53, verify nameservers at registrar
- DNS propagation can take 24-48 hours

### Application Not Loading

**ECS services not healthy:**
```bash
# Check service status
aws ecs describe-services \
  --cluster LibreChatCluster \
  --services LibreChatService \
  --region us-west-2
```

**Check target health:**
- Go to EC2 → Load Balancers → Target Groups
- Verify targets are "healthy"

See [Troubleshooting Guide](TROUBLESHOOTING.md) for more solutions.

## Clean Up

To remove all resources:

```bash
cdk destroy --all
```

**Warning:** This permanently deletes:
- All databases and data
- EFS file systems
- Secrets and configurations

Backup any important data before destroying.

## Additional Resources

- [SSL & DNS Setup](SSL_DNS_SETUP.md) - Detailed certificate and domain setup
- [Configuration Reference](CONFIGURATION.md) - All configuration options
- [Troubleshooting](TROUBLESHOOTING.md) - Common issues and solutions
- [LibreChat Documentation](https://docs.librechat.ai)
- [AWS CDK Documentation](https://docs.aws.amazon.com/cdk/)
