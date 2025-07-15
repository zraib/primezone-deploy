# AWS Amplify Deployment Checklist

Use this checklist to ensure a successful deployment of the Panorama Viewer application to AWS Amplify.

## 📋 Pre-Deployment Checklist

### ✅ Prerequisites
- [ ] AWS Account with appropriate permissions
- [ ] AWS CLI installed and configured
- [ ] Amplify CLI installed (`npm install -g @aws-amplify/cli`)
- [ ] Node.js 18+ installed
- [ ] Git repository set up (GitHub, GitLab, etc.)
- [ ] Project dependencies installed (`npm install`)

### ✅ AWS Configuration
- [ ] AWS credentials configured (`aws configure`)
- [ ] Amplify CLI configured (`amplify configure`)
- [ ] IAM user has necessary permissions:
  - [ ] S3 full access
  - [ ] CloudFormation access
  - [ ] IAM role creation
  - [ ] Amplify service access

### ✅ Environment Setup
- [ ] `.env.local` file created from `.env.example`
- [ ] AWS region specified (e.g., `us-east-1`)
- [ ] S3 bucket name chosen (unique globally)
- [ ] Environment variables validated

## 🚀 Deployment Steps

### ✅ Step 1: Initialize Amplify Project
- [ ] Run `amplify init`
- [ ] Project name: `panoramaviewer`
- [ ] Environment name: `dev` (or `prod`)
- [ ] Framework: `react`
- [ ] Source directory: `src`
- [ ] Distribution directory: `.next`
- [ ] Build command: `npm run build`
- [ ] Start command: `npm run start`
- [ ] AWS profile selected

### ✅ Step 2: Add S3 Storage
- [ ] Run `amplify add storage`
- [ ] Service: `Content (Images, audio, video, etc.)`
- [ ] Resource name: `panoramaStorage`
- [ ] Bucket name: `panorama-viewer-storage`
- [ ] Access: `Auth and guest users`
- [ ] Authenticated users: `create/update, read, delete`
- [ ] Guest users: `create/update, read, delete`

### ✅ Step 3: Deploy Backend
- [ ] Run `amplify push`
- [ ] Review resource changes
- [ ] Confirm deployment
- [ ] Wait for CloudFormation stack creation
- [ ] Verify `aws-exports.js` is generated

### ✅ Step 4: Configure S3 Bucket
- [ ] Navigate to S3 Console
- [ ] Find created bucket (e.g., `panorama-viewer-storage-dev-xxxxx`)
- [ ] Configure bucket policy for public read access
- [ ] Set up CORS configuration
- [ ] Enable public access settings if needed
- [ ] Test bucket accessibility

### ✅ Step 5: Set Up Hosting
- [ ] Choose hosting method:
  - [ ] **Option A**: Amplify Console (Recommended)
    - [ ] Connect Git repository
    - [ ] Configure build settings
    - [ ] Add environment variables
    - [ ] Deploy automatically
  - [ ] **Option B**: Manual hosting
    - [ ] Run `amplify add hosting`
    - [ ] Choose CloudFront and S3
    - [ ] Run `amplify publish`

### ✅ Step 6: Environment Variables (Amplify Console)
- [ ] Add in Amplify Console → App Settings → Environment Variables:
  - [ ] `S3_REGION`
  - [ ] `S3_BUCKET_NAME`
  - [ ] `NEXT_PUBLIC_S3_REGION`
  - [ ] `NEXT_PUBLIC_S3_BUCKET_NAME`
  - [ ] `NODE_ENV=production`

## 🔧 Post-Deployment Configuration

### ✅ Security Configuration
- [ ] S3 bucket policy configured
- [ ] CORS settings applied
- [ ] IAM roles and policies verified
- [ ] Public access settings reviewed
- [ ] Encryption at rest enabled (optional)

### ✅ Performance Optimization
- [ ] CloudFront CDN configured (optional)
- [ ] S3 lifecycle policies set up
- [ ] Image optimization configured
- [ ] Caching headers set

### ✅ Monitoring Setup
- [ ] CloudWatch logs enabled
- [ ] Error monitoring configured
- [ ] Performance metrics tracked
- [ ] Cost alerts set up
- [ ] Backup strategy implemented

## 🧪 Testing Checklist

### ✅ Functionality Testing
- [ ] **File Upload Testing**:
  - [ ] Panorama images upload (various sizes)
  - [ ] CSV files upload
  - [ ] POI assets upload (images, PDFs, videos)
  - [ ] Large file uploads (up to limits)
  - [ ] Multiple file uploads
  - [ ] Duplicate file handling

- [ ] **File Access Testing**:
  - [ ] Uploaded files accessible via URLs
  - [ ] File serving works correctly
  - [ ] Image display in application
  - [ ] POI attachments downloadable

