# ACM Certificate and Route53 Domain Setup Guide

## Overview

This guide provides detailed instructions for setting up an AWS Certificate Manager (ACM) SSL/TLS certificate and configuring Route53 DNS for your LibreChat deployment.

## Prerequisites

- An AWS account with appropriate permissions
- A registered domain name (from any registrar: GoDaddy, Namecheap, Google Domains, etc.)
- Access to your domain registrar's DNS settings
- AWS CLI installed and configured (optional, for CLI-based setup)

## Part 1: AWS Certificate Manager (ACM) Setup

### Step 1: Navigate to ACM

1. Log in to the AWS Management Console
2. Navigate to **Certificate Manager** (ACM)
   - Search for "Certificate Manager" in the AWS services search bar
   - Or use direct URL: `https://console.aws.amazon.com/acm/`
3. **IMPORTANT**: Ensure you're in the **same AWS region** where you'll deploy LibreChat
   - Check the region dropdown in the top-right corner
   - The region must match the `region` value in `config/config.json`
   - Example: If deploying to `us-west-2`, request certificate in `us-west-2`

### Step 2: Request a Certificate

1. Click **"Request a certificate"** button
2. Select **"Request a public certificate"**
3. Click **"Next"**

### Step 3: Configure Domain Names

**Option A: Single Domain**
```
Domain name: librechat.example.com
```

**Option B: Wildcard (Recommended for flexibility)**
```
Domain names:
  - *.example.com
  - example.com
```

4. Click **"Next"**

### Step 4: Select Validation Method

Choose your validation method:

#### DNS Validation (Recommended)
- ✅ Automated renewal
- ✅ Works even if email addresses change
- ✅ Faster validation
- ⚠️ Requires access to DNS settings

#### Email Validation
- ✅ No DNS access required
- ⚠️ Requires response to validation email
- ⚠️ Email must be monitored for renewals

**Recommendation**: Choose **DNS validation** for production deployments.

5. Click **"Next"**

### Step 5: Add Tags (Optional)

Add tags for organization:
```
Key: Project     Value: LibreChat
Key: Environment Value: Production
```

6. Click **"Request"**

### Step 6: Validate Certificate

#### For DNS Validation:

1. You'll see a screen showing CNAME records that must be added to your DNS
2. Click **"Create records in Route53"** if using Route53 for DNS (automatic)
   - OR -
3. Copy the CNAME name and value if using external DNS provider:

```
CNAME Name:  _abc123def456.example.com
CNAME Value: _xyz789abc123.acm-validations.aws.
```

4. Add this CNAME record to your DNS provider:
   - GoDaddy: DNS Management → Add CNAME record
   - Namecheap: Advanced DNS → Add CNAME record
   - Google Domains: DNS → Custom records → Create CNAME

5. Wait for validation (typically 5-30 minutes)
   - Status will change from "Pending validation" to "Issued"
   - You can close the browser and check back later

#### For Email Validation:

1. Check email sent to domain admin addresses:
   - admin@example.com
   - administrator@example.com
   - hostmaster@example.com
   - postmaster@example.com
   - webmaster@example.com

2. Click the validation link in the email
3. Certificate will be issued within minutes

### Step 7: Copy Certificate ARN

Once the certificate status shows **"Issued"**:

1. Click on the certificate to view details
2. Copy the **Certificate ARN**
   ```
   Format: arn:aws:acm:us-west-2:123456789012:certificate/abc123def-4567-8901-2345-678901234567
   ```
3. Save this ARN - you'll need it for `config/config.json`

### ACM Troubleshooting

**Certificate stuck in "Pending validation"**
- Verify CNAME record was added correctly (no typos)
- Check that you didn't include the domain name twice (some DNS providers auto-append it)
- Wait up to 30 minutes for DNS propagation
- Use `dig` or `nslookup` to verify CNAME record is visible

**Certificate in wrong region**
- Certificates are region-specific and cannot be moved
- Delete the certificate and create a new one in the correct region

## Part 2: Route53 Hosted Zone Setup

### Option A: Domain Registered with Route53

If you registered your domain through Route53, a hosted zone already exists.

1. Navigate to **Route53** → **Hosted zones**
2. Find your domain's hosted zone
3. Note the **Hosted Zone ID** (starts with `Z`)
4. Skip to "Part 3: Post-Deployment DNS Configuration"

### Option B: Domain Registered Elsewhere (Most Common)

#### Step 1: Create Hosted Zone

1. Navigate to **Route53** in AWS Console
2. Click **"Hosted zones"** in the left sidebar
3. Click **"Create hosted zone"**

4. Configure the hosted zone:
   ```
   Domain name: example.com
   Description: LibreChat production DNS
   Type: Public hosted zone
   ```

5. Click **"Create hosted zone"**

#### Step 2: Get Route53 Nameservers

After creating the hosted zone, you'll see 4 NS (nameserver) records:

```
ns-123.awsdns-12.com
ns-456.awsdns-45.net
ns-789.awsdns-78.org
ns-012.awsdns-01.co.uk
```

