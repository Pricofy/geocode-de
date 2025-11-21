# GitHub Actions Setup

## Overview

Three workflows automate CI/CD:

1. **deploy.yml**: Deployment to dev/prod
2. **quality.yml**: Tests + SonarCloud
3. **e2e-tests.yml**: E2E integration tests

## Prerequisites

### 1. AWS Account Setup

- AWS account for dev environment
- AWS account for prod environment (can be same account, different region)
- CDK bootstrapped in both accounts

### 2. GitHub OIDC Provider

Configure OIDC provider in AWS IAM for keyless authentication.

#### Create OIDC Provider

```bash
aws iam create-open-id-connect-provider \
  --url https://token.actions.githubusercontent.com \
  --client-id-list sts.amazonaws.com \
  --thumbprint-list 6938fd4d98bab03faadb97b34396831e3780aea1
```

#### Create IAM Role

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
          "token.actions.githubusercontent.com:sub": "repo:Pricofy/pricofy-geocode-es:*"
        }
      }
    }
  ]
}
```

#### Attach Policies

```bash
# CDK deployment permissions
aws iam attach-role-policy \
  --role-name GitHubActionsRole \
  --policy-arn arn:aws:iam::aws:policy/PowerUserAccess

# CloudFormation permissions
aws iam attach-role-policy \
  --role-name GitHubActionsRole \
  --policy-arn arn:aws:iam::aws:policy/IAMFullAccess
```

### 3. SonarCloud Setup

1. Create account at https://sonarcloud.io
2. Import repository
3. Generate token
4. Add to GitHub Secrets

## GitHub Secrets

### Required Secrets

Add these secrets in GitHub repository settings:

| Secret | Description | Example |
|--------|-------------|---------|
| `AWS_ACCOUNT_ID_DEV` | AWS account ID for dev | `123456789012` |
| `AWS_ACCOUNT_ID_PROD` | AWS account ID for prod | `987654321098` |
| `AWS_ROLE_ARN_DEV` | IAM role ARN for dev | `arn:aws:iam::123456789012:role/GitHubActionsRole` |
| `AWS_ROLE_ARN_PROD` | IAM role ARN for prod | `arn:aws:iam::987654321098:role/GitHubActionsRole` |
| `SONAR_TOKEN` | SonarCloud token | `sqp_...` |

### Adding Secrets

```bash
# Via GitHub CLI
gh secret set AWS_ACCOUNT_ID_DEV --body "123456789012"
gh secret set AWS_ROLE_ARN_DEV --body "arn:aws:iam::123456789012:role/GitHubActionsRole"
gh secret set SONAR_TOKEN --body "sqp_..."

# Or via GitHub UI:
# Settings → Secrets and variables → Actions → New repository secret
```

## Workflows

### 1. deploy.yml

**Triggers:**
- Push to `develop` → Auto-deploy to dev
- Manual dispatch → Deploy to dev or prod

**Steps:**
1. Checkout code
2. Determine environment
3. Setup Go 1.24
4. Setup Node.js 20
5. Pre-pull SAM build image
6. Configure AWS credentials (OIDC)
7. Verify deployment prerequisites
8. Deploy via Makefile
9. Notify status

**Usage:**

```bash
# Automatic: Push to develop
git push origin develop

# Manual: Via GitHub UI
# Actions → Deploy Geocode ES → Run workflow → Select environment
```

### 2. quality.yml

**Triggers:**
- Push to `main` or `develop`
- Pull request to `main` or `develop`
- Manual dispatch

**Steps:**
1. Checkout code
2. Setup Go 1.24
3. Clean build artifacts
4. Install dependencies
5. Build binary
6. Run tests with coverage
7. SonarCloud scan

**Quality Gates:**
- Coverage > 80%
- No new bugs
- No new vulnerabilities
- Maintainability rating A

**Usage:**

```bash
# Automatic: Push or PR
git push origin develop

