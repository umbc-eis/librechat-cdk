# LibreChat CDK Deployment Checklist

Use this checklist to ensure a successful deployment of LibreChat on AWS.

## Pre-Deployment Checklist

### 1. Prerequisites ✓
- [ ] AWS Account with administrative privileges
- [ ] AWS CLI installed and configured with valid credentials
- [ ] Node.js (v14.x or later) installed
- [ ] AWS CDK CLI installed (`npm install -g aws-cdk`)
- [ ] Registered domain name (from any registrar)
- [ ] Access to domain registrar DNS settings

### 2. Repository Setup ✓
- [ ] Repository cloned: `git clone <repository-url>`
- [ ] Dependencies installed: `npm install`
- [ ] Reviewed architecture diagram in README.md

### 3. ACM Certificate Setup ✓
**See ACM_ROUTE53_SETUP.md for detailed instructions**

- [ ] Navigated to ACM in AWS Console
- [ ] Verified correct AWS region (must match deployment region)
- [ ] Requested public certificate
- [ ] Added domain name(s) to certificate
- [ ] Selected DNS validation (recommended) or email validation
- [ ] For DNS validation:
  - [ ] Added CNAME record to DNS provider
  - [ ] Waited for validation (5-30 minutes)
- [ ] For email validation:
  - [ ] Received validation email
  - [ ] Clicked validation link
- [ ] Certificate status is "Issued"
- [ ] Copied Certificate ARN

### 4. Route53 Setup (if using Route53) ✓
**See ACM_ROUTE53_SETUP.md for detailed instructions**

- [ ] Created Route53 hosted zone for your domain
- [ ] Noted all 4 Route53 nameservers
- [ ] Updated nameservers at domain registrar
- [ ] Waited for DNS propagation (can take 24-48 hours)
- [ ] Verified nameserver update: `dig NS example.com`

### 5. Configuration Files ✓

#### config/config.json
- [ ] Updated `region` to your deployment region (e.g., "us-west-2")
- [ ] Updated `domain.name` to your domain (e.g., "librechat.example.com")
- [ ] Updated `domain.certificateArn` with your ACM certificate ARN
- [ ] Verified certificate region matches deployment region
- [ ] Verified domain name matches ACM certificate domain
- [ ] Reviewed and updated VPC settings if needed
- [ ] Reviewed and updated container image tags if needed
- [ ] Reviewed database instance types if needed

#### config/Libre_config/librechat.env
- [ ] Reviewed environment variables
- [ ] Updated API keys if applicable
- [ ] Configured authentication settings
- [ ] Set feature toggles as needed

#### config/Libre_config/librechat.yaml
- [ ] Reviewed application configuration
- [ ] Updated endpoint settings if needed
- [ ] Configured file upload limits
- [ ] Set regional settings

