#!/bin/bash
# ========================================
# Verify IAM Role Trust Policy for GitHub Actions OIDC
# ========================================
#
# Purpose: Check if the IAM role has the correct trust policy
#          to allow GitHub Actions from pricofy-geocode-es to assume it
#
# Usage: ./verify-iam-role.sh <ROLE_NAME>
#

set -e

if [ -z "$1" ]; then
  echo "❌ Error: Role name required"
  echo "Usage: $0 <ROLE_NAME>"
  echo "Example: $0 GitHubActionsDeployRole"
  exit 1
fi

ROLE_NAME=$1

echo "🔍 Checking IAM role: $ROLE_NAME"
echo ""

# Get the role trust policy
echo "📋 Trust Policy:"
aws iam get-role --role-name "$ROLE_NAME" --query 'Role.AssumeRolePolicyDocument' --output json | jq '.'

echo ""
echo "✅ Verification checklist:"
echo "  1. Check that Principal.Federated includes: oidc-provider/token.actions.githubusercontent.com"
echo "  2. Check that Action is: sts:AssumeRoleWithWebIdentity"
echo "  3. Check that Condition includes:"
echo "     - token.actions.githubusercontent.com:aud = sts.amazonaws.com"
echo "     - token.actions.githubusercontent.com:sub matches: repo:YOUR_ORG/pricofy-geocode-es:*"
echo ""
echo "💡 If the repository name is wrong or missing, update the trust policy to include pricofy-geocode-es"
