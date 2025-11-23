# Deployment Configuration Verification Guide

## Quick Diagnosis

The deployment is failing because GitHub Actions cannot authenticate with AWS using OIDC. This guide helps you verify and fix the configuration.

## Step 1: Verify GitHub Secrets

Navigate to your repository settings and check that these secrets exist:

```
https://github.com/YOUR_ORG/pricofy-geocode-es/settings/secrets/actions
```

**Required secrets:**
- `AWS_ROLE_ARN_DEV` - Example: `arn:aws:iam::123456789012:role/GitHubActionsDeployRole`
- `AWS_ACCOUNT_ID_DEV` - Example: `123456789012`
- `AWS_ROLE_ARN_PROD` - Example: `arn:aws:iam::123456789012:role/GitHubActionsDeployRole`
- `AWS_ACCOUNT_ID_PROD` - Example: `123456789012`

**Compare with working service:**
```
https://github.com/YOUR_ORG/pricofy-ai-service/settings/secrets/actions
```

If the secrets are missing or empty, add them with the correct values.

## Step 2: Verify IAM Role Trust Policy

Run the verification script to check the IAM role configuration:

```bash
cd /Users/cnebrera/Projects/Personal/pricofy/pricofy-geocode-es
./.github/scripts/verify-iam-role.sh <ROLE_NAME>
```

Replace `<ROLE_NAME>` with the actual role name from your `AWS_ROLE_ARN_DEV` secret (the part after `role/`).

### Expected Trust Policy

The trust policy should look like this:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Federated": "arn:aws:iam::ACCOUNT_ID:oidc-provider/token.actions.githubusercontent.com"
      },
      "Action": "sts:AssumeRoleWithWebIdentity",
      "Condition": {
        "StringEquals": {
          "token.actions.githubusercontent.com:aud": "sts.amazonaws.com"
        },
        "StringLike": {
          "token.actions.githubusercontent.com:sub": "repo:YOUR_ORG/pricofy-geocode-es:*"
        }
      }
    }
  ]
}
```

### Fix Trust Policy (if needed)

If the repository name is wrong or missing, update the trust policy:

```bash
# 1. Get current policy
aws iam get-role --role-name <ROLE_NAME> --query 'Role.AssumeRolePolicyDocument' > trust-policy.json

# 2. Edit trust-policy.json to add/fix the repository condition

# 3. Update the role
aws iam update-assume-role-policy --role-name <ROLE_NAME> --policy-document file://trust-policy.json
```

### Option: Reuse Existing Role

If `pricofy-ai-service` is working, you can update its IAM role to allow both repositories:

```json
"StringLike": {
  "token.actions.githubusercontent.com:sub": [
    "repo:YOUR_ORG/pricofy-ai-service:*",
    "repo:YOUR_ORG/pricofy-geocode-es:*"
  ]
}
```

Then use the same `AWS_ROLE_ARN_DEV` value in both repositories.

## Step 3: Test Deployment

After fixing the configuration:

1. Go to: https://github.com/YOUR_ORG/pricofy-geocode-es/actions
2. Select "Deploy Geocode ES" workflow
3. Click "Run workflow"
4. Select "dev" environment
5. Click "Run workflow"

The "Configure AWS credentials" step should now succeed.

## Common Issues

### Issue: Secrets are empty
**Solution:** Add the correct values from your AWS account

### Issue: Wrong repository name in trust policy
**Solution:** Update the trust policy to include `pricofy-geocode-es`

### Issue: OIDC provider not configured
**Solution:** Create the GitHub OIDC provider in AWS IAM:
```bash
aws iam create-open-id-connect-provider \
  --url https://token.actions.githubusercontent.com \
  --client-id-list sts.amazonaws.com \
  --thumbprint-list 6938fd4d98bab03faadb97b34396831e3780aea1
```

## Need Help?

If you're still having issues, check:
- AWS CloudTrail logs for AssumeRoleWithWebIdentity failures
- GitHub Actions workflow logs for detailed error messages
- Compare all settings with the working `pricofy-ai-service` repository