# Manual: Via GitHub UI
# Actions → Tests & Quality → Run workflow
```

### 3. e2e-tests.yml

**Triggers:**
- After successful deployment
- Manual dispatch
- Schedule (daily at 2 AM UTC)

**Steps:**
1. Checkout code
2. Determine environment
3. Configure AWS credentials
4. Setup Node.js 20
5. Install E2E dependencies
6. Run E2E tests
7. Fail on error

**Usage:**

```bash
# Automatic: After deployment
# (runs automatically when deploy.yml completes successfully)

# Manual: Via GitHub UI
# Actions → E2E Integration Tests → Run workflow → Select environment

# Scheduled: Runs daily at 2 AM UTC
```

## Monitoring

### View Workflow Runs

```bash
# Via GitHub CLI
gh run list

# View specific run
gh run view RUN_ID

# View logs
gh run view RUN_ID --log
```

### Workflow Status

Check status in GitHub UI:
- Repository → Actions tab
- View all workflow runs
- Click on run for details

### Notifications

Configure notifications:
- Settings → Notifications
- Enable workflow notifications
- Choose email or Slack integration

## Troubleshooting

### Deployment Failures

**Check AWS credentials:**
```bash
# Verify OIDC provider exists
aws iam list-open-id-connect-providers

# Verify role exists
aws iam get-role --role-name GitHubActionsRole

# Test assume role
aws sts assume-role-with-web-identity \
  --role-arn arn:aws:iam::ACCOUNT_ID:role/GitHubActionsRole \
  --role-session-name test \
  --web-identity-token TOKEN
```

**Check CDK bootstrap:**
```bash
aws cloudformation describe-stacks --stack-name CDKToolkit
```

### Test Failures

**View test logs:**
```bash
gh run view RUN_ID --log | grep "FAIL"
```

**Run tests locally:**
```bash
make test
```

### E2E Test Failures

**Check Lambda is deployed:**
```bash
aws lambda get-function --function-name pricofy-geocode-es-dev
```

**View Lambda logs:**
```bash
aws logs tail /aws/lambda/pricofy-geocode-es-dev --follow
```

**Test Lambda manually:**
```bash
make test-geocode ENV=dev
```

### SonarCloud Failures

**Check token:**
```bash
# Verify token is set
gh secret list | grep SONAR_TOKEN
```

**Check project:**
- Visit https://sonarcloud.io
- Verify project exists
- Check quality gate settings

## Best Practices

### 1. Branch Protection

Configure branch protection rules:
- Require status checks to pass
- Require pull request reviews
- Require up-to-date branches

### 2. Environment Secrets

Use environment-specific secrets:
- Create GitHub environments (dev, prod)
- Add environment-specific secrets
- Require approval for prod deployments

### 3. Workflow Permissions

Use minimal permissions:
```yaml
permissions:
  id-token: write   # For OIDC
  contents: read    # For checkout
```

### 4. Caching

Enable caching for faster builds:
```yaml
- uses: actions/setup-go@v5
  with:
    go-version: '1.24'
    cache: true  # Cache Go modules
```

### 5. Concurrency

Prevent concurrent deployments:
```yaml
concurrency:
  group: deploy-${{ github.ref }}
  cancel-in-progress: false
```

## Security

### 1. No Long-Lived Credentials

- Use OIDC instead of access keys
- No AWS credentials in secrets
- Temporary credentials per workflow run

### 2. Least Privilege

- Grant minimal IAM permissions
- Use resource-specific policies
- Audit permissions regularly

### 3. Secret Rotation

- Rotate SonarCloud token annually
- Update IAM role policies as needed
- Review GitHub secrets quarterly

### 4. Audit Logs

- Enable CloudTrail for AWS actions
- Review GitHub Actions logs
- Monitor for suspicious activity

---

**Last Updated:** November 2025  
**Version:** 1.0.0

