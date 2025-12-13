# SSL Certificate & DNS Setup

Complete guide for setting up AWS Certificate Manager (ACM) SSL certificates and Route53 DNS for LibreChat.

## Overview

This guide covers:
1. Creating an ACM SSL certificate
2. Validating the certificate
3. Setting up Route53 (optional)
4. Creating DNS records post-deployment

## Part 1: ACM Certificate Setup

### Step 1: Navigate to ACM

1. Log in to AWS Console
2. Go to **Certificate Manager** (search "ACM")
3. **CRITICAL:** Select the **same region** as your deployment
   - Check region dropdown (top-right)
   - Must match `region` in `config.json`
   - Example: Deploying to `us-west-2`? Request cert in `us-west-2`

### Step 2: Request Certificate

1. Click **Request a certificate**
2. Select **Request a public certificate**
3. Click **Next**

### Step 3: Add Domain Names

Choose your option:

**Option A: Single Domain**
```
librechat.example.com
```

**Option B: Wildcard (Recommended)**
```
*.example.com
example.com
```

Wildcard covers all subdomains (librechat.example.com, api.example.com, etc.)

### Step 4: Select Validation Method

#### DNS Validation (Recommended)

**Pros:**
- ✅ Automatic renewal
- ✅ Works if email changes
- ✅ Faster validation (5-30 min)

**Cons:**
- ⚠️ Requires DNS access

#### Email Validation

**Pros:**
- ✅ No DNS access needed

**Cons:**
- ⚠️ Must monitor email for renewals
- ⚠️ Slower validation

**Recommendation:** Use DNS validation for production.

### Step 5: Validate Certificate

#### For DNS Validation:

1. After requesting, you'll see CNAME records to add
2. Copy the CNAME name and value:
   ```
   Name:  _abc123.example.com
   Value: _xyz789.acm-validations.aws.
   ```

3. Add to your DNS provider:

   **Route53:**
   - Click **Create records in Route53** (automatic)

   **GoDaddy:**
   - DNS Management → Add Record → CNAME
   - Host: `_abc123` (without domain)
   - Points to: `_xyz789.acm-validations.aws.`

   **Namecheap:**
   - Advanced DNS → Add New Record → CNAME
   - Host: `_abc123`
   - Value: `_xyz789.acm-validations.aws.`

   **Cloudflare:**
   - DNS → Add Record → CNAME
   - Name: `_abc123`
   - Target: `_xyz789.acm-validations.aws.`

4. Wait for validation (5-30 minutes)
5. Status changes to **Issued**

#### For Email Validation:

1. Check email sent to:
   - admin@example.com
   - administrator@example.com
   - hostmaster@example.com
   - postmaster@example.com
   - webmaster@example.com

2. Click validation link in email
3. Certificate issued within minutes

### Step 6: Copy Certificate ARN

Once status shows **Issued**:

1. Click on certificate
2. Copy **Certificate ARN**:
   ```
   arn:aws:acm:us-west-2:123456789012:certificate/abc123-def4-5678-90ab-cdef12345678
   ```
3. Save for `config.json`

### Troubleshooting ACM

**Certificate stuck "Pending validation":**
- Verify CNAME added correctly (no typos)
- Don't include domain twice (some DNS providers auto-append)
- Wait up to 30 minutes for DNS propagation
- Verify with: `dig _abc123.example.com CNAME`

**Certificate in wrong region:**
- Certificates can't be moved between regions
- Delete and recreate in correct region

## Part 2: Route53 Setup (Optional)

Skip this if using external DNS provider (GoDaddy, Namecheap, etc.)

### If Domain Registered with Route53

Hosted zone already exists. Skip to Part 3.

### If Domain Registered Elsewhere

#### Step 1: Create Hosted Zone

1. Go to **Route53** → **Hosted zones**
2. Click **Create hosted zone**
3. Configure:
   ```
   Domain name: example.com
   Type: Public hosted zone
   ```
4. Click **Create**

#### Step 2: Get Nameservers

After creation, note the 4 NS records:
```
ns-123.awsdns-12.com
ns-456.awsdns-45.net
ns-789.awsdns-78.org
ns-012.awsdns-01.co.uk
```

#### Step 3: Update Domain Registrar

Update nameservers at your registrar:

**GoDaddy:**
1. My Products → Domains → Manage
2. DNS → Nameservers → Change
3. Enter custom nameservers → Add all 4
4. Save

**Namecheap:**
1. Domain List → Manage
2. Nameservers → Custom DNS
3. Enter all 4 nameservers
4. Save

**Google Domains:**
1. Select domain → DNS
2. Name servers → Use custom name servers
3. Enter all 4 nameservers
4. Save

**Cloudflare:**
- Can't use Route53 if using Cloudflare proxy
- Either use Cloudflare DNS or disable proxy

#### Step 4: Wait for Propagation

- **Time:** 24-48 hours (usually faster)
- **Verify:**
  ```bash
  dig NS example.com +short
  ```
  Should show Route53 nameservers

### Troubleshooting Route53

