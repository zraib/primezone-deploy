# AWS Amplify IAM Role Troubleshooting Guide

## 🚨 Error: Unable to Assume Specified IAM Role

**Error Message:**
```
!!! Unable to assume specified IAM Role. Please ensure the selected IAM Role has sufficient permissions and the Trust Relationship is configured correctly.
```

## 🔍 Root Cause Analysis

This error occurs when:
1. **Missing IAM Role**: No service role is configured for Amplify
2. **Insufficient Permissions**: The IAM role lacks required permissions
3. **Trust Relationship Issues**: The role cannot be assumed by Amplify service
4. **Region Mismatch**: Role and Amplify app are in different regions
5. **Account Permissions**: Your AWS account lacks permission to create/use the role

## 🛠️ Solution Steps

### Step 1: Create Amplify Service Role

#### Option A: Using AWS Console (Recommended)

1. **Navigate to IAM Console**
   ```
   https://console.aws.amazon.com/iam/
   ```

2. **Create New Role**
   - Click "Roles" → "Create role"
   - Select "AWS service"
   - Choose "Amplify" from the service list
   - Click "Next: Permissions"

3. **Attach Required Policies**
   ```json
   {
     "Required Policies": [
       "AdministratorAccess-Amplify",
       "AmazonS3FullAccess",
       "CloudWatchLogsFullAccess",
       "AWSCloudFormationFullAccess"
     ]
   }
   ```

4. **Name the Role**
   - Role name: `AmplifyServiceRole-PanoramaViewer`
   - Description: "Service role for Panorama Viewer Amplify deployment"

#### Option B: Using AWS CLI

```bash
# Create trust policy document
cat > amplify-trust-policy.json << EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Service": "amplify.amazonaws.com"
      },
      "Action": "sts:AssumeRole"
    }
  ]
}
EOF

# Create the role
aws iam create-role \
  --role-name AmplifyServiceRole-PanoramaViewer \
  --assume-role-policy-document file://amplify-trust-policy.json

# Attach required policies
aws iam attach-role-policy \
  --role-name AmplifyServiceRole-PanoramaViewer \
  --policy-arn arn:aws:iam::aws:policy/AdministratorAccess-Amplify

aws iam attach-role-policy \
  --role-name AmplifyServiceRole-PanoramaViewer \
  --policy-arn arn:aws:iam::aws:policy/AmazonS3FullAccess

aws iam attach-role-policy \
  --role-name AmplifyServiceRole-PanoramaViewer \
  --policy-arn arn:aws:iam::aws:policy/CloudWatchLogsFullAccess
```

### Step 2: Configure Amplify to Use the Role

#### Method 1: Amplify Console

1. **Open Amplify Console**
   ```
   https://console.aws.amazon.com/amplify/
   ```

2. **Select Your App**
   - Find your Panorama Viewer app
   - Click on the app name

3. **Configure Service Role**
   - Go to "App settings" → "General"
   - Scroll to "App details"
   - Click "Edit" next to "Service role"
   - Select `AmplifyServiceRole-PanoramaViewer`
   - Click "Save"

#### Method 2: Amplify CLI

```bash
# Update Amplify app with service role
aws amplify update-app \
  --app-id YOUR_APP_ID \
  --iam-service-role arn:aws:iam::YOUR_ACCOUNT_ID:role/AmplifyServiceRole-PanoramaViewer
```

### Step 3: Custom IAM Policy for S3 Storage

Create a custom policy for enhanced S3 permissions:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:GetObject",
        "s3:PutObject",
        "s3:DeleteObject",
        "s3:ListBucket",
        "s3:GetBucketLocation",
        "s3:GetBucketCors",
        "s3:PutBucketCors",
        "s3:GetBucketPolicy",
        "s3:PutBucketPolicy",
        "s3:GetBucketAcl",
        "s3:PutBucketAcl"
      ],
      "Resource": [
        "arn:aws:s3:::panorama-viewer-storage*",
        "arn:aws:s3:::panorama-viewer-storage*/*"
      ]
    },
    {
      "Effect": "Allow",
      "Action": [
        "cognito-identity:*",
        "cognito-idp:*"
      ],
      "Resource": "*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "cloudformation:CreateStack",
        "cloudformation:UpdateStack",
        "cloudformation:DeleteStack",
        "cloudformation:DescribeStacks",
        "cloudformation:DescribeStackEvents",
        "cloudformation:DescribeStackResources",
        "cloudformation:GetTemplate"
      ],
      "Resource": "arn:aws:cloudformation:*:*:stack/amplify-*"
    }
  ]
}
```

## 🔧 Alternative Solutions

### Solution 1: Use Amplify CLI with Admin Privileges

```bash
# Reconfigure Amplify with admin access
amplify configure

# Reinitialize the project
amplify init --yes

# Push with force flag
amplify push --yes
```

### Solution 2: Manual CloudFormation Deployment

```bash
# Deploy backend manually
aws cloudformation deploy \
  --template-file amplify/backend/awscloudformation/nested-cloudformation-stack.yml \
  --stack-name amplify-panoramaviewer-dev \
  --capabilities CAPABILITY_IAM CAPABILITY_NAMED_IAM
