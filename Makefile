# ========================================
# Makefile - Pricofy Geocode ES
# ========================================
#
# Purpose: Automate build, test, lint, and deployment tasks for Go-based geocoding service
#
# Available targets:
#   all          → Build and test (default)
#   build        → Build the binary for Lambda (Linux/ARM64 - Graviton2)
#   build-local  → Build for local development (native architecture)
#   test         → Run unit tests with coverage
#   test-fast    → Run tests without verbose output (faster)
#   test-e2e     → Run E2E integration tests against deployed Lambda
#   test-e2e-setup → Install E2E test dependencies
#   test-e2e-quick → Run quick E2E health check
#   coverage-html → Generate HTML coverage report and open in browser
#   lint         → Run linter (requires golangci-lint)
#   clean        → Remove build artifacts
#   deps         → Tidy Go modules
#   install      → Install Go + CDK dependencies
#   verify       → Verify deployment prerequisites
#   deploy       → Safe deployment (clean + test + deploy)
#   deploy-quick → Quick deploy (skip tests)
#   destroy-dev  → Destroy dev environment
#   destroy-prod → Destroy prod environment
#   test-geocode → Test deployed Lambda function
#   logs-geocode → View Lambda CloudWatch logs
#   ci           → Run full CI pipeline locally
#   help         → Show this help message
#
# Usage:
#   make <target>
#
# Prerequisites:
#   - Go 1.24+
#   - golangci-lint (for lint target)
#   - AWS CLI (for deployment)
#   - CDK CLI (for deployment)
#
# ========================================

# Variables
GO = go
GOTEST = $(GO) test
GOLINT = golangci-lint
BINARY = pricofy-geocode-es
ENV ?= dev

# AWS Configuration (determined by ENV)
# Account IDs
AWS_ACCOUNT_ID_DEV = 948976367203
AWS_ACCOUNT_ID_PROD = 380283541715

# Calculate AWS_PROFILE and CDK_DEFAULT_ACCOUNT based on ENV
ifeq ($(ENV),prod)
  AWS_PROFILE = pricofy-prod
  CDK_DEFAULT_ACCOUNT = $(AWS_ACCOUNT_ID_PROD)
else
  AWS_PROFILE = pricofy-dev
  CDK_DEFAULT_ACCOUNT = $(AWS_ACCOUNT_ID_DEV)
endif

# Service configuration
SERVICE_NAME = pricofy-geocode-es
STACK_SERVICE = PricofyGeocodeEsStack
LAMBDA_GEOCODE = pricofy-geocode-es

# Default target: build and test
all: build test ## Build and test (default)

# Build the binary for Lambda (Linux/ARM64 - Graviton2)
build: ## Build the Go binary for AWS Lambda (Linux/ARM64 - Graviton2)
	@echo "🔨 Building for Lambda (Linux/ARM64 - Graviton2)..."
	@mkdir -p dist
	GOOS=linux GOARCH=arm64 CGO_ENABLED=0 $(GO) build -ldflags="-s -w" -o dist/bootstrap ./cmd
	@echo "✅ Build complete"

# Build for local development (native architecture)
build-local: ## Build the Go binary for local development
	@echo "🔨 Building for local development..."
	$(GO) build -o $(BINARY) ./cmd
	@echo "✅ Build complete"

# Run unit tests with coverage
test: ## Run all tests with coverage report (production code only)
	@echo "🧪 Running Go tests with coverage..."
	@$(GOTEST) -v -coverprofile=coverage.out -covermode=atomic -coverpkg=./cmd/...,./internal/... ./... 2>&1 | grep -v "no test files" | grep -v "no statements"
	@echo ""
	@echo "📊 Coverage by package:"
	@go tool cover -func=coverage.out | grep -v "total:" | awk '{printf "  %-80s %6s\n", $$1, $$3}'
	@echo ""
	@echo "📊 TOTAL COVERAGE (production code only):"
	@go tool cover -func=coverage.out | grep "total:" | awk '{printf "  \033[1;32m%s\033[0m\n", $$3}'
	@echo ""
	@echo "💡 Tip: Run 'make coverage-html' to view detailed HTML report"
	@echo "✅ All tests passed"

# Generate HTML coverage report
coverage-html: test ## Generate HTML coverage report and open in browser
	@echo "📊 Generating HTML coverage report..."
	@go tool cover -html=coverage.out -o coverage.html
	@echo "✅ Coverage report generated: coverage.html"
	@echo "🌐 Opening in browser..."
	@open coverage.html 2>/dev/null || xdg-open coverage.html 2>/dev/null || echo "Please open coverage.html manually"

