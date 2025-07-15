#!/usr/bin/env node

/**
 * Amplify Configuration Validation Script
 * 
 * This script validates the Amplify backend configuration to prevent
 * deployment issues like missing CloudFormation templates.
 */

const fs = require('fs');
const path = require('path');

// Configuration file paths
const CONFIG_FILES = {
  amplifyMeta: 'amplify/backend/amplify-meta.json',
  backendConfig: 'amplify/backend/backend-config.json',
  teamProvider: 'amplify/team-provider-info.json'
};

// Colors for console output
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function validateFileExists(filePath) {
  if (!fs.existsSync(filePath)) {
    log(`❌ Missing file: ${filePath}`, 'red');
    return false;
  }
  log(`✅ Found: ${filePath}`, 'green');
  return true;
}

function validateJsonFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    JSON.parse(content);
    log(`✅ Valid JSON: ${filePath}`, 'green');
    return true;
  } catch (error) {
    log(`❌ Invalid JSON in ${filePath}: ${error.message}`, 'red');
    return false;
  }
}

function validateResourceConsistency() {
  log('\n🔍 Validating resource consistency...', 'blue');
  
  try {
    const amplifyMeta = JSON.parse(fs.readFileSync(CONFIG_FILES.amplifyMeta, 'utf8'));
    const backendConfig = JSON.parse(fs.readFileSync(CONFIG_FILES.backendConfig, 'utf8'));
    
    let isConsistent = true;
    
    // Check if resources in amplify-meta.json exist in backend-config.json
    for (const [category, resources] of Object.entries(amplifyMeta)) {
      if (category === 'providers') continue;
      
      if (!backendConfig[category]) {
        log(`❌ Category '${category}' exists in amplify-meta.json but not in backend-config.json`, 'red');
        isConsistent = false;
        continue;
      }
      
      for (const resourceName of Object.keys(resources)) {
        if (!backendConfig[category][resourceName]) {
          log(`❌ Resource '${resourceName}' in category '${category}' exists in amplify-meta.json but not in backend-config.json`, 'red');
          isConsistent = false;
        }
      }
    }
    
    // Check if resources in backend-config.json exist in amplify-meta.json
    for (const [category, resources] of Object.entries(backendConfig)) {
      if (!amplifyMeta[category]) {
        log(`❌ Category '${category}' exists in backend-config.json but not in amplify-meta.json`, 'red');
        isConsistent = false;
        continue;
      }
      
      for (const resourceName of Object.keys(resources)) {
        if (!amplifyMeta[category][resourceName]) {
          log(`❌ Resource '${resourceName}' in category '${category}' exists in backend-config.json but not in amplify-meta.json`, 'red');
          isConsistent = false;
        }
      }
    }
    
    if (isConsistent) {
      log('✅ Configuration files are consistent', 'green');
    }
    
    return isConsistent;
  } catch (error) {
    log(`❌ Error validating consistency: ${error.message}`, 'red');
    return false;
  }
}

function validateResourceDirectories() {
  log('\n📁 Validating resource directories...', 'blue');
  
  try {
    const backendConfig = JSON.parse(fs.readFileSync(CONFIG_FILES.backendConfig, 'utf8'));
    let allExist = true;
    
    for (const [category, resources] of Object.entries(backendConfig)) {
      for (const resourceName of Object.keys(resources)) {
        const resourceDir = path.join('amplify', 'backend', category, resourceName);
        
        if (!fs.existsSync(resourceDir)) {
          log(`❌ Missing resource directory: ${resourceDir}`, 'red');
          allExist = false;
        } else {
          log(`✅ Found resource directory: ${resourceDir}`, 'green');
          
          // Check for CloudFormation template
          const templateFile = path.join(resourceDir, `${resourceName}-cloudformation-template.json`);
          if (category === 'function' && !fs.existsSync(templateFile)) {
            log(`❌ Missing CloudFormation template: ${templateFile}`, 'red');
            allExist = false;
          }
        }
      }
    }
    
    return allExist;
  } catch (error) {
    log(`❌ Error validating directories: ${error.message}`, 'red');
    return false;
  }
}

function generateReport() {
  log('\n📊 Configuration Summary:', 'blue');
  
  try {
    const backendConfig = JSON.parse(fs.readFileSync(CONFIG_FILES.backendConfig, 'utf8'));
    
    for (const [category, resources] of Object.entries(backendConfig)) {
      log(`\n📂 ${category.toUpperCase()}:`, 'yellow');
      for (const [resourceName, config] of Object.entries(resources)) {
        log(`  • ${resourceName} (${config.service})`, 'reset');
      }
    }
  } catch (error) {
    log(`❌ Error generating report: ${error.message}`, 'red');
  }
}

function main() {
  log('🚀 Amplify Configuration Validator', 'blue');
  log('=====================================\n', 'blue');
  
  let allValid = true;
  
  // Validate file existence
  log('📋 Checking configuration files...', 'blue');
  for (const [name, filePath] of Object.entries(CONFIG_FILES)) {
    if (!validateFileExists(filePath)) {
      allValid = false;
    }
  }
  
  if (!allValid) {
    log('\n❌ Missing configuration files. Please ensure Amplify is properly initialized.', 'red');
    process.exit(1);
  }
  
  // Validate JSON syntax
  log('\n🔍 Validating JSON syntax...', 'blue');
  for (const [name, filePath] of Object.entries(CONFIG_FILES)) {
    if (!validateJsonFile(filePath)) {
      allValid = false;
    }
  }
  
  // Validate consistency
  if (!validateResourceConsistency()) {
    allValid = false;
  }
  
  // Validate directories
  if (!validateResourceDirectories()) {
    allValid = false;
  }
  
  // Generate report
  generateReport();
  
  // Final result
  log('\n=====================================', 'blue');
  if (allValid) {
    log('✅ All validations passed! Configuration is ready for deployment.', 'green');
    process.exit(0);
  } else {
    log('❌ Validation failed! Please fix the issues above before deploying.', 'red');
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = {
  validateFileExists,
  validateJsonFile,
  validateResourceConsistency,
  validateResourceDirectories
};