**Copy all 4 nameservers** - you'll need them for the next step.

#### Step 3: Update Domain Registrar Nameservers

Update nameservers at your domain registrar:

##### GoDaddy
1. Log in to GoDaddy account
2. Go to **My Products** → **Domains**
3. Click on your domain
4. Click **"Manage DNS"**
5. Scroll to **"Nameservers"** section
6. Click **"Change"** → **"Enter my own nameservers (advanced)"**
7. Enter all 4 Route53 nameservers
8. Click **"Save"**

##### Namecheap
1. Log in to Namecheap account
2. Go to **Domain List**
3. Click **"Manage"** next to your domain
4. Under **"Nameservers"**, select **"Custom DNS"**
5. Enter all 4 Route53 nameservers
6. Click **"Save"**

##### Google Domains
1. Log in to Google Domains
2. Select your domain
3. Click **"DNS"** in the left sidebar
4. Scroll to **"Name servers"**
5. Select **"Use custom name servers"**
6. Enter all 4 Route53 nameservers
7. Click **"Save"**

##### Other Registrars
- Look for "Nameservers", "DNS Settings", or "Domain Settings"
- Change from default/parked nameservers to custom nameservers
- Enter all 4 Route53 nameservers

#### Step 4: Wait for DNS Propagation

- **Time Required**: 24-48 hours (usually faster)
- During this time, DNS queries will gradually switch to Route53
- You can check propagation status:
  ```bash
  # Check current nameservers
  dig NS example.com
  
  # Or use online tools
  # https://www.whatsmydns.net/
  ```

#### Step 5: Verify Nameserver Update

```bash
# Should show Route53 nameservers
dig NS example.com +short

# Expected output:
ns-123.awsdns-12.com.
ns-456.awsdns-45.net.
ns-789.awsdns-78.org.
ns-012.awsdns-01.co.uk.
```

### Route53 Troubleshooting

**Nameservers not updating**
- Wait longer (can take up to 48 hours)
- Verify you saved changes at registrar
- Check for typos in nameserver entries
- Contact registrar support if stuck

**DNS not resolving after nameserver change**
- Verify hosted zone in Route53 has SOA and NS records
- Check that nameservers at registrar exactly match Route53
- Try flushing local DNS cache: `ipconfig /flushdns` (Windows) or `sudo dscacheutil -flushcache` (Mac)

## Part 3: Update Configuration Files

### Edit config/config.json

```json
{
  "region": "us-west-2",
  "domain": {
    "name": "librechat.example.com",
    "certificateArn": "arn:aws:acm:us-west-2:123456789012:certificate/abc123def-4567-8901-2345-678901234567"
  }
}
```

**Important Validations:**
- ✅ ACM certificate is in "Issued" status
- ✅ Certificate region matches deployment region
- ✅ Domain name matches certificate domain exactly
- ✅ Certificate ARN is complete and correct
- ✅ Route53 nameservers are updated at registrar (if using Route53)

## Part 4: Post-Deployment DNS Configuration

**⚠️ Complete this AFTER running `cdk deploy --all`**

After deployment completes, CDK will output:
```
Outputs:
LibreChatCdkStack.LoadBalancerDNS = LibreChatStack-LibreChXXXXXX-1234567890.us-west-2.elb.amazonaws.com
LibreChatCdkStack.LibreChatServiceUrl = https://librechat.example.com
```

### Step 1: Create Route53 A Record

#### Using AWS Console:

1. Navigate to **Route53** → **Hosted zones**
2. Click on your domain (e.g., `example.com`)
3. Click **"Create record"**

4. Configure the record:
   ```
   Record name: librechat (or leave blank for apex domain)
   Record type: A - Routes traffic to an IPv4 address and some AWS resources
   Alias: ON (toggle enabled)
   Route traffic to:
     - Alias to Application and Classic Load Balancer
     - Region: us-west-2 (your deployment region)
     - Load balancer: Select your ALB from CDK output
   Routing policy: Simple routing
   Evaluate target health: Yes (recommended)
   ```

5. Click **"Create records"**

#### Using AWS CLI:

First, find your ALB hosted zone ID (varies by region):
```bash
# Get ALB details
aws elbv2 describe-load-balancers \
  --region us-west-2 \
  --query 'LoadBalancers[?contains(LoadBalancerName, `LibreChat`)].{DNS:DNSName,ZoneId:CanonicalHostedZoneId}' \
  --output table
```

Create Route53 record:
```bash
# Set variables
HOSTED_ZONE_ID="Z1234567890ABC"  # Your Route53 hosted zone ID
DOMAIN_NAME="librechat.example.com"
ALB_DNS_NAME="LibreChatStack-LibreChXXXXXX-1234567890.us-west-2.elb.amazonaws.com"
ALB_HOSTED_ZONE_ID="Z1H1FL5HABSF5"  # From describe-load-balancers output

# Create change batch file
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

# Apply changes
aws route53 change-resource-record-sets \
  --hosted-zone-id ${HOSTED_ZONE_ID} \
  --change-batch file:///tmp/route53-change.json
```

