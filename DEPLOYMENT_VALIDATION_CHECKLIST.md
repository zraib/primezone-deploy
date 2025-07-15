# Deployment Validation Checklist

## Pre-Deployment Validation

### 1. Configuration Validation ✅

**Run Amplify Configuration Validator:**
```bash
npm run validate:amplify
```

**Expected Output:**
- ✅ All configuration files found
- ✅ Valid JSON syntax
- ✅ Resource consistency validated
- ✅ Resource directories exist
- ✅ All validations passed

### 2. Amplify Status Check

```bash
amplifiy status
```

**Expected Resources:**
- Storage: panoramaStorage (S3)
- No function resources should be listed

### 3. Environment Variables

**Required Variables:**
- `S3_REGION`
- `S3_BUCKET_NAME`
- `NEXT_PUBLIC_S3_REGION`
- `NEXT_PUBLIC_S3_BUCKET_NAME`
- `NODE_ENV=production`

**Validation:**
```bash
# Check local environment
cat .env.local

# Check Amplify Console environment variables
amplifiy console
```

### 4. Build Test

```bash
# Test local build
npm run build

# Test with production environment
NODE_ENV=production npm run build
```

## Deployment Steps

### 1. Backend Deployment

```bash
# Deploy backend changes
amplifiy push --yes
```

**Verify:**
- No errors in CloudFormation deployment
- S3 bucket created successfully
- IAM roles configured correctly

### 2. Frontend Deployment

```bash
# Deploy frontend
amplifiy publish
```

**Verify:**
- Build completes successfully
- No missing CloudFormation template errors
- Application deploys to Amplify hosting

## Post-Deployment Validation

### 1. Application Health Check

**Test URLs:**
- Main application: `https://[app-id].amplifyapp.com`
- Health check: `https://[app-id].amplifyapp.com/api/health`
- Storage config: `https://[app-id].amplifyapp.com/api/storage-config`

### 2. File Upload Testing

**Test Cases:**
1. **Panorama Image Upload**
   - Upload large panorama image (>10MB)
   - Verify S3 storage
   - Check file accessibility

2. **CSV File Upload**
   - Upload panorama pose data
   - Verify parsing and processing

3. **POI Asset Upload**
   - Upload images, PDFs, videos
   - Test different file types
   - Verify file size limits

### 3. Performance Validation

**Metrics to Check:**
- Page load time < 3 seconds
- File upload success rate > 95%
- Error rate < 1%

**Tools:**
```bash
# Lighthouse audit
npx lighthouse https://[app-id].amplifyapp.com

# Load testing
curl -w "@curl-format.txt" -o /dev/null -s https://[app-id].amplifyapp.com
```

## Troubleshooting Guide

### Common Issues and Solutions

#### 1. Missing CloudFormation Template

**Error:**
```
🛑 No CloudFormation template found at .../function/[functionName]/[functionName]-cloudformation-template.json
```

**Solution:**
1. Check `amplify/backend/amplify-meta.json` for function references
2. Check `amplify/backend/backend-config.json` for function references
3. Remove function references if function doesn't exist
4. Run validation: `npm run validate:amplify`

#### 2. Resource Inconsistency

**Error:**
```
❌ Resource exists in amplify-meta.json but not in backend-config.json
```

**Solution:**
1. Run: `npm run validate:amplify`
2. Manually sync configuration files
3. Or reset environment: `amplifiy env remove <env> && amplifiy env add <env>`

#### 3. Build Failures

**Common Causes:**
- Missing environment variables
- Node.js version mismatch
- Dependency conflicts
- Memory issues

**Solutions:**
```bash
# Clear cache
rm -rf .next node_modules
npm install

# Increase memory
export NODE_OPTIONS="--max-old-space-size=4096"
npm run build

# Check Node version
node --version  # Should be 14.x or higher
```

#### 4. S3 Permission Issues

**Symptoms:**
- Upload failures
- Access denied errors
- CORS issues

**Solutions:**
1. Check IAM roles in Amplify Console
2. Verify S3 bucket policies
3. Update CORS configuration
4. Test with AWS CLI: `aws s3 ls s3://[bucket-name]`

## Monitoring and Alerts

### 1. CloudWatch Metrics

**Key Metrics:**
- Application errors
- Response times
- Upload success rates
- S3 request metrics

### 2. Amplify Console Monitoring

**Check Regularly:**
- Build history
- Deployment logs
- Performance metrics
- Error rates

### 3. Automated Alerts

**Set up alerts for:**
- Build failures
- High error rates
- Performance degradation
- Storage quota exceeded

## Rollback Procedures

### 1. Frontend Rollback

```bash
# Rollback to previous deployment
amplifiy console
# Use Amplify Console to redeploy previous version
```

### 2. Backend Rollback

```bash
# Rollback backend changes
amplifiy env checkout <previous-env>
amplifiy push
```

### 3. Emergency Procedures

1. **Immediate Response:**
   - Disable problematic features
   - Switch to maintenance mode
   - Notify stakeholders

2. **Investigation:**
   - Check logs in CloudWatch
   - Review recent changes
   - Test in staging environment

3. **Recovery:**
   - Apply hotfix
   - Validate fix in staging
   - Deploy to production
   - Monitor closely

## Maintenance Schedule

### Daily
- [ ] Check application health
- [ ] Monitor error rates
- [ ] Review upload metrics

### Weekly
- [ ] Run full validation: `npm run validate:amplify`
- [ ] Check Amplify Console for issues
- [ ] Review performance metrics
- [ ] Update dependencies if needed

### Monthly
- [ ] Security audit
- [ ] Performance optimization review
- [ ] Backup verification
- [ ] Documentation updates

---

**Last Updated:** January 2025
**Version:** 1.0.0
**Next Review:** After next deployment