- [ ] **Application Features**:
  - [ ] Project creation
  - [ ] Panorama viewing
  - [ ] POI management
  - [ ] Navigation between scenes
  - [ ] Mobile responsiveness

### ✅ Performance Testing
- [ ] Page load times acceptable
- [ ] File upload speeds reasonable
- [ ] Image loading performance
- [ ] Application responsiveness
- [ ] Memory usage within limits

### ✅ Error Handling Testing
- [ ] Network connectivity issues
- [ ] File size limit exceeded
- [ ] Invalid file types
- [ ] Server errors handled gracefully
- [ ] User feedback provided

## 🔍 Verification Steps

### ✅ AWS Resources
- [ ] S3 bucket created and configured
- [ ] CloudFormation stacks deployed successfully
- [ ] IAM roles and policies in place
- [ ] Amplify app deployed and running
- [ ] Domain/URL accessible

### ✅ Application Health
- [ ] Homepage loads correctly
- [ ] Upload functionality works
- [ ] File storage in S3 verified
- [ ] No console errors
- [ ] API endpoints responding

### ✅ Storage Configuration
- [ ] Files stored in correct S3 paths:
  - [ ] `projects/{projectId}/images/`
  - [ ] `projects/{projectId}/csv/`
  - [ ] `projects/{projectId}/poi/`
- [ ] File permissions correct
- [ ] Public access working
- [ ] Storage mode detection working

## 🚨 Troubleshooting Checklist

### ✅ Common Issues Resolution
- [ ] **CORS Errors**:
  - [ ] S3 CORS configuration checked
  - [ ] Allowed origins verified
  - [ ] Browser cache cleared

- [ ] **Permission Denied**:
  - [ ] IAM policies reviewed
  - [ ] S3 bucket policy checked
  - [ ] Service role permissions verified

- [ ] **Upload Failures**:
  - [ ] File size limits checked
  - [ ] Network connectivity tested
  - [ ] CloudWatch logs reviewed

- [ ] **Build Failures**:
  - [ ] Environment variables verified
  - [ ] Dependencies updated
  - [ ] Build logs analyzed

### ✅ Debug Tools Used
- [ ] `amplify status` - Check resource status
- [ ] `amplify console` - Open AWS console
- [ ] Browser developer tools
- [ ] CloudWatch logs
- [ ] S3 bucket contents verified

## 📊 Go-Live Checklist

### ✅ Final Verification
- [ ] All tests passing
- [ ] Performance acceptable
- [ ] Security configured
- [ ] Monitoring in place
- [ ] Backup strategy active
- [ ] Documentation updated

### ✅ Launch Preparation
- [ ] DNS configured (if custom domain)
- [ ] SSL certificate installed
- [ ] CDN configured
- [ ] Cache settings optimized
- [ ] Error pages customized

### ✅ Post-Launch
- [ ] Monitor application health
- [ ] Check error rates
- [ ] Verify file uploads working
- [ ] Monitor costs
- [ ] User feedback collected

## 📝 Documentation

### ✅ Required Documentation
- [ ] Deployment guide updated
- [ ] Environment variables documented
- [ ] API endpoints documented
- [ ] Troubleshooting guide available
- [ ] Maintenance procedures documented

### ✅ Team Knowledge Transfer
- [ ] Deployment process shared
- [ ] AWS access provided to team
- [ ] Monitoring dashboards shared
- [ ] Support procedures established

## 🔄 Migration Checklist (If Applicable)

### ✅ Local to S3 Migration
- [ ] Existing local projects identified
- [ ] Migration API tested
- [ ] Backup of local files created
- [ ] Migration executed successfully
- [ ] Files verified in S3
- [ ] Local files cleaned up
- [ ] Application updated to use S3

## ✅ Final Sign-off

- [ ] **Technical Lead Approval**: _________________ Date: _______
- [ ] **DevOps Approval**: _________________ Date: _______
- [ ] **Security Review**: _________________ Date: _______
- [ ] **Performance Review**: _________________ Date: _______
- [ ] **Go-Live Approval**: _________________ Date: _______

---

## 📞 Emergency Contacts

- **AWS Support**: [Your AWS Support Plan]
- **Technical Lead**: [Contact Information]
- **DevOps Team**: [Contact Information]
- **On-Call Engineer**: [Contact Information]

---

## 📚 Reference Links

- [AWS Amplify Documentation](https://docs.amplify.aws/)
- [AWS S3 Documentation](https://docs.aws.amazon.com/s3/)
- [Project Deployment Guide](./AWS_AMPLIFY_DEPLOYMENT_GUIDE.md)
- [Project README](./README_AWS_DEPLOYMENT.md)

---

**Deployment Date**: _______________
**Deployed By**: _______________
**Environment**: _______________
**Version**: _______________