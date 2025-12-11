# LibreChat on AWS: Architecture and Deployment on ECS 

LibreChat is a chat application that can be deployed on AWS using ECS (Elastic Container Service). This guide provides an overview of the architecture and steps to deploy LibreChat on AWS.

## Quick Start

**New to this deployment?** Follow these guides in order:

1. **[ACM_ROUTE53_SETUP.md](ACM_ROUTE53_SETUP.md)** - Set up SSL certificate and DNS (do this first!)
2. **[README.md](README.md)** - Main deployment guide (this file)

## Architecture Overview

![LibreChat on AWS ECS Architecture](images/Librechat_AWS-architecture.png)

## Prerequisites

1. **Local Development Environment**
   - Node.js (v14.x or later)
   - AWS CDK CLI (`npm install -g aws-cdk`)
   - Docker Desktop installed and running
   - AWS CLI installed and configured
   - Git

2. **AWS Account Requirements**
   - AWS Account with administrative privileges
   - AWS CLI configured with appropriate credentials
   - A registered domain in Route53 (if using HTTPS and Route53)
   - SSL certificate in AWS Certificate Manager (if using HTTPS)

## Configuration Steps

1. **Clone the Repository**
   ```bash
   git clone <repository-url>
   cd librechat-cdk
   ```

2. **Install Dependencies**
   ```bash
   npm install
   ```

3. **Configure Domain and SSL Certificate (Required for HTTPS)**

   **IMPORTANT:** Before deployment, you must set up the ACM certificate and configure your domain settings.

   ### Step 3a: Request ACM Certificate
   
   1. Navigate to AWS Certificate Manager (ACM) in the AWS Console
   2. Ensure you're in the **same region** as your deployment (check `config/config.json` region setting)
   3. Click "Request a certificate" → Choose "Request a public certificate"
   4. Enter your domain name (e.g., `librechat.example.com`)
      - For wildcard support, use `*.example.com` and `example.com`
   5. Select validation method:
      - **DNS validation** (recommended): Add CNAME records to your DNS
      - **Email validation**: Respond to validation email
   6. Wait for certificate status to become "Issued" (usually 5-30 minutes for DNS validation)
   7. Copy the Certificate ARN (format: `arn:aws:acm:region:account-id:certificate/certificate-id`)

   ### Step 3b: Prepare Route53 Hosted Zone (if not already configured)
   
   1. Navigate to Route53 in AWS Console
   2. If you already have a hosted zone for your domain, note the zone ID
   3. If not, create a new hosted zone:
      - Click "Create hosted zone"
      - Enter your domain name (e.g., `example.com`)
      - Select "Public hosted zone"
      - Note the NS (nameserver) records provided
   4. **Update your domain registrar** to use Route53 nameservers (if not already done)
      - Copy the 4 NS records from Route53
      - Update nameservers at your domain registrar (GoDaddy, Namecheap, etc.)
      - DNS propagation can take 24-48 hours

   ### Step 3c: Update Configuration Files
   
   Edit `config/config.json`:
   ```json
   {
     "region": "us-west-2",  // Your deployment region
     "domain": {
       "name": "librechat.example.com",  // Your actual domain name
       "certificateArn": "arn:aws:acm:us-west-2:123456789012:certificate/abcd1234-5678-90ef-ghij-klmnopqrstuv"  // Your ACM certificate ARN
     }
   }
   ```

   **Configuration Notes:**
   - The ACM certificate **must be in the same AWS region** as your deployment
   - The domain name in config.json must **match** the domain in your ACM certificate
   - Both `domain.name` and `domain.certificateArn` are **required** for deployment

