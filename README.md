# LibreChat on AWS CDK

Deploy LibreChat on AWS using ECS Fargate with automated infrastructure provisioning.

![LibreChat on AWS ECS Architecture](images/Librechat_AWS-architecture.png)

## Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Configure your deployment
cp config/config.json config/config.local.json
# Edit config.local.json with your settings

# 3. Bootstrap CDK (first time only)
cdk bootstrap

# 4. Deploy
cdk deploy --all
```

**First time deploying?** Follow the guides in order:
1. [Getting Started Guide](docs/GETTING_STARTED.md) - Prerequisites and initial setup
2. [SSL & DNS Setup](docs/SSL_DNS_SETUP.md) - Configure domain and certificate
3. [Configuration Guide](docs/CONFIGURATION.md) - Customize your deployment
4. [Troubleshooting](docs/TROUBLESHOOTING.md) - Common issues and solutions

## What Gets Deployed

### Compute
- **ECS Fargate** - Serverless containers for LibreChat, Meilisearch, and RAG API
- **Application Load Balancer** - HTTPS traffic distribution with SSL termination

### Databases
- **Aurora PostgreSQL Serverless v2** - Vector storage with pgvector (0.5-16 ACU)
- **DocumentDB** - MongoDB-compatible database for LibreChat data

### Storage & Networking
- **EFS** - Shared file system for persistent data
- **VPC** - Isolated network with public/private subnets across 2 AZs
- **S3** - Configuration file storage

### Security
- **Secrets Manager** - Encrypted credential storage
- **Security Groups** - Network access control
- **IAM Roles** - Least privilege access

## Architecture Highlights

- **Multi-AZ Deployment** - High availability across availability zones
- **Auto-scaling** - Aurora and ECS scale based on demand
- **Private Databases** - No public internet access
- **Encrypted Secrets** - All credentials in Secrets Manager
- **Container Insights** - Enhanced monitoring and logging

## Configuration

### Local Development Config

Use `config.local.json` for your personal settings (Git-ignored):

```json
{
  "domain": {
    "name": "librechat.yourdomain.com",
    "certificateArn": "arn:aws:acm:us-west-2:123456789012:certificate/..."
  }
}
```

This overrides `config.json` template values automatically.

### Key Configuration Options

| Setting | Description | Default |
|---------|-------------|---------|
| `region` | AWS deployment region | `us-west-2` |
| `vpc.useExisting` | Use existing VPC | `false` |
| `aurora.minCapacity` | Min Aurora ACUs | `0.5` |
| `aurora.maxCapacity` | Max Aurora ACUs | `16` |
| `documentDb.instanceType` | DocumentDB instance | `t4g.medium` |
| `domain.name` | Your domain name | Required for HTTPS |
| `domain.certificateArn` | ACM certificate ARN | Required for HTTPS |

See [Configuration Guide](docs/CONFIGURATION.md) for all options.

## Post-Deployment

After `cdk deploy` completes, you'll need to:

1. **Create DNS Record** - Point your domain to the ALB (see CDK outputs)
2. **Verify HTTPS** - Test `https://your-domain.com`
3. **Check Services** - Ensure all ECS services are healthy

Detailed steps in [Getting Started Guide](docs/GETTING_STARTED.md#post-deployment).

## Cost Estimate

Approximate monthly costs (us-west-2):

| Service | Cost |
|---------|------|
| Aurora Serverless v2 | $50-200 (usage-based) |
| DocumentDB t4g.medium | $53 |
| ECS Fargate | $30-100 |
| Application Load Balancer | $16 |
| NAT Gateway | $32 |
| EFS Storage | $10-30 |
| **Total** | **~$200-450/month** |

Costs vary based on usage. Use [AWS Pricing Calculator](https://calculator.aws/) for detailed estimates.

## Development Tips

### Faster Deployments

For dev/test environments, use smaller resources in `config.local.json`:

```json
{
  "aurora": {
    "minCapacity": 0.5,
    "maxCapacity": 2,
    "multiAz": false,
    "database": {
      "backupRetentionDays": 1,
      "monitoring": {
        "enableEnhancedMonitoring": false
      }
    }
  }
}
```

### Hotswap Deployments

For Lambda/ECS changes only (skips CloudFormation):
```bash
cdk deploy --hotswap
```

### Local Config Pattern

Keep your real credentials in Git-ignored files:
- `config/config.local.json` - Overrides config.json
- `config/Libre_config/*.local.*` - Local env files

## Cleanup

Remove all resources:
```bash
cdk destroy --all
```

**Warning:** This deletes databases. Backup data first if needed.

## Documentation

- [Getting Started](docs/GETTING_STARTED.md) - First-time setup guide
- [SSL & DNS Setup](docs/SSL_DNS_SETUP.md) - Domain and certificate configuration
- [Configuration Reference](docs/CONFIGURATION.md) - All config options explained
- [Troubleshooting](docs/TROUBLESHOOTING.md) - Common issues and solutions

## Support

- [LibreChat Docs](https://docs.librechat.ai)
- [AWS CDK Docs](https://docs.aws.amazon.com/cdk/)
- [GitHub Issues](https://github.com/your-repo/issues)

## License

See [LICENSE](LICENSE) file for details.