### Step 2: Verify DNS Resolution

Wait 2-5 minutes, then verify:

```bash
# Check DNS resolution
nslookup librechat.example.com

# Or use dig
dig librechat.example.com

# Should return the ALB IP addresses
```

### Step 3: Test HTTPS Connection

```bash
# Test SSL certificate
curl -I https://librechat.example.com

# Expected: HTTP/2 200 or 302
# Should NOT show certificate errors
```

### Step 4: Access Your Application

Open browser to: `https://librechat.example.com`

## Common Regional ALB Hosted Zone IDs

| Region | ALB Hosted Zone ID |
|--------|-------------------|
| us-east-1 | Z35SXDOTRQ7X7K |
| us-east-2 | Z3AADJGX6KTTL2 |
| us-west-1 | Z368ELLRRE2KJ0 |
| us-west-2 | Z1H1FL5HABSF5 |
| eu-west-1 | Z32O12XQLNTSW2 |
| eu-central-1 | Z215JYRZR1TBD5 |
| ap-southeast-1 | Z1LMS91P8CMLE5 |
| ap-northeast-1 | Z14GRHDCWA56QT |

[Full list of ALB hosted zone IDs](https://docs.aws.amazon.com/general/latest/gr/elb.html)

## Security Best Practices

1. **Certificate Monitoring**
   - Set up CloudWatch alarms for certificate expiration
   - ACM automatically renews certificates 60 days before expiration
   - Verify auto-renewal is working

2. **DNS Security**
   - Enable DNSSEC for Route53 hosted zone (optional but recommended)
   - Use Route53 query logging for audit trails
   - Restrict IAM permissions for Route53 changes

3. **SSL/TLS Configuration**
   - ALB uses AWS security policy (ELBSecurityPolicy-TLS-1-2-2017-01 or newer)
   - Modern browsers automatically use TLS 1.2 or 1.3
   - Certificate includes strong encryption ciphers

## Cost Considerations

### ACM Certificates
- ✅ **FREE** for certificates used with AWS resources (ALB, CloudFront, etc.)
- No charge for certificate issuance or renewal

### Route53 Costs
- **Hosted Zone**: $0.50/month per hosted zone
- **DNS Queries**: $0.40 per million queries (first 1B queries/month)
- **Alias Queries**: FREE for AWS resources (ALB, CloudFront, etc.)
- Typical monthly cost: $0.50 - $2.00 for small applications

## Troubleshooting

### Certificate Validation Issues

**Problem**: Certificate stuck in "Pending validation"
```bash
# Check if DNS record exists
dig _abc123def456.example.com CNAME +short

# If empty, CNAME record not added or not propagated yet
```

**Solution**:
- Verify CNAME record in DNS provider
- Wait 30 minutes for DNS propagation
- Ensure CNAME value includes trailing dot if required by DNS provider

### DNS Not Resolving

**Problem**: Domain doesn't resolve to ALB
```bash
# Check DNS resolution
dig librechat.example.com +short

# If empty or wrong IP, A record not configured
```

**Solution**:
- Verify A record alias in Route53
- Check that ALB DNS name is correct
- Wait 2-5 minutes for DNS propagation

### SSL Certificate Errors in Browser

**Problem**: Browser shows "Your connection is not private"

**Possible Causes**:
1. Certificate doesn't match domain name
   - Verify domain in config.json matches certificate domain
2. Certificate not yet issued
   - Check ACM console for certificate status
3. DNS pointing to wrong resource
   - Verify Route53 A record points to correct ALB

## Validation Checklist

Before deploying LibreChat, verify:

- [ ] ACM certificate status is "Issued"
- [ ] Certificate is in the same region as deployment
- [ ] Certificate domain matches config.json domain
- [ ] Certificate ARN is copied correctly
- [ ] Route53 hosted zone exists (if using Route53)
- [ ] Nameservers updated at registrar (if using Route53)
- [ ] DNS propagation complete (if using Route53)

After deploying LibreChat, complete:

- [ ] CDK deployment completed successfully
- [ ] Copied LoadBalancerDNS from CDK output
- [ ] Created Route53 A record alias to ALB
- [ ] DNS resolves to ALB IP addresses
- [ ] HTTPS connection works without certificate errors
- [ ] Application accessible at configured domain

## Additional Resources

- [AWS ACM Documentation](https://docs.aws.amazon.com/acm/)
- [AWS Route53 Documentation](https://docs.aws.amazon.com/route53/)
- [ACM Certificate Validation](https://docs.aws.amazon.com/acm/latest/userguide/domain-ownership-validation.html)
- [Route53 Alias Records](https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/resource-record-sets-choosing-alias-non-alias.html)
- [ALB HTTPS Listeners](https://docs.aws.amazon.com/elasticloadbalancing/latest/application/create-https-listener.html)

## Support

If you encounter issues:
1. Check CloudWatch Logs for deployment errors
2. Verify all checklist items above
3. Review AWS documentation links
4. Check AWS Support or community forums
