# Troubleshooting Guide

Common issues and solutions for LibreChat CDK deployment.

## Deployment Issues

### Docker Not Running

**Error:**
```
docker: Cannot connect to the Docker daemon
```

**Solution:**
```bash
# Start Docker Desktop
# Wait for Docker to fully start
# Retry deployment
cdk deploy --all
```

### AWS Credentials Expired

**Error:**
```
Unable to resolve AWS account to use
```

**Solution:**
```bash
# Verify credentials
aws sts get-caller-identity

# If expired, re-authenticate
# Then retry
cdk deploy --all
```

### Certificate Not Found

**Error:**
```
Certificate 'arn:aws:acm:...' not found
```

**Causes & Solutions:**

1. **Certificate in wrong region:**
   ```bash
   # Check certificate region
   aws acm describe-certificate \
     --certificate-arn "arn:aws:acm:us-west-2:..." \
     --region us-west-2
   
   # Must match deployment region in config.json
   ```

2. **Certificate not issued:**
   - Go to ACM console
   - Verify status is "Issued" (not "Pending validation")
   - Complete validation if needed

3. **Wrong ARN:**
   - Double-check ARN in config.json
   - Ensure no extra spaces or characters

### Stack Rollback

**Error:**
```
Stack LibreChatCdkStack failed to create
```

**Solution:**
```bash
# Check CloudFormation events
aws cloudformation describe-stack-events \
  --stack-name LibreChatCdkStack \
  --region us-west-2 \
  --max-items 20

# Look for CREATE_FAILED events
# Address the specific error
# Destroy and retry
cdk destroy --all
cdk deploy --all
```

### DocumentDB "Internal Failure"

**Error:**
```
UPDATE_FAILED | AWS::DocDB::DBInstance
Resource handler returned message: "Internal Failure"
```

**Cause:**
This is an AWS service-side issue, not your code. Usually transient.

**Solutions:**

1. **Wait and retry:**
   ```bash
   # Wait 5-10 minutes
   # Retry deployment
   cdk deploy --all
   ```

2. **Continue rollback if stuck:**
   ```bash
   aws cloudformation continue-update-rollback \
     --stack-name LibreChatCdkStack \
     --region us-west-2
   
   # Wait for rollback to complete
   # Then retry deployment
   ```

3. **Skip database updates (for IAM-only changes):**
   ```bash
   # Update IAM policies directly via AWS CLI
   # Force ECS service restart to pick up new permissions
   aws ecs update-service \
     --cluster LibreChatCluster \
     --service LibreChatService \
     --force-new-deployment \
     --region us-west-2
   ```

4. **Last resort - recreate stack:**
   ```bash
   cdk destroy --all
   # Wait for complete deletion
   cdk deploy --all
   ```

### Resource Limit Exceeded

**Error:**
```
You have exceeded the limit for X in region Y
```

**Solution:**
```bash
# Check service quotas
aws service-quotas list-service-quotas \
  --service-code vpc \
  --region us-west-2

# Request quota increase via AWS Console:
# Service Quotas → AWS services → Select service → Request increase
```

Common limits:
- VPCs per region: 5
- Elastic IPs: 5
- NAT Gateways: 5

## DNS Issues

### DNS Not Resolving

**Symptom:**
```bash
dig librechat.example.com
# Returns NXDOMAIN or no answer
```

**Solutions:**

1. **Route53 A record not created:**
   ```bash
   # Check if record exists
   aws route53 list-resource-record-sets \
     --hosted-zone-id Z1234567890ABC \
     --query "ResourceRecordSets[?Name=='librechat.example.com.']"
   
   # If empty, create the record (see Getting Started guide)
   ```

2. **Wrong ALB in A record:**
   - Verify A record points to correct ALB
   - Check ALB DNS from CDK output
   - Update record if needed

3. **DNS propagation delay:**
   ```bash
   # Wait 2-5 minutes
   # Check again
   dig librechat.example.com
   ```

4. **Nameservers not updated (Route53):**
   ```bash
   # Check current nameservers
   dig NS example.com +short
   
   # Should show Route53 nameservers
   # If not, update at domain registrar
   ```

### SSL Certificate Errors

**Symptom:**
Browser shows "Your connection is not private"

**Solutions:**

1. **Domain mismatch:**
   ```bash
   # Check certificate domain
   aws acm describe-certificate \
     --certificate-arn "arn:aws:acm:..." \
     --region us-west-2 \
     --query 'Certificate.DomainName'
   
   # Must match domain in config.json
   ```

