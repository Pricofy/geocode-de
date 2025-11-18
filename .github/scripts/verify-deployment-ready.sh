#!/bin/bash
# ========================================
# Verify Deployment Readiness - pricofy-geocode-es
# ========================================
#
# This script verifies all prerequisites for deploying
# pricofy-geocode-es via GitHub Actions
#
# Usage: ./verify-deployment-ready.sh [dev|prod]
#
# Note: This is simpler than location-service verification
# because geocode-es only uses static postal codes (no MaxMind)
#

set -e

ENVIRONMENT="${1:-dev}"
REGION="eu-west-1"

echo "=========================================="
echo "Verifying Deployment Readiness"
echo "Service: pricofy-geocode-es"
echo "Environment: $ENVIRONMENT"
echo "Region: $REGION"
echo "=========================================="
echo ""

# ========================================
# 1. Check AWS CLI is configured
# ========================================
echo "✅ Step 1: Checking AWS CLI..."
if ! command -v aws &> /dev/null; then
    echo "❌ AWS CLI not installed. Install with: brew install awscli"
    exit 1
fi

ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text 2>/dev/null || echo "")
if [ -z "$ACCOUNT_ID" ]; then
    echo "❌ AWS CLI not configured. Run: aws configure"
    exit 1
fi

echo "   ✓ AWS CLI configured"
echo "   ✓ Account ID: $ACCOUNT_ID"
echo ""

# ========================================
# 2. Check CDK Bootstrap
# ========================================
echo "✅ Step 2: Checking CDK Bootstrap..."

CDK_BOOTSTRAP=$(aws cloudformation describe-stacks \
    --stack-name CDKToolkit \
    --region "$REGION" \
    --query 'Stacks[0].StackStatus' \
    --output text 2>/dev/null || echo "NOT_FOUND")

if [ "$CDK_BOOTSTRAP" = "CREATE_COMPLETE" ] || [ "$CDK_BOOTSTRAP" = "UPDATE_COMPLETE" ]; then
    echo "   ✓ CDK Bootstrap complete"
else
    echo "   ❌ CDK not bootstrapped (status: $CDK_BOOTSTRAP)"
    echo ""
    echo "Bootstrap CDK with:"
    echo "  cd ../pricofy-infra/aws-setup"
    echo "  ./bootstrap-cdk-github-actions.sh $ACCOUNT_ID <GITHUB_ROLE_ARN> $REGION"
    echo ""
    exit 1
fi

echo ""

# ========================================
# 3. Check GitHub OIDC Provider
# ========================================
echo "✅ Step 3: Checking GitHub OIDC Provider..."

OIDC_PROVIDER=$(aws iam list-open-id-connect-providers \
    --query 'OpenIDConnectProviderList[?contains(Arn, `token.actions.githubusercontent.com`)].Arn' \
    --output text 2>/dev/null || echo "")

if [ -z "$OIDC_PROVIDER" ]; then
    echo "   ❌ GitHub OIDC provider not found"
    echo ""
    echo "Create it with:"
    echo "  cd ../pricofy-infra/aws-setup"
    echo "  ./setup-github-oidc.sh"
    echo ""
    exit 1
fi

echo "   ✓ GitHub OIDC provider exists"
echo "   ✓ ARN: $OIDC_PROVIDER"
echo ""

# ========================================
# 4. Check GitHub Actions IAM Role
# ========================================
echo "✅ Step 4: Checking GitHub Actions IAM Role..."

# Try common role names
ROLE_NAMES=(
    "GitHubActionsDeployRole"
    "GitHubActions-PricofyGeocodeEs-Deploy"
    "GitHubActionsDeployRole-$ENVIRONMENT"
)

ROLE_ARN=""
for role_name in "${ROLE_NAMES[@]}"; do
    ARN=$(aws iam get-role --role-name "$role_name" --query 'Role.Arn' --output text 2>/dev/null || echo "")
    if [ -n "$ARN" ]; then
        ROLE_ARN=$ARN
        echo "   ✓ IAM Role found: $role_name"
        echo "   ✓ ARN: $ROLE_ARN"
        break
    fi
done

if [ -z "$ROLE_ARN" ]; then
    echo "   ❌ GitHub Actions IAM role not found"
    echo "   Tried: ${ROLE_NAMES[*]}"
    echo ""
    echo "Create it with:"
    echo "  cd ../pricofy-infra/aws-setup"
    echo "  ./setup-github-oidc.sh"
    echo ""
    exit 1
fi

echo ""

# ========================================
# 5. Check Static Data Files
# ========================================
echo "✅ Step 5: Checking Static Data Files..."

if [ -f "src/resources/postal-codes-es.json" ]; then
    FILE_SIZE=$(du -h src/resources/postal-codes-es.json | cut -f1)
    ENTRY_COUNT=$(node -e "const data = require('./src/resources/postal-codes-es.json'); console.log(Object.keys(data).length)" 2>/dev/null || echo "unknown")
    echo "   ✓ postal-codes-es.json exists"
    echo "   ✓ Size: $FILE_SIZE"
    echo "   ✓ Entries: $ENTRY_COUNT postal codes"
else
    echo "   ❌ postal-codes-es.json NOT FOUND"
    echo ""
    echo "Generate it with:"
    echo "  cd scripts"
    echo "  curl -O http://download.geonames.org/export/zip/ES.zip"
    echo "  unzip ES.zip"
    echo "  node convert-postal-codes.js"
    echo "  # Output file will be in ../src/resources/postal-codes-es.json"
    echo ""
    exit 1
fi

echo ""

# ========================================
# 6. Summary & Next Steps
# ========================================
echo "=========================================="
echo "✅ ALL CHECKS PASSED"
echo "=========================================="
echo ""
echo "Your environment is ready for deployment!"
echo ""
echo "📋 Configuration Summary:"
echo "   • Service: pricofy-geocode-es"
echo "   • Environment: $ENVIRONMENT"
echo "   • AWS Account: $ACCOUNT_ID"
echo "   • Region: $REGION"
echo "   • CDK Bootstrap: ✓"
echo "   • GitHub OIDC: ✓"
echo "   • IAM Role: ✓"
echo "   • Postal Codes DB: ✓"
echo ""
echo "ℹ️  Note: This service does NOT use MaxMind"
echo "   Only static Spanish postal codes (11,150 entries)"
echo ""
echo "🚀 Next Steps:"
echo ""
echo "1. Configure GitHub Secrets (if not done):"
echo "   gh secret set AWS_ACCOUNT_ID_DEV -b\"$ACCOUNT_ID\""
echo "   gh secret set AWS_ROLE_ARN_DEV -b\"$ROLE_ARN\""
echo ""
echo "2. Deploy via GitHub Actions:"
echo "   git push origin develop"
echo "   # OR manually trigger in GitHub UI"
echo ""
echo "3. Monitor deployment:"
echo "   https://github.com/<YOUR_REPO>/actions"
echo ""