4. **Configure the Application**

   Update the following configuration files based on your requirements:

   a. **config/config.json**
   - **VPC Configuration**: Configure your Virtual Private Cloud settings
     
     **Example - Create New VPC**:
     ```json
     "vpc": {
       "useExisting": false,
       "existingVpcId": "",
       "newVpc": {
         "maxAzs": 2,
         "natGateways": 1,
         "cidr": "10.0.0.0/16"
       }
     }
     ```
     This creates a VPC with:
     - CIDR block: `10.0.0.0/16` (65,536 IP addresses)
     - 2 Availability Zones for high availability
     - 1 NAT Gateway for cost optimization (use 2+ for production)
     - Public subnets: `10.0.0.0/24`, `10.0.1.0/24`
     - Private subnets: `10.0.128.0/24`, `10.0.129.0/24`
     
     **Example - Use Existing VPC**:
     ```json
     "vpc": {
       "useExisting": true,
       "existingVpcId": "vpc-0123456789abcdef0",
       "newVpc": {}
     }
     ```
   
   - **Database Configuration**: PostgreSQL version for Aurora
     ```json
     "database": {
       "postgresVersion": "16.6"
     }
     ```
   
   - Region settings (must match ACM certificate region)
   - Container images
   - Database configurations
   - Domain and certificate settings (configured in step 3)

   b. **config/Libre_config/librechat.env**
   - Environment-specific configurations
   - API keys and authentication settings
   - Feature toggles and limits

   c. **config/Libre_config/librechat.yaml**
   - Application configuration
   - Endpoints and API settings
   - File upload limits
   - Regional settings

## Deployment Steps

1. **Bootstrap AWS Environment** (First time only)
   ```bash
   cdk bootstrap aws://ACCOUNT-NUMBER/REGION
   ```

2. **Review Infrastructure Changes**
   ```bash
   cdk diff
   ```