2. **Certificate not attached to ALB:**
   ```bash
   # Check ALB listeners
   aws elbv2 describe-listeners \
     --load-balancer-arn "arn:aws:elasticloadbalancing:..." \
     --region us-west-2
   
   # Should show certificate ARN on port 443
   ```

3. **DNS pointing to wrong resource:**
   ```bash
   # Verify DNS resolves to ALB
   dig librechat.example.com
   
   # Compare with ALB DNS from CDK output
   ```

## Application Issues

### Application Not Loading

**Symptom:**
Browser shows timeout or 502/503 error

**Solutions:**

1. **Check ECS service status:**
   ```bash
   aws ecs describe-services \
     --cluster LibreChatCluster \
     --services LibreChatService \
     --region us-west-2 \
     --query 'services[0].{Status:status,Running:runningCount,Desired:desiredCount}'
   ```

2. **Check target health:**
   ```bash
   # Get target group ARN from ALB
   aws elbv2 describe-target-groups \
     --load-balancer-arn "arn:aws:elasticloadbalancing:..." \
     --region us-west-2
   
   # Check target health
   aws elbv2 describe-target-health \
     --target-group-arn "arn:aws:elasticloadbalancing:..." \
     --region us-west-2
   ```

   **Unhealthy targets:**
   - Check ECS task logs (see below)
   - Verify security group rules
   - Check container health checks

3. **Review ECS task logs:**
   ```bash
   # LibreChat logs
   aws logs tail /aws/ecs/librechat-service \
     --follow \
     --region us-west-2
   
   # Look for errors or startup issues
   ```

### Database Connection Errors

**Symptom:**
Application logs show database connection failures

**Solutions:**

1. **Check database initialization:**
   ```bash
   # PostgreSQL init logs
   aws logs tail /aws/lambda/init-postgres \
     --region us-west-2
   
   # DocumentDB init logs
   aws logs tail /aws/lambda/init-documentdb \
     --region us-west-2
   
   # Should show successful completion
   ```

2. **Verify security groups:**
   ```bash
   # Check ECS task security group
   aws ecs describe-services \
     --cluster LibreChatCluster \
     --services LibreChatService \
     --region us-west-2 \
     --query 'services[0].networkConfiguration.awsvpcConfiguration.securityGroups'
   
   # Check database security group allows traffic from ECS
   ```

3. **Check database status:**
   ```bash
   # Aurora status
   aws rds describe-db-clusters \
     --db-cluster-identifier librechat-postgres \
     --region us-west-2 \
     --query 'DBClusters[0].Status'
   
   # DocumentDB status
   aws docdb describe-db-clusters \
     --db-cluster-identifier librechat-documentdb \
     --region us-west-2 \
     --query 'DBClusters[0].Status'
   ```

4. **Verify secrets:**
   ```bash
   # List secrets
   aws secretsmanager list-secrets \
     --region us-west-2 \
     --query 'SecretList[?contains(Name, `LibreChat`)].Name'
   
   # Check secret value (be careful with output)
   aws secretsmanager get-secret-value \
     --secret-id "LibreChatCdkStack-..." \
     --region us-west-2
   ```

### ECS Tasks Failing

**Symptom:**
ECS tasks start then immediately stop

**Solutions:**

1. **Check stopped task reason:**
   ```bash
   aws ecs describe-tasks \
     --cluster LibreChatCluster \
     --tasks $(aws ecs list-tasks \
       --cluster LibreChatCluster \
       --service-name LibreChatService \
       --desired-status STOPPED \
       --region us-west-2 \
       --query 'taskArns[0]' \
       --output text) \
     --region us-west-2 \
     --query 'tasks[0].{Reason:stoppedReason,Exit:containers[0].exitCode}'
   ```

2. **Common exit codes:**
   - `Exit code 1`: Application error (check logs)
   - `Exit code 137`: Out of memory (increase task memory)
   - `Exit code 139`: Segmentation fault (check application)

3. **Increase task resources:**
   - Edit task definition in ECS console
   - Increase CPU and memory
   - Update service to use new task definition

## Performance Issues

### Slow Application Response

**Solutions:**

1. **Check Aurora capacity:**
   ```bash
   aws rds describe-db-clusters \
     --db-cluster-identifier librechat-postgres \
     --region us-west-2 \
     --query 'DBClusters[0].ServerlessV2ScalingConfiguration'
   ```

   **If at max capacity:**
   - Increase `maxCapacity` in config.json
   - Redeploy: `cdk deploy --all`

2. **Check ECS service metrics:**
   - Go to ECS console → Cluster → Service
   - View CloudWatch metrics
   - Check CPU and memory utilization
   - Scale up if consistently high (>80%)

3. **Check ALB metrics:**
   - Go to EC2 → Load Balancers
   - View monitoring tab
   - Check target response time
   - Check unhealthy target count

