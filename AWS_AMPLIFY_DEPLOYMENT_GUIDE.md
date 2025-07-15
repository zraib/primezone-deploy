# AWS Amplify Deployment Guide for Panorama Viewer

This guide provides comprehensive step-by-step instructions for deploying the Panorama Viewer application to AWS Amplify with S3 storage for file uploads.

## Prerequisites

1. **AWS Account**: You need an active AWS account
2. **AWS CLI**: Install and configure AWS CLI
3. **Amplify CLI**: Install Amplify CLI globally
4. **Node.js**: Version 18 or higher
5. **Git**: For version control

## Step 1: Install Required Tools

### Install AWS CLI
```bash
# Windows (using PowerShell)
Invoke-WebRequest -Uri "https://awscli.amazonaws.com/AWSCLIV2.msi" -Outfile "AWSCLIV2.msi"
Start-Process msiexec.exe -Wait -ArgumentList '/I AWSCLIV2.msi /quiet'

# macOS
brew install awscli

# Linux
curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
unzip awscliv2.zip
sudo ./aws/install
```

### Install Amplify CLI
```bash
npm install -g @aws-amplify/cli
```

## Step 2: Configure AWS Credentials

### Configure AWS CLI
```bash
aws configure
```
Enter your:
- AWS Access Key ID
- AWS Secret Access Key
- Default region (e.g., us-east-1)
- Default output format (json)

### Configure Amplify CLI
```bash
amplify configure
```
This will:
1. Open AWS Console in browser
2. Guide you through creating an IAM user
3. Set up local Amplify configuration

## Step 3: Initialize Amplify Project

Navigate to your project directory and initialize Amplify:

```bash
cd Panor-viewer
amplify init
```

Answer the prompts:
- **Project name**: `panoramaviewer`
- **Environment name**: `dev`
- **Default editor**: Choose your preferred editor
- **App type**: `javascript`
- **Framework**: `react`
- **Source directory**: `src`
- **Distribution directory**: `.next`
- **Build command**: `npm run build`
- **Start command**: `npm run start`
- **Use AWS profile**: Yes (select the profile you configured)

## Step 4: Add Storage (S3) to Amplify

```bash
amplify add storage
```

Choose:
- **Service**: `Content (Images, audio, video, etc.)`
- **Resource name**: `panoramaStorage`
- **Bucket name**: `panorama-viewer-storage` (will be suffixed with environment)
- **Access**: `Auth and guest users`
- **Authenticated users access**: `create/update, read, delete`
- **Guest users access**: `create/update, read, delete`

## Step 5: Configure Environment Variables

Create a `.env.local` file in your project root:

```bash
cp .env.example .env.local
```

Update the values in `.env.local`:
```env
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your_access_key_here
AWS_SECRET_ACCESS_KEY=your_secret_key_here
AWS_S3_BUCKET_NAME=panorama-viewer-storage-dev

NEXT_PUBLIC_AWS_REGION=us-east-1
NEXT_PUBLIC_AWS_S3_BUCKET_NAME=panorama-viewer-storage-dev

NODE_ENV=production
```

## Step 6: Deploy Backend Resources

```bash
amplify push
```

This will:
1. Create S3 bucket
2. Set up IAM roles and policies
3. Configure CORS for the bucket
4. Generate `aws-exports.js` file

## Step 7: Update Application Code

### Initialize Amplify in your app

Update `src/pages/_app.tsx`:

```typescript
import { Amplify } from 'aws-amplify';
import awsExports from '../aws-exports';

Amplify.configure(awsExports);

// Rest of your _app.tsx code
```

### Update Upload Components

Modify your upload logic to use the new S3 API endpoints:
- Replace `/api/projects/[projectId]/upload` with `/api/projects/[projectId]/upload-s3`
- Replace `/api/poi/upload` with `/api/poi/upload-s3`

## Step 8: Set Up Amplify Hosting

### Option A: Using Amplify Console (Recommended)