**Nameservers not updating:**
- Wait longer (up to 48 hours)
- Verify saved at registrar
- Check for typos
- Contact registrar support

**DNS not resolving:**
- Verify SOA and NS records in hosted zone
- Flush local DNS cache:
  - Windows: `ipconfig /flushdns`
  - Mac: `sudo dscacheutil -flushcache`
  - Linux: `sudo systemd-resolve --flush-caches`

## Part 3: Post-Deployment DNS

**Complete AFTER `cdk deploy --all` finishes.**

### Get ALB DNS from CDK Output

```
Outputs:
LibreChatCdkStack.LoadBalancerDNS = LibreChat-ALB-xxxxx.us-west-2.elb.amazonaws.com
```

### Create A Record (Alias)

#### Using AWS Console:

1. **Route53** → **Hosted zones** → Select domain
2. Click **Create record**
3. Configure:
   - **Record name:** `librechat` (or leave blank for apex)
   - **Record type:** A
   - **Alias:** Toggle ON
   - **Route traffic to:**
     - Alias to Application Load Balancer
     - Region: Your deployment region
     - Load balancer: Select from dropdown
   - **Evaluate target health:** Yes
4. Click **Create records**

#### Using AWS CLI:

```bash
# Set your values
HOSTED_ZONE_ID="Z1234567890ABC"
DOMAIN_NAME="librechat.example.com"
ALB_DNS_NAME="LibreChat-ALB-xxxxx.us-west-2.elb.amazonaws.com"
ALB_ZONE_ID="Z1H1FL5HABSF5"  # us-west-2

# Create record
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

### ALB Hosted Zone IDs by Region

| Region | ALB Zone ID |
|--------|-------------|
| us-east-1 | Z35SXDOTRQ7X7K |
| us-east-2 | Z3AADJGX6KTTL2 |
| us-west-1 | Z368ELLRRE2KJ0 |
| us-west-2 | Z1H1FL5HABSF5 |
| eu-west-1 | Z32O12XQLNTSW2 |
| eu-central-1 | Z215JYRZR1TBD5 |
| ap-southeast-1 | Z1LMS91P8CMLE5 |
| ap-northeast-1 | Z14GRHDCWA56QT |

[Full list](https://docs.aws.amazon.com/general/latest/gr/elb.html)

### Using External DNS (Non-Route53)

If using GoDaddy, Namecheap, Cloudflare, etc.:

**Create CNAME Record:**
```
Type: CNAME
Name: librechat
Value: LibreChat-ALB-xxxxx.us-west-2.elb.amazonaws.com
TTL: 300 (5 minutes)
```

**Note:** CNAME doesn't work for apex domains (example.com). Use A record with IP or Route53 alias.

## Verification

### Test DNS Resolution

```bash
# Check DNS
dig librechat.example.com

# Should return ALB IP addresses
nslookup librechat.example.com
```

### Test HTTPS Connection

```bash
# Test SSL
curl -I https://librechat.example.com

# Should return HTTP/2 200 or 302
# No certificate errors
```

### Browser Test

Open: `https://librechat.example.com`

Should show:
- ✅ Padlock icon (secure connection)
- ✅ Valid certificate
- ✅ LibreChat interface

## Security Best Practices

### Certificate Management

- ACM auto-renews 60 days before expiration
- Set up CloudWatch alarm for expiration
- Monitor renewal in ACM console

### DNS Security

- Enable DNSSEC for Route53 (optional)
- Use Route53 query logging
- Restrict IAM permissions for DNS changes
- Enable CloudTrail for audit logs

### SSL/TLS Configuration

- ALB uses AWS security policy (TLS 1.2+)
- Strong encryption ciphers enabled
- Perfect forward secrecy supported

## Cost Considerations

### ACM Certificates
- ✅ **FREE** for AWS resources (ALB, CloudFront)
- No charge for issuance or renewal

### Route53
- **Hosted Zone:** $0.50/month
- **DNS Queries:** $0.40 per million queries
- **Alias Queries:** FREE for AWS resources
- **Typical Cost:** $0.50-2.00/month

## Validation Checklist

Before deployment:
- [ ] ACM certificate status is "Issued"
- [ ] Certificate in same region as deployment
- [ ] Certificate domain matches config domain
- [ ] Certificate ARN copied correctly
- [ ] Route53 hosted zone exists (if using)
- [ ] Nameservers updated (if using Route53)

After deployment:
- [ ] CDK deployment successful
- [ ] LoadBalancerDNS copied from output
- [ ] Route53 A record created
- [ ] DNS resolves to ALB
- [ ] HTTPS works without errors
- [ ] Application accessible

## Additional Resources

- [AWS ACM Documentation](https://docs.aws.amazon.com/acm/)
- [AWS Route53 Documentation](https://docs.aws.amazon.com/route53/)
- [ACM Validation Guide](https://docs.aws.amazon.com/acm/latest/userguide/domain-ownership-validation.html)
- [Route53 Alias Records](https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/resource-record-sets-choosing-alias-non-alias.html)