### High Costs

**Solutions:**

1. **Review CloudWatch costs:**
   ```bash
   # Check log group sizes
   aws logs describe-log-groups \
     --region us-west-2 \
     --query 'logGroups[*].{Name:logGroupName,Size:storedBytes}' \
     --output table
   ```

   **Reduce log retention:**
   ```bash
   aws logs put-retention-policy \
     --log-group-name /aws/ecs/librechat-service \
     --retention-in-days 7 \
     --region us-west-2
   ```

2. **Optimize Aurora:**
   - Reduce `maxCapacity` if not needed
   - Set `minCapacity` to 0.5 for dev/test
   - Disable Multi-AZ for dev/test

3. **Optimize NAT Gateway:**
   - Use 1 NAT Gateway for dev/test
   - Consider VPC endpoints for AWS services
   - Review data transfer costs

4. **Review unused resources:**
   ```bash
   # Check for unused EIPs
   aws ec2 describe-addresses \
     --region us-west-2 \
     --query 'Addresses[?AssociationId==null]'
   
   # Release if not needed
   ```

## Cleanup Issues

### Stack Deletion Fails

**Error:**
```
Stack cannot be deleted while resources exist
```

**Solutions:**

1. **Disable deletion protection:**
   ```bash
   # For Aurora
   aws rds modify-db-cluster \
     --db-cluster-identifier librechat-postgres \
     --no-deletion-protection \
     --region us-west-2
   
   # Wait for modification to complete
   # Then retry destroy
   cdk destroy --all
   ```

2. **Manual resource cleanup:**
   ```bash
   # List stack resources
   aws cloudformation list-stack-resources \
     --stack-name LibreChatCdkStack \
     --region us-west-2
   
   # Delete stuck resources manually via console
   # Then retry destroy
   ```

3. **Force delete (last resort):**
   - Go to CloudFormation console
   - Select stack
   - Actions → Delete stack
   - Check "Retain resources" for stuck resources
   - Delete retained resources manually after

## Diagnostic Commands

### Quick Health Check

```bash
#!/bin/bash
REGION="us-west-2"
CLUSTER="LibreChatCluster"

echo "=== ECS Services ==="
aws ecs list-services --cluster $CLUSTER --region $REGION

echo "=== Service Status ==="
aws ecs describe-services \
  --cluster $CLUSTER \
  --services LibreChatService \
  --region $REGION \
  --query 'services[0].{Status:status,Running:runningCount,Desired:desiredCount}'

echo "=== Aurora Status ==="
aws rds describe-db-clusters \
  --region $REGION \
  --query 'DBClusters[?contains(DBClusterIdentifier, `librechat`)].{Name:DBClusterIdentifier,Status:Status}'

echo "=== DocumentDB Status ==="
aws docdb describe-db-clusters \
  --region $REGION \
  --query 'DBClusters[?contains(DBClusterIdentifier, `librechat`)].{Name:DBClusterIdentifier,Status:Status}'

echo "=== Recent Errors ==="
aws logs filter-log-events \
  --log-group-name /aws/ecs/librechat-service \
  --filter-pattern "ERROR" \
  --max-items 5 \
  --region $REGION
```

### Log Monitoring

```bash
# Follow all logs
aws logs tail /aws/ecs/librechat-service --follow --region us-west-2 &
aws logs tail /aws/ecs/meilisearch-service --follow --region us-west-2 &
aws logs tail /aws/ecs/rag-api-service --follow --region us-west-2 &

# Stop with Ctrl+C
```

## Getting Help

### Before Asking for Help

Gather this information:

1. **CDK version:**
   ```bash
   cdk --version
   ```

2. **Deployment region:**
   ```bash
   grep region config/config.json
   ```

3. **Error messages:**
   - CloudFormation events
   - ECS task logs
   - Lambda logs

4. **Stack status:**
   ```bash
   aws cloudformation describe-stacks \
     --stack-name LibreChatCdkStack \
     --region us-west-2 \
     --query 'Stacks[0].StackStatus'
   ```

### Support Resources

- [GitHub Issues](https://github.com/your-repo/issues)
- [LibreChat Discord](https://discord.gg/librechat)
- [AWS Support](https://console.aws.amazon.com/support/)
- [AWS re:Post](https://repost.aws/)

## Additional Resources

- [Getting Started Guide](GETTING_STARTED.md)
- [Configuration Reference](CONFIGURATION.md)
- [SSL & DNS Setup](SSL_DNS_SETUP.md)
- [AWS CDK Troubleshooting](https://docs.aws.amazon.com/cdk/latest/guide/troubleshooting.html)