### 6. Validation ✓
- [ ] JSON syntax validation: `cat config/config.json | python3 -m json.tool`
- [ ] All required fields populated in config.json
- [ ] Certificate ARN format correct: `arn:aws:acm:region:account:certificate/id`
- [ ] Domain name format correct (no http:// or trailing /)

## Deployment Checklist

### 1. CDK Bootstrap (First Time Only) ✓
```bash
cdk bootstrap aws://ACCOUNT-NUMBER/REGION
```
- [ ] Bootstrap completed successfully
- [ ] No error messages in output

### 2. Review Changes ✓
```bash
cdk diff
```
- [ ] Reviewed all resources to be created
- [ ] Verified Aurora PostgreSQL version is 16.6
- [ ] Verified domain and certificate configuration
- [ ] No unexpected changes shown

### 3. Deploy Infrastructure ✓
```bash
cdk deploy --all
```
- [ ] Deployment started successfully
- [ ] Monitoring deployment progress
- [ ] No error messages during deployment
- [ ] Deployment completed successfully
- [ ] Noted CDK outputs:
  - [ ] LoadBalancerDNS: ___________________________
  - [ ] LibreChatServiceUrl: ___________________________
  - [ ] DocumentDBEndpoint: ___________________________
  - [ ] EFSFileSystemId: ___________________________

### 4. Deployment Verification ✓
- [ ] All stacks created successfully
- [ ] CloudFormation stacks show CREATE_COMPLETE status
- [ ] No rollback occurred
- [ ] Resources visible in AWS Console:
  - [ ] VPC and subnets
  - [ ] ECS cluster
  - [ ] Aurora PostgreSQL cluster
  - [ ] DocumentDB cluster
  - [ ] Application Load Balancer
  - [ ] EFS file system
  - [ ] Secrets in Secrets Manager

## Post-Deployment Checklist

### 1. Route53 DNS Configuration ✓
**See ACM_ROUTE53_SETUP.md Part 4 for detailed instructions**

#### Option A: Using AWS Console
- [ ] Navigated to Route53 → Hosted zones
- [ ] Selected your hosted zone
- [ ] Clicked "Create record"
- [ ] Configured A record:
  - [ ] Record name entered (e.g., "librechat")
  - [ ] Record type: A - IPv4
  - [ ] Alias: ON
  - [ ] Route traffic to: Application Load Balancer
  - [ ] Region selected correctly
  - [ ] Load balancer selected (from CDK output)
  - [ ] Evaluate target health: Yes
- [ ] Created record successfully

#### Option B: Using AWS CLI
- [ ] Set variables (HOSTED_ZONE_ID, DOMAIN_NAME, ALB_DNS_NAME, ALB_HOSTED_ZONE_ID)
- [ ] Created change batch JSON file
- [ ] Executed `aws route53 change-resource-record-sets` command
- [ ] Command completed successfully

### 2. DNS Propagation Verification ✓
Wait 2-5 minutes, then:
```bash
# Check DNS resolution
dig librechat.example.com

# Or use nslookup
nslookup librechat.example.com
```
- [ ] Domain resolves to IP address
- [ ] IP address matches ALB region
- [ ] No NXDOMAIN errors

### 3. HTTPS Connection Testing ✓
```bash
# Test HTTPS connection
curl -I https://librechat.example.com
```
- [ ] Receives HTTP response (200, 302, or similar)
- [ ] No SSL certificate errors
- [ ] Certificate matches your domain
- [ ] Connection uses HTTPS (not HTTP)

### 4. Application Access ✓
- [ ] Opened browser to: https://your-domain.com
- [ ] Page loads successfully
- [ ] No certificate warnings in browser
- [ ] LibreChat interface displays correctly
- [ ] Can navigate the application

### 5. Database Verification ✓

#### PostgreSQL Verification
Connect via bastion host or Lambda:
```sql
SELECT version();
SELECT * FROM pg_extension WHERE extname = 'vector';
SELECT usename FROM pg_user WHERE usename = 'rag';
```
- [ ] PostgreSQL version is 16.6
- [ ] pgvector extension installed
- [ ] rag user exists

#### CloudWatch Logs Verification
- [ ] Checked `/aws/lambda/init-postgres` logs
- [ ] Init Lambda completed successfully
- [ ] No errors in initialization
- [ ] Database user created successfully
- [ ] Extensions installed successfully

### 6. Service Health Check ✓
- [ ] ECS services running:
  - [ ] LibreChat service: RUNNING
  - [ ] Meilisearch service: RUNNING
  - [ ] RAG API service: RUNNING
- [ ] Target health in ALB: Healthy
- [ ] No errors in ECS task logs
- [ ] CloudWatch Container Insights showing metrics

## Monitoring Setup (Optional but Recommended)

### 1. CloudWatch Alarms ✓
- [ ] Set up ALB unhealthy target alarm
- [ ] Set up ECS service CPU/memory alarms
- [ ] Set up Aurora database connection alarms
- [ ] Set up certificate expiration alarm (ACM auto-renews)

### 2. Log Monitoring ✓
- [ ] Configured log retention periods
- [ ] Set up CloudWatch Insights queries
- [ ] Configured log exports if needed

### 3. Cost Monitoring ✓
- [ ] Enabled Cost Explorer
- [ ] Set up billing alerts
- [ ] Tagged resources appropriately
- [ ] Reviewed estimated monthly costs

## Troubleshooting Reference

If issues occur, check:

1. **Deployment Failed**
   - Review CloudFormation events for specific errors
   - Check IAM permissions
   - Verify AWS service quotas
   - See README.md troubleshooting section

2. **DNS Not Resolving**
   - Verify Route53 A record created correctly
   - Check nameservers at registrar (if using Route53)
   - Wait longer for DNS propagation
   - See ACM_ROUTE53_SETUP.md troubleshooting

3. **SSL Certificate Errors**
   - Verify certificate domain matches your domain
   - Check certificate status in ACM (must be "Issued")
   - Verify certificate in correct region
   - See ACM_ROUTE53_SETUP.md troubleshooting

4. **Application Not Loading**
   - Check ECS service status
   - Review ECS task logs in CloudWatch
   - Verify target health in ALB
   - Check security group rules
   - See README.md troubleshooting section

5. **Database Connection Issues**
   - Review init-postgres Lambda logs
   - Check security group rules
   - Verify secrets in Secrets Manager
   - See POSTGRES_UPGRADE.md troubleshooting

## Success Criteria

Deployment is successful when:
- ✅ All CDK stacks deployed without errors
- ✅ DNS resolves to Application Load Balancer
- ✅ HTTPS connection works without certificate errors
- ✅ Application loads in browser
- ✅ All ECS services are running and healthy
- ✅ Database initialization completed successfully
- ✅ No errors in CloudWatch logs

## Additional Resources

- **Main Documentation**: [README.md](README.md)
- **ACM & Route53 Setup**: [ACM_ROUTE53_SETUP.md](ACM_ROUTE53_SETUP.md)
- **Database Upgrade Guide**: [POSTGRES_UPGRADE.md](POSTGRES_UPGRADE.md)
- **Changes Summary**: [CHANGES_SUMMARY.md](CHANGES_SUMMARY.md)

## Support

- AWS CDK: https://docs.aws.amazon.com/cdk/
- LibreChat: https://docs.librechat.ai
- AWS Support: Contact via AWS Console

---

**Date Completed**: _______________

**Deployed By**: _______________

**Notes**: 
_______________________________________________________________
_______________________________________________________________
_______________________________________________________________