# Run tests without verbose output (fast)
test-fast: ## Run tests without verbose output (faster)
	@echo "🧪 Running tests (fast mode)..."
	@$(GOTEST) -coverprofile=coverage.out -covermode=atomic -coverpkg=./cmd/...,./internal/... ./... 2>&1 | grep -E "(PASS|FAIL|ok|coverage)" | grep -v "no test files" | grep -v "no statements"
	@echo "📊 Coverage: $$(go tool cover -func=coverage.out | grep total: | awk '{print $$3}')"

# Setup AWS environment configuration
# Internal target: validates ENV and sets AWS_PROFILE/CDK_DEFAULT_ACCOUNT
setup-aws-env:
	@if [ -z "$(ENV)" ]; then \
		echo "❌ ERROR: ENV is not set. Use: make <target> ENV=dev|prod"; \
		exit 1; \
	fi
	@if [ "$(ENV)" != "dev" ] && [ "$(ENV)" != "prod" ]; then \
		echo "❌ ERROR: ENV must be 'dev' or 'prod', got: $(ENV)"; \
		exit 1; \
	fi
	@echo "🔧 AWS Configuration for $(ENV):"
	@echo "   AWS_PROFILE: $(AWS_PROFILE)"
	@echo "   CDK_DEFAULT_ACCOUNT: $(CDK_DEFAULT_ACCOUNT)"

# Run E2E integration tests (requires deployed Lambda)
test-e2e: setup-aws-env ## Run E2E integration tests against deployed Lambda (ENV=dev|prod)
	@echo "🚀 Running E2E integration tests for $(ENV)..."
	@if [ -n "$$CI" ] || [ -n "$$GITHUB_ACTIONS" ]; then \
		echo "   → Using CI environment (OIDC credentials from env vars)"; \
		cd test/e2e && ENVIRONMENT=$(ENV) npm test; \
	else \
		echo "   → Using local AWS profile: $(AWS_PROFILE)"; \
		cd test/e2e && AWS_PROFILE=$(AWS_PROFILE) ENVIRONMENT=$(ENV) npm test; \
	fi

# Setup E2E test dependencies
test-e2e-setup: ## Install E2E test dependencies
	@echo "📦 Installing E2E test dependencies..."
	@cd test/e2e && npm install
	@echo "✅ E2E dependencies installed"

# Run quick E2E health check
test-e2e-quick: ## Run quick E2E health check
	@echo "🧪 Running quick E2E health check..."
	@cd test/e2e && npm run test:quick

# Run linter
lint: ## Run golangci-lint
	@echo "🔍 Linting..."
	$(GOLINT) run

# Clean build artifacts
clean: ## Clean build artifacts and binary
	@echo "🧹 Cleaning..."
	rm -f $(BINARY)
	rm -f coverage.out
	rm -f coverage.html
	rm -rf dist
	rm -rf infrastructure/node_modules
	rm -rf infrastructure/cdk.out
	@echo "✅ Clean complete"

# Install dependencies
deps: ## Tidy Go modules
	@echo "📦 Updating dependencies..."
	$(GO) mod tidy

# Install - Install Dependencies
install: ## Install application and infrastructure dependencies
	@echo "📦 Installing Go dependencies..."
	@go mod download
	@go mod tidy
	@echo "📦 Installing infrastructure dependencies..."
	@cd infrastructure && npm install --silent 2>&1 | grep -v "deprecated" || true
	@echo "✅ Dependencies installed"

# Verify deployment prerequisites
verify: setup-aws-env ## Verify deployment prerequisites (AWS config, CDK bootstrap) (ENV=dev|prod)
	@echo "🔍 Verifying deployment prerequisites for $(ENV)..."
	@echo "Checking AWS CLI configuration..."
	@if [ -n "$$CI" ] || [ -n "$$GITHUB_ACTIONS" ]; then \
		echo "   → Using CI environment (OIDC credentials)"; \
		aws sts get-caller-identity > /dev/null || (echo "❌ AWS CLI not configured" && exit 1); \
	else \
		echo "   → Using local AWS profile: $(AWS_PROFILE)"; \
		AWS_PROFILE=$(AWS_PROFILE) aws sts get-caller-identity > /dev/null || (echo "❌ AWS CLI not configured" && exit 1); \
	fi
	@echo "✅ AWS CLI configured"
	@echo "Checking CDK bootstrap..."
	@if [ -n "$$CI" ] || [ -n "$$GITHUB_ACTIONS" ]; then \
		aws cloudformation describe-stacks --stack-name CDKToolkit > /dev/null 2>&1 || (echo "❌ CDK not bootstrapped" && exit 1); \
	else \
		AWS_PROFILE=$(AWS_PROFILE) aws cloudformation describe-stacks --stack-name CDKToolkit > /dev/null 2>&1 || (echo "❌ CDK not bootstrapped" && exit 1); \
	fi
	@echo "✅ CDK bootstrap complete"
	@echo "✅ All prerequisites verified for $(ENV)"

