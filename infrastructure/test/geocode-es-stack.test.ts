/**
 * CDK tests for Geocode ES Stack
 */

import * as cdk from 'aws-cdk-lib';
import { Template, Match } from 'aws-cdk-lib/assertions';
import { GeocodeEsStack } from '../lib/geocode-es-stack';

describe('Geocode ES Stack', () => {
  let app: cdk.App;
  let stack: GeocodeEsStack;
  let template: Template;

  beforeEach(() => {
    // Create dummy dist directory for tests (Go binary)
    const fs = require('fs');
    const path = require('path');
    const distDir = path.join(__dirname, '../../dist');
    fs.mkdirSync(distDir, { recursive: true });
    // Create dummy bootstrap binary (Go Lambda entry point)
    fs.writeFileSync(path.join(distDir, 'bootstrap'), '#!/bin/sh\necho "dummy"');
    
    app = new cdk.App();
    stack = new GeocodeEsStack(app, 'TestStack', {
      env: { account: 'test-account', region: 'eu-west-1' },
      environment: 'dev',
    });
    template = Template.fromStack(stack);
  });

  it('should create exactly one Lambda function', () => {
    // Single geocode Lambda with internal routing
    template.resourceCountIs('AWS::Lambda::Function', 1);
  });

  it('should create Lambda with proper naming', () => {
    template.hasResourceProperties('AWS::Lambda::Function', {
      FunctionName: Match.stringLikeRegexp('pricofy-geocode-es-.*'),
    });
  });

  it('should configure Lambda with appropriate memory', () => {
    // 256MB is sufficient for static postal code operations
    template.hasResourceProperties('AWS::Lambda::Function', {
      MemorySize: 256,
    });
  });

  it('should configure Lambda with appropriate timeout', () => {
    // 10 seconds should be enough for all operations
    template.hasResourceProperties('AWS::Lambda::Function', {
      Timeout: 10,
    });
  });

  it('should configure Lambda with proper runtime', () => {
    template.hasResourceProperties('AWS::Lambda::Function', {
      Runtime: 'nodejs20.x',
    });
  });

  it('should configure Lambda with handler', () => {
    template.hasResourceProperties('AWS::Lambda::Function', {
      Handler: 'handlers/geocode.handler',
    });
  });

  it('should configure environment variables', () => {
    template.hasResourceProperties('AWS::Lambda::Function', {
      Environment: {
        Variables: {
          ENVIRONMENT: 'dev',
          NODE_ENV: 'production',
        },
      },
    });
  });

  it('should enable X-Ray tracing', () => {
    template.hasResourceProperties('AWS::Lambda::Function', {
      TracingConfig: {
        Mode: 'Active',
      },
    });
  });
});

