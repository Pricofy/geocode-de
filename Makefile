# ========================================
# Makefile - Pricofy Geocode ES
# ========================================
#
# Purpose: Automate common development tasks
#
# Available targets:
#   help         → Show this help message (default)
#   install      → Install dependencies
#   build        → Build Lambda package (TypeScript + data files)
#   test         → Run all tests
#   deploy       → Build + deploy to AWS via CDK
#   clean        → Remove build artifacts and dependencies
#
# Typical workflows:
#   Development:  make clean && make install && make build && make test
#   Deployment:   make deploy ENV=dev
#   CI/CD:        make clean && make install && make build && make test
#
# ========================================

.PHONY: help install build test deploy deploy-quick verify clean

# Default target: show help
.DEFAULT_GOAL := help

# Default environment for deployment
ENV ?= dev

# Service configuration
SERVICE_NAME = pricofy-geocode-es
STACK_SERVICE = PricofyGeocodeEsStack-$(ENV)
LAMBDA_GEOCODE = pricofy-geocode-es-$(ENV)

# ========================================
# Help - Show Available Targets
# ========================================
help: ## Show this help message
	@echo ""
	@echo "📦 $(SERVICE_NAME) Build & Deploy Automation"
	@echo ""
	@echo "🔧 Development Commands:"
	@echo "  make install              - Install dependencies"
	@echo "  make build                - Compile TypeScript + copy resources"
	@echo "  make test                 - Run tests with coverage"
	@echo "  make lint                 - Run ESLint"
	@echo "  make clean                - Clean build artifacts"
	@echo ""
	@echo "☁️  AWS Deployment:"
	@echo "  make deploy ENV=dev       - Full deployment (clean + test + deploy)"
	@echo "  make deploy-quick ENV=dev - Quick deploy (skip tests)"
	@echo "  make verify ENV=dev       - Verify deployment prerequisites"
	@echo "  make destroy-dev          - Destroy dev environment"
	@echo "  make destroy-prod         - Destroy prod environment"
	@echo ""
	@echo "🧪 Testing:"
	@echo "  make test-geocode ENV=dev - Test geocode Lambda"
	@echo ""
	@echo "📊 Logs:"
	@echo "  make logs-geocode ENV=dev - View geocode logs"
	@echo ""

# ========================================
# Install - Install Dependencies
# ========================================
install: ## Install application and infrastructure dependencies
	@echo "📦 Installing application dependencies..."
	@npm install --silent 2>&1 | grep -v "deprecated" || true
	@echo "📦 Installing infrastructure dependencies..."
	@cd infrastructure && npm install --silent 2>&1 | grep -v "deprecated" || true
	@echo "✅ Dependencies installed"

# ========================================
# Build - Compile TypeScript + Copy Data
# ========================================
build: ## Compile TypeScript and copy resource files
	@echo "🔨 Building Lambda package..."
	@echo "  1. Compiling TypeScript..."
	npm run build
	@echo "  2. Copying resource files..."
	mkdir -p dist/resources
	cp -r src/resources/* dist/resources/
	@echo "✅ Build complete"

# ========================================
# Test - Run Tests
# ========================================
test: ## Run all tests with coverage
	@echo "🧪 Running tests..."
	npm test
	@echo "✅ Tests passed"

# ========================================
# Lint - Run ESLint
# ========================================
lint: ## Run ESLint
	@echo "🔍 Running linter..."
	npm run lint
	@echo "✅ Linting complete"

# ========================================
# Clean - Remove Build Artifacts
# ========================================
clean: ## Clean build artifacts
	@echo "🧹 Cleaning build artifacts..."
	rm -rf dist
	rm -rf coverage
	rm -rf node_modules
	rm -rf infrastructure/node_modules
	rm -rf infrastructure/cdk.out
	@echo "✅ Clean complete"

# ========================================
# Verify - Check Deployment Prerequisites
# ========================================
verify: ## Verify deployment prerequisites
	@echo "🔍 Verifying deployment prerequisites for $(ENV)..."
	@echo ""
	@echo "1️⃣  Checking AWS CLI..."
	@which aws > /dev/null || (echo "❌ AWS CLI not found. Install: https://aws.amazon.com/cli/" && exit 1)
	@echo "   ✅ AWS CLI installed"
	@echo ""
	@echo "2️⃣  Checking AWS credentials..."
	@aws sts get-caller-identity > /dev/null || (echo "❌ AWS credentials not configured" && exit 1)
	@echo "   ✅ AWS credentials configured"
	@echo ""
	@echo "3️⃣  Checking CDK bootstrap..."
	@aws cloudformation describe-stacks --stack-name CDKToolkit > /dev/null 2>&1 || \
		(echo "❌ CDK not bootstrapped. Run: cd infrastructure && npm run bootstrap" && exit 1)
	@echo "   ✅ CDK bootstrapped"
	@echo ""
	@echo "✅ All prerequisites met"

# ========================================
# Deploy - Full Deployment (Build + Test + Deploy)
# ========================================
deploy: clean install build test ## Full deployment (clean + test + deploy)
	@echo "🚀 Deploying $(SERVICE_NAME) to $(ENV)..."
	cd infrastructure && npm run deploy:$(ENV)
	@echo "✅ Deployment complete"

# ========================================
# Deploy Quick - Skip Tests
# ========================================
deploy-quick: clean install build ## Quick deploy (skip tests)
	@echo "🚀 Quick deploying $(SERVICE_NAME) to $(ENV)..."
	cd infrastructure && npm run deploy:$(ENV)
	@echo "✅ Deployment complete"

# ========================================
# Destroy - Destroy Environment
# ========================================
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

# ========================================
# Test Geocode Lambda
# ========================================
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

# ========================================
# Logs - View Lambda Logs
# ========================================
logs-geocode: ## View geocode Lambda logs (ENV=dev)
	@echo "📊 Viewing geocode logs ($(ENV))..."
	aws logs tail /aws/lambda/$(LAMBDA_GEOCODE) --follow

# ========================================
# CI/CD - Continuous Integration
# ========================================
ci: clean install build test lint ## Run CI pipeline locally
	@echo "✅ CI pipeline complete"
