# Configuration Reference

Complete reference for all LibreChat CDK configuration options.

## Configuration Files

### config.json (Template)
Template with placeholder values. Committed to Git.

### config.local.json (Your Settings)
Your actual values. Git-ignored. Overrides config.json.

**Recommended workflow:**
```bash
cp config.json config.local.json
# Edit config.local.json with your real values
```

## Configuration Structure

```json
{
  "region": "us-west-2",
  "vpc": { ... },
  "container": { ... },
  "documentDb": { ... },
  "aurora": { ... },
  "domain": { ... }
}
```

## Region Configuration

```json
{
  "region": "us-west-2"
}
```

**Options:**
- Any valid AWS region
- Must match ACM certificate region
- Common: `us-east-1`, `us-west-2`, `eu-west-1`

## VPC Configuration

### Create New VPC

```json
{
  "vpc": {
    "useExisting": false,
    "existingVpcId": "",
    "newVpc": {
      "maxAzs": 2,
      "natGateways": 1,
      "cidr": "10.0.0.0/16"
    }
  }
}
```

**Parameters:**
- `maxAzs` - Number of Availability Zones (2-3 recommended)
- `natGateways` - NAT Gateways for private subnet internet access
  - 1 = Cost-optimized (single point of failure)
  - 2+ = High availability (one per AZ)
- `cidr` - VPC IP range (default: 10.0.0.0/16 = 65,536 IPs)

### Use Existing VPC

```json
{
  "vpc": {
    "useExisting": true,
    "existingVpcId": "vpc-0123456789abcdef0",
    "newVpc": {}
  }
}
```

**Requirements for existing VPC:**
- Must have public and private subnets
- Private subnets need NAT Gateway or NAT Instance
- Must have internet gateway attached

## Container Configuration

```json
{
  "container": {
    "libreChatImage": {
      "repository": "ghcr.io/danny-avila/librechat",
      "tag": "latest"
    },
    "meiliSearchImage": {
      "repository": "getmeili/meilisearch",
      "tag": "v1.12.3"
    },
    "ragAPIImage": {
      "repository": "ghcr.io/danny-avila/librechat-rag-api-dev",
      "tag": "latest"
    }
  }
}
```

**Image Tags:**
- `latest` - Most recent version (auto-updates)
- `v1.2.3` - Specific version (stable, predictable)
- `sha256:abc123...` - Exact image hash (immutable)

**Recommendation:** Use specific versions in production.

## DocumentDB Configuration

```json
{
  "documentDb": {
    "instanceType": "t4g.medium",
    "instances": 1,
    "engineVersion": "5.0.0"
  }
}
```

### Engine Version

**engineVersion:**
- `"3.6.0"` - Old, deprecated
- `"4.0.0"` - Stable but older
- `"5.0.0"` - **Latest, recommended** ✅

**Recommendation:** Use 5.0.0 for better performance and latest MongoDB 5.0 features.

### Instance Types

**Graviton (ARM) - Best Price-Performance:**
- `t4g.medium` - 2 vCPU, 4 GiB RAM (~$53/month)
- `r6g.large` - 2 vCPU, 16 GiB RAM (~$180/month)
- `r6g.xlarge` - 4 vCPU, 32 GiB RAM (~$360/month)
- `r7g.large` - 2 vCPU, 16 GiB RAM (latest gen)

**x86 (Intel/AMD):**
- `t3.medium` - 2 vCPU, 4 GiB RAM (~$66/month)
- `r6i.large` - 2 vCPU, 16 GiB RAM (~$220/month)
- `r6i.xlarge` - 4 vCPU, 32 GiB RAM (~$440/month)

**Instances:**
- `1` - Single instance (dev/test)
- `2+` - Multi-instance cluster (production)

## Aurora PostgreSQL Configuration

```json
{
  "aurora": {
    "engine": "aurora-postgresql",
    "engineVersion": "16.6",
    "instanceClass": "serverless-v2",
    "minCapacity": 0.5,
    "maxCapacity": 16,
    "multiAz": true,
    "database": {
      "name": "aurora_db",
      "port": 5432,
      "backupRetentionDays": 7,
      "backupWindow": "03:00-04:00",
      "maintenanceWindow": "Mon:04:00-Mon:05:00",
      "deletionProtection": false,
      "monitoring": {
        "enableEnhancedMonitoring": true,
        "monitoringInterval": 60,
        "logsExports": ["postgresql"],
        "logsRetentionDays": 30
      },
      "tags": {
        "Environment": "production",
        "Application": "librechat"
      }
    }
  }
}
```

### Engine Configuration

**engineVersion:**
- `16.6` - Latest (recommended)
- `15.5` - Previous version
- `14.x` - Older versions

**instanceClass:**
- `serverless-v2` - Auto-scaling (recommended)
- `provisioned` - Fixed capacity instances

### Capacity Configuration

**Serverless v2 ACUs (Aurora Capacity Units):**
- `minCapacity: 0.5` - Minimum (0.5 ACU = 1 GB RAM)
- `maxCapacity: 16` - Maximum (16 ACU = 32 GB RAM)
- 1 ACU = 2 GB RAM, ~$0.12/hour

**Recommendations:**
- **Dev/Test:** min=0.5, max=2
- **Production:** min=0.5, max=16
- **High Traffic:** min=2, max=32

### High Availability

**multiAz:**
- `true` - Standby replica in different AZ (recommended for production)
- `false` - Single AZ (dev/test only)

### Backup Configuration

**backupRetentionDays:**
- `1` - Minimum (dev/test)
- `7` - Recommended (production)
- `35` - Maximum

**backupWindow:**
- Format: `HH:MM-HH:MM` (UTC)
- Must be at least 30 minutes
- Avoid peak usage times

