# Panorama Viewer - AWS Amplify Deployment

This document provides a comprehensive guide for deploying the Panorama Viewer application to AWS Amplify with S3 storage integration.

## 🚀 Quick Start

### Prerequisites
- AWS Account with appropriate permissions
- Node.js 18+ installed
- Git repository (GitHub, GitLab, etc.)

### 1. Install Dependencies
```bash
npm install
```

### 2. Install AWS Tools
```bash
# Install AWS CLI
# Windows: Download from https://aws.amazon.com/cli/
# macOS: brew install awscli
# Linux: See AWS documentation

# Install Amplify CLI
npm install -g @aws-amplify/cli
```

### 3. Configure AWS
```bash
# Configure AWS credentials
aws configure

# Configure Amplify
amplify configure
```

### 4. Initialize Amplify Project
```bash
amplify init
```

### 5. Add S3 Storage
```bash
amplify add storage
```

### 6. Deploy Backend
```bash
amplify push
```

### 7. Deploy Frontend
```bash
amplify add hosting
amplify publish
```

## 📁 Project Structure

```
Panor-viewer/
├── amplify/                     # Amplify configuration
│   ├── backend/
│   │   ├── backend-config.json
│   │   └── storage/
│   │       └── panoramaStorage/
│   ├── .config/
│   └── team-provider-info.json
├── src/
│   ├── lib/
│   │   ├── aws-s3.ts            # S3 service utilities
│   │   ├── storage-config.ts    # Storage configuration
│   │   └── s3-migration.ts      # Migration utilities
│   ├── pages/api/
│   │   ├── projects/[projectId]/
│   │   │   ├── upload.ts        # Local upload (legacy)
│   │   │   └── upload-s3.ts     # S3 upload (new)
│   │   ├── poi/
│   │   │   ├── upload.ts        # Local POI upload (legacy)
│   │   │   └── upload-s3.ts     # S3 POI upload (new)
│   │   ├── files/
│   │   │   ├── [...path].ts     # Local file serving
│   │   │   └── s3/[...path].ts  # S3 file serving
│   │   ├── migrate-to-s3.ts     # Migration API
│   │   └── storage-config.ts    # Storage config API
│   └── aws-exports.js           # Amplify configuration
├── .env.example                 # Environment variables template
├── amplify.yml                  # Amplify build configuration
└── AWS_AMPLIFY_DEPLOYMENT_GUIDE.md
```

## 🔧 Configuration

### Environment Variables

Create `.env.local` file:
```env
# AWS Configuration
S3_REGION=us-east-1
S3_ACCESS_KEY_ID=your_access_key
S3_SECRET_ACCESS_KEY=your_secret_key
S3_BUCKET_NAME=panorama-viewer-storage-dev

# Public Configuration
NEXT_PUBLIC_S3_REGION=us-east-1
NEXT_PUBLIC_S3_BUCKET_NAME=panorama-viewer-storage-dev

# Optional
NEXT_PUBLIC_S3_CUSTOM_DOMAIN=cdn.yourdomain.com
NODE_ENV=production
```

### Amplify Console Environment Variables

In AWS Amplify Console, add these environment variables:
- `S3_REGION`
- `S3_BUCKET_NAME`
- `NEXT_PUBLIC_S3_REGION`
- `NEXT_PUBLIC_S3_BUCKET_NAME`
- `NODE_ENV=production`

## 📦 File Upload Architecture

### Storage Modes

The application supports two storage modes:

1. **Local Storage** (Development)
   - Files stored in `public/` directory
   - Served via Next.js API routes
   - Suitable for development and testing

2. **S3 Storage** (Production)
   - Files stored in AWS S3 bucket
   - Direct S3 URLs or signed URLs
   - Scalable and production-ready

### File Types Supported

1. **Panorama Images**
   - Formats: JPG, JPEG, PNG
   - Size limit: 100MB per file
   - Storage path: `projects/{projectId}/images/`

2. **CSV Files**
   - Panorama pose data
   - Size limit: 10MB
   - Storage path: `projects/{projectId}/csv/`

3. **POI Assets**
   - Images: JPG, PNG, GIF
   - Documents: PDF
   - Videos: MP4, WebM
   - Size limit: 10MB per file
   - Storage path: `projects/{projectId}/poi/`

## 🔄 Migration from Local to S3

### Automatic Migration

The application includes migration utilities to move existing local files to S3:

```bash
# Get available projects for migration
curl -X POST /api/migrate-to-s3

# Migrate specific project
curl -X POST /api/migrate-to-s3 \
  -H "Content-Type: application/json" \
  -d '{"projectId": "your-project-id", "cleanup": true}'
```

### Manual Migration

1. **Identify Local Projects**
   ```bash
   ls public/
   ```