1. Go to [AWS Amplify Console](https://console.aws.amazon.com/amplify/)
2. Click "New app" → "Host web app"
3. Connect your Git repository (GitHub, GitLab, etc.)
4. Configure build settings:
   ```yaml
   version: 1
   frontend:
     phases:
       preBuild:
         commands:
           - npm ci
       build:
         commands:
           - npm run build
     artifacts:
       baseDirectory: .next
       files:
         - '**/*'
     cache:
       paths:
         - node_modules/**/*
         - .next/cache/**/*
   ```
5. Add environment variables in Amplify Console:
   - `AWS_REGION`
   - `AWS_S3_BUCKET_NAME`
   - `NEXT_PUBLIC_AWS_REGION`
   - `NEXT_PUBLIC_AWS_S3_BUCKET_NAME`

### Option B: Manual Deployment

```bash
# Build the application
npm run build

# Deploy to Amplify hosting
amplify add hosting
# Choose: Amazon CloudFront and S3

amplify publish
```

## Step 9: Configure S3 Bucket Permissions

### Update Bucket Policy

Go to S3 Console and update your bucket policy:

```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Sid": "PublicReadGetObject",
            "Effect": "Allow",
            "Principal": "*",
            "Action": "s3:GetObject",
            "Resource": "arn:aws:s3:::your-bucket-name/*"
        },
        {
            "Sid": "AllowAmplifyAppAccess",
            "Effect": "Allow",
            "Principal": {
                "AWS": "arn:aws:iam::YOUR-ACCOUNT-ID:role/amplify-*"
            },
            "Action": [
                "s3:GetObject",
                "s3:PutObject",
                "s3:DeleteObject"
            ],
            "Resource": "arn:aws:s3:::your-bucket-name/*"
        }
    ]
}
```

### Configure CORS

Update CORS configuration in S3:

```json
[
    {
        "AllowedHeaders": ["*"],
        "AllowedMethods": ["GET", "HEAD", "PUT", "POST", "DELETE"],
        "AllowedOrigins": ["*"],
        "ExposeHeaders": [
            "x-amz-server-side-encryption",
            "x-amz-request-id",
            "x-amz-id-2",
            "ETag"
        ],
        "MaxAgeSeconds": 3000
    }
]
```

## Step 10: Set Up IAM Roles and Policies

### Create IAM Policy for S3 Access

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
                "s3:ListBucket"
            ],
            "Resource": [
                "arn:aws:s3:::your-bucket-name",
                "arn:aws:s3:::your-bucket-name/*"
            ]
        }
    ]
}
```

### Attach Policy to Amplify Service Role

1. Go to IAM Console
2. Find the Amplify service role (usually named `amplify-*`)
3. Attach the S3 policy created above

## Step 11: Configure File Upload Limits

### API Gateway Limits (if using)

If you're using API Gateway, configure:
- Maximum payload size: 10MB
- Timeout: 30 seconds

### Lambda Function Limits (if using)

- Memory: 1024MB or higher
- Timeout: 30 seconds
- Environment variables for AWS credentials

## Step 12: Testing and Validation

### Test File Uploads

1. **Panorama Images**: Upload large panorama images (up to 100MB)
2. **CSV Files**: Upload panorama pose data
3. **POI Assets**: Upload images, PDFs, and videos for POI attachments

### Verify S3 Storage

1. Check S3 bucket for uploaded files
2. Verify file structure: `projects/{projectId}/{fileType}/filename`
3. Test file access via public URLs

### Monitor Performance

1. Check CloudWatch logs for errors
2. Monitor S3 request metrics
3. Test application performance

## Step 13: Production Optimizations

### Enable CloudFront CDN

1. Set up CloudFront distribution for S3 bucket
2. Configure caching policies
3. Update application to use CloudFront URLs

### Set up Monitoring

1. Enable CloudWatch monitoring
2. Set up alerts for errors and performance
3. Configure log aggregation

### Security Enhancements

1. Enable S3 bucket encryption
2. Set up VPC endpoints if needed
3. Configure WAF rules for additional security

## Troubleshooting

### Common Issues

1. **CORS Errors**: Check S3 CORS configuration
2. **Permission Denied**: Verify IAM roles and policies
3. **File Upload Failures**: Check file size limits and network connectivity
4. **Build Failures**: Verify environment variables and dependencies

### Debug Commands

```bash
# Check Amplify status
amplify status

# View CloudFormation stack
amplify console

# Check logs
amplify console api

# Reset environment
amplify env remove dev
amplify env add dev
```

## Cost Optimization

1. **S3 Storage Classes**: Use appropriate storage classes for different file types
2. **Lifecycle Policies**: Set up automatic deletion of old files
3. **CloudFront**: Reduce S3 request costs with CDN caching
4. **Monitoring**: Set up billing alerts

## Security Best Practices

1. **Least Privilege**: Grant minimum required permissions
2. **Encryption**: Enable encryption at rest and in transit
3. **Access Logging**: Enable S3 access logging
4. **Regular Audits**: Review permissions and access patterns

## Maintenance

1. **Regular Updates**: Keep Amplify CLI and dependencies updated
2. **Backup**: Set up automated backups for critical data
3. **Monitoring**: Regular health checks and performance monitoring
4. **Documentation**: Keep deployment documentation updated

---

## Quick Reference Commands

```bash
# Initialize project
amplify init

# Add storage
amplify add storage

# Deploy changes
amplify push

# Add hosting
amplify add hosting

# Publish app
amplify publish

# Check status
amplify status

# Open console
amplify console

# Delete project
amplify delete
```

This guide should help you successfully deploy your Panorama Viewer application to AWS Amplify with full S3 integration for file uploads.