**maintenanceWindow:**
- Format: `ddd:HH:MM-ddd:HH:MM` (UTC)
- Example: `Mon:04:00-Mon:05:00`
- Schedule during low-traffic periods

### Deletion Protection

**deletionProtection:**
- `true` - Prevents accidental deletion (production)
- `false` - Allows deletion (dev/test)

### Monitoring Configuration

**enableEnhancedMonitoring:**
- `true` - Detailed OS metrics (recommended)
- `false` - Basic CloudWatch metrics only

**monitoringInterval:**
- `60` - Every minute (recommended)
- `30`, `15`, `10`, `5`, `1` - More frequent (higher cost)

**logsExports:**
- `["postgresql"]` - Export PostgreSQL logs to CloudWatch
- Useful for debugging and auditing

**logsRetentionDays:**
- `7`, `14`, `30`, `60`, `90`, `180`, `365`, `never`
- Balance between cost and compliance needs

## Domain Configuration

```json
{
  "domain": {
    "name": "librechat.example.com",
    "certificateArn": "arn:aws:acm:us-west-2:123456789012:certificate/abc123..."
  }
}
```

**name:**
- Your fully qualified domain name
- Must match ACM certificate domain
- Examples: `librechat.example.com`, `chat.company.com`

**certificateArn:**
- ACM certificate ARN
- Must be in same region as deployment
- Must be in "Issued" status

## Environment-Specific Configurations

### Development/Test

```json
{
  "vpc": {
    "newVpc": {
      "maxAzs": 2,
      "natGateways": 1
    }
  },
  "documentDb": {
    "instanceType": "t4g.medium",
    "instances": 1
  },
  "aurora": {
    "minCapacity": 0.5,
    "maxCapacity": 2,
    "multiAz": false,
    "database": {
      "backupRetentionDays": 1,
      "deletionProtection": false,
      "monitoring": {
        "enableEnhancedMonitoring": false
      }
    }
  }
}
```

**Benefits:**
- Lower cost (~$150-250/month)
- Faster deployments
- Faster deletions

### Production

```json
{
  "vpc": {
    "newVpc": {
      "maxAzs": 3,
      "natGateways": 3
    }
  },
  "documentDb": {
    "instanceType": "r6g.large",
    "instances": 3
  },
  "aurora": {
    "minCapacity": 2,
    "maxCapacity": 16,
    "multiAz": true,
    "database": {
      "backupRetentionDays": 7,
      "deletionProtection": true,
      "monitoring": {
        "enableEnhancedMonitoring": true,
        "monitoringInterval": 60
      }
    }
  }
}
```

**Benefits:**
- High availability
- Better performance
- Disaster recovery ready

## LibreChat Environment Configuration

### config/Libre_config/librechat.env

Key settings:

```bash
# Endpoints
ENDPOINTS=openAI,assistants,anthropic,bedrock,google

# AWS Bedrock
BEDROCK_AWS_DEFAULT_REGION=us-west-2
BEDROCK_AWS_MODELS=us.anthropic.claude-3-5-sonnet-20241022-v2:0

# Note: IAM permissions allow cross-region Bedrock access
# You can use models from any region (us-east-1, us-west-2, etc.)
# Cross-region inference profiles are also supported

# RAG Configuration
EMBEDDINGS_PROVIDER=bedrock
EMBEDDINGS_MODEL=amazon.titan-embed-g1-text-02
AWS_REGION=us-west-2

# Authentication
ALLOW_EMAIL_LOGIN=true
ALLOW_REGISTRATION=false
ALLOW_SOCIAL_LOGIN=true

# OpenID (Cognito)
OPENID_CLIENT_ID=your-client-id
OPENID_CLIENT_SECRET=your-secret
OPENID_ISSUER=https://cognito-idp.region.amazonaws.com/pool-id/.well-known/openid-configuration
```

See [LibreChat documentation](https://docs.librechat.ai/install/configuration/dotenv) for all options.

## Configuration Validation

### Before Deployment

```bash
# Validate JSON syntax
cat config/config.json | python3 -m json.tool

# Check certificate
aws acm describe-certificate \
  --certificate-arn "arn:aws:acm:..." \
  --region us-west-2

# Verify region match
grep region config/config.json
```

### Common Mistakes

❌ **Certificate in wrong region**
```json
{
  "region": "us-west-2",
  "domain": {
    "certificateArn": "arn:aws:acm:us-east-1:..."  // Wrong!
  }
}
```

❌ **Domain mismatch**
```json
{
  "domain": {
    "name": "librechat.example.com",
    "certificateArn": "arn:...certificate-for-different-domain"  // Wrong!
  }
}
```

❌ **Invalid CIDR**
```json
{
  "vpc": {
    "newVpc": {
      "cidr": "10.0.0.0/8"  // Too large! Use /16 or /20
    }
  }
}
```

## Configuration Best Practices

1. **Use config.local.json** for personal settings
2. **Never commit secrets** to Git
3. **Match certificate region** to deployment region
4. **Use specific image tags** in production
5. **Enable deletion protection** in production
6. **Set appropriate backup retention** for compliance
7. **Use Multi-AZ** for production databases
8. **Start small, scale up** - begin with minimal resources

## Additional Resources

- [Getting Started Guide](GETTING_STARTED.md)
- [SSL & DNS Setup](SSL_DNS_SETUP.md)
- [Troubleshooting](TROUBLESHOOTING.md)
- [LibreChat Configuration Docs](https://docs.librechat.ai/install/configuration)
- [AWS CDK Best Practices](https://docs.aws.amazon.com/cdk/latest/guide/best-practices.html)