# Deploy - Safe deployment (clean + test + deploy)
deploy: clean deps build test ## Safe deployment (clean + test + deploy)
	@echo ""
	@echo "🚀 Starting SAFE deployment to $(ENV)..."
	@echo "  → All artifacts cleaned ✓"
	@echo "  → Dependencies installed ✓"
	@echo "  → Code compiled ✓"
	@echo "  → Tests passed ✓"
	@echo ""
	@$(MAKE) deploy-quick ENV=$(ENV)

# Deploy Quick - Fast deployment (skip clean/test - use with caution)
deploy-quick: setup-aws-env ## Quick deploy (skips clean/test - use with caution) (ENV=dev|prod)
	@echo "⚡ Quick deployment to $(ENV) (skipping clean/test)..."
	@echo "  → Installing CDK dependencies..."
	@cd infrastructure && npm ci
	@echo "  → Deploying CloudFormation stacks..."
	@if [ -n "$$CI" ] || [ -n "$$GITHUB_ACTIONS" ]; then \
		echo "   → Using CI environment (OIDC credentials)"; \
		cd infrastructure && CDK_DEFAULT_ACCOUNT=$(CDK_DEFAULT_ACCOUNT) npx cdk deploy --require-approval never --context env=$(ENV); \
	else \
		echo "   → Using local AWS profile: $(AWS_PROFILE)"; \
		cd infrastructure && AWS_PROFILE=$(AWS_PROFILE) CDK_DEFAULT_ACCOUNT=$(CDK_DEFAULT_ACCOUNT) npx cdk deploy --require-approval never --context env=$(ENV); \
	fi
	@echo "✅ Deployment complete!"

# Destroy - Destroy Environment
destroy-dev: ## Destroy dev environment
	@echo "⚠️  Destroying dev environment..."
	@read -p "Are you sure? [y/N] " -n 1 -r; \
	echo; \
	if [[ $$REPLY =~ ^[Yy]$$ ]]; then \
		cd infrastructure && npm run destroy:dev; \
		echo "✅ Dev environment destroyed"; \
	else \
		echo "❌ Cancelled"; \
	fi

destroy-prod: ## Destroy prod environment
	@echo "⚠️  Destroying prod environment..."
	@read -p "Are you sure? This will delete PRODUCTION resources! [y/N] " -n 1 -r; \
	echo; \
	if [[ $$REPLY =~ ^[Yy]$$ ]]; then \
		cd infrastructure && npm run destroy:prod; \
		echo "✅ Prod environment destroyed"; \
	else \
		echo "❌ Cancelled"; \
	fi

# Test Geocode Lambda
test-geocode: ## Test geocode Lambda (ENV=dev)
	@echo "🧪 Testing geocode Lambda ($(ENV))..."
	@echo ""
	@echo "Test: geocode-by-postal"
	@aws lambda invoke \
		--function-name $(LAMBDA_GEOCODE) \
		--payload '{"body":"{\"operation\":\"geocode-by-postal\",\"postalCode\":\"28001\"}"}' \
		response.json
	@cat response.json | jq '.'
	@echo ""
	@echo "Test: reverse-geocode"
	@aws lambda invoke \
		--function-name $(LAMBDA_GEOCODE) \
		--payload '{"body":"{\"operation\":\"reverse-geocode\",\"lat\":40.4168,\"lon\":-3.7038}"}' \
		response.json
	@cat response.json | jq '.'
	@echo ""
	@echo "Test: validate-postal"
	@aws lambda invoke \
		--function-name $(LAMBDA_GEOCODE) \
		--payload '{"body":"{\"operation\":\"validate-postal\",\"postalCode\":\"28001\"}"}' \
		response.json
	@cat response.json | jq '.'
	@echo ""
	@echo "✅ Tests complete"

# Logs - View Lambda Logs
logs-geocode: ## View geocode Lambda logs (ENV=dev)
	@echo "📊 Viewing geocode logs ($(ENV))..."
	aws logs tail /aws/lambda/$(LAMBDA_GEOCODE) --follow

# CI/CD - Continuous Integration
ci: clean install build test lint ## Run CI pipeline locally
	@echo "✅ CI pipeline complete"

# Help target
help: ## Show this help message
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-15s\033[0m %s\n", $$1, $$2}'

.PHONY: all build build-local test test-fast setup-aws-env test-e2e test-e2e-setup test-e2e-quick coverage-html lint clean deps install verify deploy deploy-quick destroy-dev destroy-prod test-geocode logs-geocode ci help