3. **Deploy the Stack**
   ```bash
   cdk deploy --all
   ```

   The deployment will output important information including:
   - **LibreChatServiceUrl**: Your application URL (https://your-domain.com)
   - **LoadBalancerDNS**: The ALB DNS name needed for Route53 setup
   - **DocumentDBEndpoint**: Database endpoint
   - **EFSFileSystemId**: EFS file system ID

4. **Post-Deployment: Configure Route53 DNS Record**

   After successful deployment, you must create a Route53 record to point your domain to the Application Load Balancer:

   ### Option A: Using AWS Console
   1. Navigate to Route53 → Hosted zones
   2. Select your hosted zone (e.g., `example.com`)
   3. Click "Create record"
   4. Configure the record:
      - **Record name**: Enter subdomain (e.g., `librechat`) or leave blank for apex domain
      - **Record type**: Select `A - Routes traffic to an IPv4 address and some AWS resources`
      - **Alias**: Toggle ON
      - **Route traffic to**: 
        - Select "Alias to Application and Classic Load Balancer"
        - Select your deployment region (e.g., `us-west-2`)
        - Select the ALB that was created (use the LoadBalancerDNS from CDK output)
      - **Routing policy**: Simple routing
   5. Click "Create records"

   ### Option B: Using AWS CLI
   ```bash
   # Replace these values with your actual values from CDK output
   HOSTED_ZONE_ID="Z1234567890ABC"
   DOMAIN_NAME="librechat.example.com"
   ALB_DNS_NAME="LibreChatStack-LibreChXXXXXX-1234567890.us-west-2.elb.amazonaws.com"
   ALB_HOSTED_ZONE_ID="Z1H1FL5HABSF5"  # ALB zone ID for us-west-2 (varies by region)
   
   # Create the Route53 A record
   cat > /tmp/route53-change.json <<EOF
   {
     "Changes": [{
       "Action": "CREATE",
       "ResourceRecordSet": {
         "Name": "${DOMAIN_NAME}",
         "Type": "A",
         "AliasTarget": {
           "HostedZoneId": "${ALB_HOSTED_ZONE_ID}",
           "DNSName": "${ALB_DNS_NAME}",
           "EvaluateTargetHealth": true
         }
       }
     }]
   }
   EOF
   
   aws route53 change-resource-record-sets \
     --hosted-zone-id ${HOSTED_ZONE_ID} \
     --change-batch file:///tmp/route53-change.json
   ```

   ### Verify DNS Propagation
   Wait 2-5 minutes for DNS propagation, then verify:
   ```bash
   # Check DNS resolution
   nslookup librechat.example.com
   
   # Or use dig
   dig librechat.example.com
   
   # Test HTTPS connection
   curl -I https://librechat.example.com
   ```

5. **Access Your Application**

   Once DNS has propagated, access your LibreChat instance at:
   ```
   https://your-configured-domain.com
   ```

## Important Notes

1. **HTTP vs HTTPS**
   - **HTTPS (Recommended)**: If domain and certificate ARN are configured, the application will be deployed with HTTPS (port 443)
   - **HTTP (Development Only)**: Without domain configuration, the application will use HTTP (port 80)
   - For production deployments, always use HTTPS with a valid ACM certificate

2. **Domain and SSL Certificate Requirements**
   - ACM certificate **must be in the same AWS region** as your CDK deployment
   - Certificate must be in "Issued" status before deployment
   - Domain name in config.json must exactly match the certificate domain
   - Route53 A record must be created **after** deployment using the ALB DNS from CDK outputs

3. **Docker Requirements**
   - Ensure Docker Desktop is running before deployment
   - The CDK stack uses Docker for lambda layer configuration

4. **Cost Considerations**
   - The deployment includes:
     - **DocumentDB cluster** (MongoDB-compatible)
     - **Aurora PostgreSQL serverless v2 cluster** (2-16 ACU capacity)
     - **NAT Gateway** (hourly + data transfer charges)
     - **Application Load Balancer** (hourly + LCU charges)
     - **ECS Fargate containers** (vCPU and memory hours)
     - **Secrets Manager** (per secret per month)
     - **EFS storage** (per GB-month)
   - Review the [AWS pricing calculator](https://calculator.aws/) for estimated costs
   - Consider using AWS Cost Explorer and setting up billing alerts

5. **Security Best Practices**
   - All databases are deployed in private subnets with no public access
   - Secrets are stored in AWS Secrets Manager (never hardcoded)
   - Security groups restrict traffic to VPC CIDR only
   - Enable AWS CloudTrail for audit logging
   - Regularly update container images and dependencies
   - Review IAM policies and apply least privilege principle
   - Enable AWS GuardDuty for threat detection

## Troubleshooting

1. **Common Issues**
   - **Docker not running**: Ensure Docker Desktop is started before running `cdk deploy`
   - **CDK bootstrap errors**: Verify AWS credentials and permissions (requires AdministratorAccess or equivalent)
   - **Domain/SSL issues**: 
     - Verify certificate ARN is correct and certificate is in "Issued" status
     - Ensure certificate is in the same region as deployment
     - Check that domain name exactly matches certificate domain
   - **DNS not resolving**: 
     - Verify Route53 A record is correctly configured with ALB alias
     - Wait 2-5 minutes for DNS propagation
     - Check nameservers at domain registrar match Route53 NS records
   - **Expired credentials**: Make sure terminal has valid AWS credentials and run `cdk deploy` again
   - **Database connection issues**: 
     - Check that initialization Lambda completed successfully in CloudWatch Logs
     - Verify security group rules allow traffic from ECS tasks to databases
     - Ensure database secrets are properly configured in Secrets Manager

2. **Logs and Monitoring**
   - **CloudWatch Logs** for container logs:
     - `/aws/ecs/librechat-service` - LibreChat application logs
     - `/aws/ecs/meilisearch-service` - Meilisearch logs
     - `/aws/ecs/rag-api-service` - RAG API logs
     - `/aws/lambda/init-postgres` - Database initialization logs
   - **CloudWatch Metrics** for performance monitoring:
     - ECS service CPU and memory utilization
     - ALB request count and target response time
     - Aurora database connections and queries
   - **AWS X-Ray** can be enabled for distributed tracing (optional)

## Clean Up

To remove all deployed resources:
```bash
cdk destroy --all
```

**Note:** This will delete all resources including databases. Ensure you have backups if needed.

### Backup Recommendations Before Cleanup
- Export critical data from DocumentDB and Aurora PostgreSQL
- Download any files stored in EFS if needed
- Save Secrets Manager secrets if they need to be preserved
- Document any custom configurations or environment variables

## Database Architecture

### Aurora PostgreSQL
- **Purpose**: RAG API vector storage using pgvector extension
- **Configuration**: Serverless v2 with auto-scaling (2-16 ACU)
- **Extensions**: pgvector for embeddings storage
- **Initialization**: Automated via Lambda function
  - Creates `rag` user with necessary permissions
  - Installs pgvector extension
  - Configures database for RAG operations

### DocumentDB (MongoDB-compatible)
- **Purpose**: LibreChat application data storage
- **Configuration**: t3.medium instance (configurable)
- **Initialization**: Automated via Lambda function
  - Creates application user
  - Sets up required collections
  - Configures authentication

## Support and Resources

- [LibreChat Documentation](https://docs.librechat.ai)
- [AWS CDK Documentation](https://docs.aws.amazon.com/cdk/)
- [AWS Certificate Manager Documentation](https://docs.aws.amazon.com/acm/)
- [Route53 Documentation](https://docs.aws.amazon.com/route53/)