```

### Solution 3: Simplified Permissions Approach

If you're having trouble with complex permissions, start with basic access:

```bash
# Create minimal role
aws iam create-role \
  --role-name AmplifyBasicRole \
  --assume-role-policy-document '{
    "Version": "2012-10-17",
    "Statement": [{
      "Effect": "Allow",
      "Principal": {"Service": "amplify.amazonaws.com"},
      "Action": "sts:AssumeRole"
    }]
  }'

# Attach basic Amplify policy
aws iam attach-role-policy \
  --role-name AmplifyBasicRole \
  --policy-arn arn:aws:iam::aws:policy/AdministratorAccess-Amplify
```

## 🔍 Verification Steps

### 1. Verify Role Creation

```bash
# Check if role exists
aws iam get-role --role-name AmplifyServiceRole-PanoramaViewer

# List attached policies
aws iam list-attached-role-policies --role-name AmplifyServiceRole-PanoramaViewer
```

### 2. Test Role Assumption

```bash
# Test if Amplify can assume the role
aws sts assume-role \
  --role-arn arn:aws:iam::YOUR_ACCOUNT_ID:role/AmplifyServiceRole-PanoramaViewer \
  --role-session-name test-session
```

### 3. Verify Amplify Configuration

```bash
# Check Amplify app configuration
aws amplify get-app --app-id YOUR_APP_ID

# Verify backend environment
amplify status
```

## 🚨 Common Issues & Fixes

### Issue 1: "Access Denied" Error

**Cause**: Insufficient permissions on your AWS account

**Fix**:
```bash
# Ensure your AWS user has IAM permissions
aws iam attach-user-policy \
  --user-name YOUR_USERNAME \
  --policy-arn arn:aws:iam::aws:policy/IAMFullAccess
```

### Issue 2: "Role Already Exists" Error

**Cause**: Role name conflict

**Fix**:
```bash
# Use a unique role name
aws iam create-role \
  --role-name AmplifyServiceRole-PanoramaViewer-$(date +%s) \
  --assume-role-policy-document file://trust-policy.json
```

### Issue 3: "Invalid Trust Relationship" Error

**Cause**: Incorrect trust policy

**Fix**:
```bash
# Update trust relationship
aws iam update-assume-role-policy \
  --role-name AmplifyServiceRole-PanoramaViewer \
  --policy-document '{
    "Version": "2012-10-17",
    "Statement": [{
      "Effect": "Allow",
      "Principal": {"Service": "amplify.amazonaws.com"},
      "Action": "sts:AssumeRole"
    }]
  }'
```

### Issue 4: Region Mismatch

**Cause**: Role and Amplify app in different regions

**Fix**:
```bash
# Check current region
aws configure get region

# Set correct region
aws configure set region us-east-1

# Recreate role in correct region
amplify init
```

## 📋 Quick Fix Checklist

- [ ] **AWS Account Setup**
  - [ ] AWS CLI configured with correct credentials
  - [ ] User has IAM permissions
  - [ ] Correct region selected

- [ ] **IAM Role Configuration**
  - [ ] Service role created for Amplify
  - [ ] Trust relationship configured correctly
  - [ ] Required policies attached
  - [ ] Role ARN noted for reference

- [ ] **Amplify Configuration**
  - [ ] Service role assigned to Amplify app
  - [ ] Backend environment initialized
  - [ ] Environment variables configured

- [ ] **Verification**
  - [ ] Role assumption test successful
  - [ ] Amplify status shows no errors
  - [ ] Deployment proceeds without IAM errors

## 🔄 Complete Reset Procedure

If all else fails, perform a complete reset:

```bash
# 1. Delete existing Amplify app
amplify delete

# 2. Remove local Amplify configuration
rm -rf amplify/.config
rm -rf amplify/#current-cloud-backend

# 3. Reconfigure AWS credentials
aws configure

# 4. Reinitialize Amplify
amplify init

# 5. Add storage with proper permissions
amplify add storage

# 6. Deploy with new configuration
amplify push
```

## 📞 Additional Resources

- **AWS Amplify IAM Documentation**: https://docs.amplify.aws/cli/usage/iam/
- **AWS IAM Best Practices**: https://docs.aws.amazon.com/IAM/latest/UserGuide/best-practices.html
- **Amplify Service Role Guide**: https://docs.amplify.aws/cli/usage/service-role/
- **CloudFormation Troubleshooting**: https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/troubleshooting.html

## 🎯 Success Indicators

You'll know the issue is resolved when:

1. ✅ `amplify status` shows all resources as "No Change"
2. ✅ `amplify push` completes without IAM errors
3. ✅ S3 bucket is created and accessible
4. ✅ Amplify Console shows successful deployment
5. ✅ Application loads without authentication errors

---

**Last Updated**: December 2024  
**Tested With**: AWS Amplify CLI v12.x, AWS CLI v2.x