2. **Use Migration API**
   - Call `/api/migrate-to-s3` for each project
   - Monitor migration progress
   - Verify files in S3 bucket

3. **Update Application Configuration**
   - Set environment variables for S3
   - Deploy updated configuration

## 🛡️ Security Configuration

### S3 Bucket Policy

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
            "Sid": "AmplifyAppAccess",
            "Effect": "Allow",
            "Principal": {
                "AWS": "arn:aws:iam::ACCOUNT-ID:role/amplify-*"
            },
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

### CORS Configuration

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

### IAM Permissions

Required IAM permissions for Amplify service role:

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
                "s3:PutBucketCors"
            ],
            "Resource": [
                "arn:aws:s3:::panorama-viewer-storage-*",
                "arn:aws:s3:::panorama-viewer-storage-*/*"
            ]
        }
    ]
}
```

## 🚀 Deployment Process

### Development Deployment

1. **Local Development**
   ```bash
   npm run dev
   ```

2. **Test S3 Integration**
   ```bash
   # Set environment variables
   export S3_REGION=us-east-1
   export S3_BUCKET_NAME=your-test-bucket
   
   # Test upload
   npm run dev
   ```

### Production Deployment

1. **Build Application**
   ```bash
   npm run build
   ```

2. **Deploy to Amplify**
   ```bash
   amplify publish
   ```

3. **Verify Deployment**
   - Test file uploads
   - Check S3 bucket contents
   - Monitor CloudWatch logs

## 📊 Monitoring and Logging

### CloudWatch Logs

- **Application Logs**: `/aws/lambda/amplify-*`
- **S3 Access Logs**: Configure in S3 bucket settings
- **API Gateway Logs**: If using custom API

### Metrics to Monitor

1. **Upload Success Rate**
2. **File Storage Usage**
3. **API Response Times**
4. **Error Rates**
5. **S3 Request Costs**

### Alerts

Set up CloudWatch alerts for:
- High error rates
- Unusual upload volumes
- Storage quota approaching limits
- Cost thresholds

## 💰 Cost Optimization

### S3 Storage Classes

- **Standard**: For frequently accessed files
- **Standard-IA**: For infrequently accessed files
- **Glacier**: For archival storage

### Lifecycle Policies

```json
{
    "Rules": [
        {
            "ID": "PanoramaLifecycle",
            "Status": "Enabled",
            "Filter": {
                "Prefix": "projects/"
            },
            "Transitions": [
                {
                    "Days": 30,
                    "StorageClass": "STANDARD_IA"
                },
                {
                    "Days": 90,
                    "StorageClass": "GLACIER"
                }
            ]
        }
    ]
}
```

### CDN Integration

Set up CloudFront for:
- Reduced S3 request costs
- Improved global performance
- Custom domain support

## 🔧 Troubleshooting

### Common Issues

1. **CORS Errors**
   - Check S3 CORS configuration
   - Verify allowed origins
   - Check browser console for details

2. **Permission Denied**
   - Verify IAM roles and policies
   - Check S3 bucket policy
   - Ensure Amplify service role has correct permissions

3. **File Upload Failures**
   - Check file size limits
   - Verify network connectivity
   - Monitor CloudWatch logs

4. **Build Failures**
   - Verify environment variables
   - Check dependency versions
   - Review build logs in Amplify Console

### Debug Commands

```bash
# Check Amplify status
amplify status

# View logs
amplify console

# Test S3 connectivity
aws s3 ls s3://your-bucket-name

# Validate configuration
curl /api/storage-config
```

### Support Resources

- [AWS Amplify Documentation](https://docs.amplify.aws/)
- [AWS S3 Documentation](https://docs.aws.amazon.com/s3/)
- [Next.js Deployment Guide](https://nextjs.org/docs/deployment)
- [AWS Support](https://aws.amazon.com/support/)

## 📝 Maintenance

### Regular Tasks

1. **Update Dependencies**
   ```bash
   npm update
   amplify update
   ```

2. **Monitor Storage Usage**
   - Review S3 storage metrics
   - Clean up unused files
   - Optimize storage classes

3. **Security Updates**
   - Review IAM permissions
   - Update access keys
   - Monitor access logs

4. **Performance Optimization**
   - Analyze upload patterns
   - Optimize file sizes
   - Review CDN performance

### Backup Strategy

1. **S3 Cross-Region Replication**
2. **Database Backups** (if applicable)
3. **Configuration Backups**
4. **Code Repository Backups**

---

## 📞 Support

For deployment issues or questions:

1. Check this documentation
2. Review AWS Amplify logs
3. Consult AWS documentation
4. Contact your AWS support team

---

**Last Updated**: December 2024
**Version**: 1.0.0