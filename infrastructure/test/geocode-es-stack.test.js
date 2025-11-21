"use strict";
/**
 * CDK tests for Geocode ES Stack
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const cdk = __importStar(require("aws-cdk-lib"));
const assertions_1 = require("aws-cdk-lib/assertions");
const geocode_es_stack_1 = require("../lib/geocode-es-stack");
describe('Geocode ES Stack', () => {
    let app;
    let stack;
    let template;
    beforeEach(() => {
        // Create dummy dist directory for tests
        const fs = require('fs');
        const path = require('path');
        const dummyDir = path.join(__dirname, '../../dist/handlers');
        fs.mkdirSync(dummyDir, { recursive: true });
        fs.writeFileSync(path.join(dummyDir, 'geocode.js'), 'exports.handler = () => {}');
        // Create dummy resources directory
        const resourcesDir = path.join(__dirname, '../../dist/resources');
        fs.mkdirSync(resourcesDir, { recursive: true });
        fs.writeFileSync(path.join(resourcesDir, 'postal-codes-es.json'), '{}');
        app = new cdk.App();
        stack = new geocode_es_stack_1.GeocodeEsStack(app, 'TestStack', {
            env: { account: 'test-account', region: 'eu-west-1' },
            environment: 'dev',
        });
        template = assertions_1.Template.fromStack(stack);
    });
    it('should create exactly one Lambda function', () => {
        // Single geocode Lambda with internal routing
        template.resourceCountIs('AWS::Lambda::Function', 1);
    });
    it('should create Lambda with proper naming', () => {
        template.hasResourceProperties('AWS::Lambda::Function', {
            FunctionName: assertions_1.Match.stringLikeRegexp('pricofy-geocode-es-.*'),
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ2VvY29kZS1lcy1zdGFjay50ZXN0LmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiZ2VvY29kZS1lcy1zdGFjay50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFBQTs7R0FFRzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFFSCxpREFBbUM7QUFDbkMsdURBQXlEO0FBQ3pELDhEQUF5RDtBQUV6RCxRQUFRLENBQUMsa0JBQWtCLEVBQUUsR0FBRyxFQUFFO0lBQ2hDLElBQUksR0FBWSxDQUFDO0lBQ2pCLElBQUksS0FBcUIsQ0FBQztJQUMxQixJQUFJLFFBQWtCLENBQUM7SUFFdkIsVUFBVSxDQUFDLEdBQUcsRUFBRTtRQUNkLHdDQUF3QztRQUN4QyxNQUFNLEVBQUUsR0FBRyxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUM7UUFDekIsTUFBTSxJQUFJLEdBQUcsT0FBTyxDQUFDLE1BQU0sQ0FBQyxDQUFDO1FBQzdCLE1BQU0sUUFBUSxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUMsU0FBUyxFQUFFLHFCQUFxQixDQUFDLENBQUM7UUFDN0QsRUFBRSxDQUFDLFNBQVMsQ0FBQyxRQUFRLEVBQUUsRUFBRSxTQUFTLEVBQUUsSUFBSSxFQUFFLENBQUMsQ0FBQztRQUM1QyxFQUFFLENBQUMsYUFBYSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsUUFBUSxFQUFFLFlBQVksQ0FBQyxFQUFFLDRCQUE0QixDQUFDLENBQUM7UUFFbEYsbUNBQW1DO1FBQ25DLE1BQU0sWUFBWSxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUMsU0FBUyxFQUFFLHNCQUFzQixDQUFDLENBQUM7UUFDbEUsRUFBRSxDQUFDLFNBQVMsQ0FBQyxZQUFZLEVBQUUsRUFBRSxTQUFTLEVBQUUsSUFBSSxFQUFFLENBQUMsQ0FBQztRQUNoRCxFQUFFLENBQUMsYUFBYSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsWUFBWSxFQUFFLHNCQUFzQixDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUM7UUFFeEUsR0FBRyxHQUFHLElBQUksR0FBRyxDQUFDLEdBQUcsRUFBRSxDQUFDO1FBQ3BCLEtBQUssR0FBRyxJQUFJLGlDQUFjLENBQUMsR0FBRyxFQUFFLFdBQVcsRUFBRTtZQUMzQyxHQUFHLEVBQUUsRUFBRSxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sRUFBRSxXQUFXLEVBQUU7WUFDckQsV0FBVyxFQUFFLEtBQUs7U0FDbkIsQ0FBQyxDQUFDO1FBQ0gsUUFBUSxHQUFHLHFCQUFRLENBQUMsU0FBUyxDQUFDLEtBQUssQ0FBQyxDQUFDO0lBQ3ZDLENBQUMsQ0FBQyxDQUFDO0lBRUgsRUFBRSxDQUFDLDJDQUEyQyxFQUFFLEdBQUcsRUFBRTtRQUNuRCw4Q0FBOEM7UUFDOUMsUUFBUSxDQUFDLGVBQWUsQ0FBQyx1QkFBdUIsRUFBRSxDQUFDLENBQUMsQ0FBQztJQUN2RCxDQUFDLENBQUMsQ0FBQztJQUVILEVBQUUsQ0FBQyx5Q0FBeUMsRUFBRSxHQUFHLEVBQUU7UUFDakQsUUFBUSxDQUFDLHFCQUFxQixDQUFDLHVCQUF1QixFQUFFO1lBQ3RELFlBQVksRUFBRSxrQkFBSyxDQUFDLGdCQUFnQixDQUFDLHVCQUF1QixDQUFDO1NBQzlELENBQUMsQ0FBQztJQUNMLENBQUMsQ0FBQyxDQUFDO0lBRUgsRUFBRSxDQUFDLGlEQUFpRCxFQUFFLEdBQUcsRUFBRTtRQUN6RCx3REFBd0Q7UUFDeEQsUUFBUSxDQUFDLHFCQUFxQixDQUFDLHVCQUF1QixFQUFFO1lBQ3RELFVBQVUsRUFBRSxHQUFHO1NBQ2hCLENBQUMsQ0FBQztJQUNMLENBQUMsQ0FBQyxDQUFDO0lBRUgsRUFBRSxDQUFDLGtEQUFrRCxFQUFFLEdBQUcsRUFBRTtRQUMxRCxpREFBaUQ7UUFDakQsUUFBUSxDQUFDLHFCQUFxQixDQUFDLHVCQUF1QixFQUFFO1lBQ3RELE9BQU8sRUFBRSxFQUFFO1NBQ1osQ0FBQyxDQUFDO0lBQ0wsQ0FBQyxDQUFDLENBQUM7SUFFSCxFQUFFLENBQUMsNkNBQTZDLEVBQUUsR0FBRyxFQUFFO1FBQ3JELFFBQVEsQ0FBQyxxQkFBcUIsQ0FBQyx1QkFBdUIsRUFBRTtZQUN0RCxPQUFPLEVBQUUsWUFBWTtTQUN0QixDQUFDLENBQUM7SUFDTCxDQUFDLENBQUMsQ0FBQztJQUVILEVBQUUsQ0FBQyxzQ0FBc0MsRUFBRSxHQUFHLEVBQUU7UUFDOUMsUUFBUSxDQUFDLHFCQUFxQixDQUFDLHVCQUF1QixFQUFFO1lBQ3RELE9BQU8sRUFBRSwwQkFBMEI7U0FDcEMsQ0FBQyxDQUFDO0lBQ0wsQ0FBQyxDQUFDLENBQUM7SUFFSCxFQUFFLENBQUMsd0NBQXdDLEVBQUUsR0FBRyxFQUFFO1FBQ2hELFFBQVEsQ0FBQyxxQkFBcUIsQ0FBQyx1QkFBdUIsRUFBRTtZQUN0RCxXQUFXLEVBQUU7Z0JBQ1gsU0FBUyxFQUFFO29CQUNULFdBQVcsRUFBRSxLQUFLO29CQUNsQixRQUFRLEVBQUUsWUFBWTtpQkFDdkI7YUFDRjtTQUNGLENBQUMsQ0FBQztJQUNMLENBQUMsQ0FBQyxDQUFDO0lBRUgsRUFBRSxDQUFDLDZCQUE2QixFQUFFLEdBQUcsRUFBRTtRQUNyQyxRQUFRLENBQUMscUJBQXFCLENBQUMsdUJBQXVCLEVBQUU7WUFDdEQsYUFBYSxFQUFFO2dCQUNiLElBQUksRUFBRSxRQUFRO2FBQ2Y7U0FDRixDQUFDLENBQUM7SUFDTCxDQUFDLENBQUMsQ0FBQztBQUNMLENBQUMsQ0FBQyxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBDREsgdGVzdHMgZm9yIEdlb2NvZGUgRVMgU3RhY2tcbiAqL1xuXG5pbXBvcnQgKiBhcyBjZGsgZnJvbSAnYXdzLWNkay1saWInO1xuaW1wb3J0IHsgVGVtcGxhdGUsIE1hdGNoIH0gZnJvbSAnYXdzLWNkay1saWIvYXNzZXJ0aW9ucyc7XG5pbXBvcnQgeyBHZW9jb2RlRXNTdGFjayB9IGZyb20gJy4uL2xpYi9nZW9jb2RlLWVzLXN0YWNrJztcblxuZGVzY3JpYmUoJ0dlb2NvZGUgRVMgU3RhY2snLCAoKSA9PiB7XG4gIGxldCBhcHA6IGNkay5BcHA7XG4gIGxldCBzdGFjazogR2VvY29kZUVzU3RhY2s7XG4gIGxldCB0ZW1wbGF0ZTogVGVtcGxhdGU7XG5cbiAgYmVmb3JlRWFjaCgoKSA9PiB7XG4gICAgLy8gQ3JlYXRlIGR1bW15IGRpc3QgZGlyZWN0b3J5IGZvciB0ZXN0c1xuICAgIGNvbnN0IGZzID0gcmVxdWlyZSgnZnMnKTtcbiAgICBjb25zdCBwYXRoID0gcmVxdWlyZSgncGF0aCcpO1xuICAgIGNvbnN0IGR1bW15RGlyID0gcGF0aC5qb2luKF9fZGlybmFtZSwgJy4uLy4uL2Rpc3QvaGFuZGxlcnMnKTtcbiAgICBmcy5ta2RpclN5bmMoZHVtbXlEaXIsIHsgcmVjdXJzaXZlOiB0cnVlIH0pO1xuICAgIGZzLndyaXRlRmlsZVN5bmMocGF0aC5qb2luKGR1bW15RGlyLCAnZ2VvY29kZS5qcycpLCAnZXhwb3J0cy5oYW5kbGVyID0gKCkgPT4ge30nKTtcbiAgICBcbiAgICAvLyBDcmVhdGUgZHVtbXkgcmVzb3VyY2VzIGRpcmVjdG9yeVxuICAgIGNvbnN0IHJlc291cmNlc0RpciA9IHBhdGguam9pbihfX2Rpcm5hbWUsICcuLi8uLi9kaXN0L3Jlc291cmNlcycpO1xuICAgIGZzLm1rZGlyU3luYyhyZXNvdXJjZXNEaXIsIHsgcmVjdXJzaXZlOiB0cnVlIH0pO1xuICAgIGZzLndyaXRlRmlsZVN5bmMocGF0aC5qb2luKHJlc291cmNlc0RpciwgJ3Bvc3RhbC1jb2Rlcy1lcy5qc29uJyksICd7fScpO1xuICAgIFxuICAgIGFwcCA9IG5ldyBjZGsuQXBwKCk7XG4gICAgc3RhY2sgPSBuZXcgR2VvY29kZUVzU3RhY2soYXBwLCAnVGVzdFN0YWNrJywge1xuICAgICAgZW52OiB7IGFjY291bnQ6ICd0ZXN0LWFjY291bnQnLCByZWdpb246ICdldS13ZXN0LTEnIH0sXG4gICAgICBlbnZpcm9ubWVudDogJ2RldicsXG4gICAgfSk7XG4gICAgdGVtcGxhdGUgPSBUZW1wbGF0ZS5mcm9tU3RhY2soc3RhY2spO1xuICB9KTtcblxuICBpdCgnc2hvdWxkIGNyZWF0ZSBleGFjdGx5IG9uZSBMYW1iZGEgZnVuY3Rpb24nLCAoKSA9PiB7XG4gICAgLy8gU2luZ2xlIGdlb2NvZGUgTGFtYmRhIHdpdGggaW50ZXJuYWwgcm91dGluZ1xuICAgIHRlbXBsYXRlLnJlc291cmNlQ291bnRJcygnQVdTOjpMYW1iZGE6OkZ1bmN0aW9uJywgMSk7XG4gIH0pO1xuXG4gIGl0KCdzaG91bGQgY3JlYXRlIExhbWJkYSB3aXRoIHByb3BlciBuYW1pbmcnLCAoKSA9PiB7XG4gICAgdGVtcGxhdGUuaGFzUmVzb3VyY2VQcm9wZXJ0aWVzKCdBV1M6OkxhbWJkYTo6RnVuY3Rpb24nLCB7XG4gICAgICBGdW5jdGlvbk5hbWU6IE1hdGNoLnN0cmluZ0xpa2VSZWdleHAoJ3ByaWNvZnktZ2VvY29kZS1lcy0uKicpLFxuICAgIH0pO1xuICB9KTtcblxuICBpdCgnc2hvdWxkIGNvbmZpZ3VyZSBMYW1iZGEgd2l0aCBhcHByb3ByaWF0ZSBtZW1vcnknLCAoKSA9PiB7XG4gICAgLy8gMjU2TUIgaXMgc3VmZmljaWVudCBmb3Igc3RhdGljIHBvc3RhbCBjb2RlIG9wZXJhdGlvbnNcbiAgICB0ZW1wbGF0ZS5oYXNSZXNvdXJjZVByb3BlcnRpZXMoJ0FXUzo6TGFtYmRhOjpGdW5jdGlvbicsIHtcbiAgICAgIE1lbW9yeVNpemU6IDI1NixcbiAgICB9KTtcbiAgfSk7XG5cbiAgaXQoJ3Nob3VsZCBjb25maWd1cmUgTGFtYmRhIHdpdGggYXBwcm9wcmlhdGUgdGltZW91dCcsICgpID0+IHtcbiAgICAvLyAxMCBzZWNvbmRzIHNob3VsZCBiZSBlbm91Z2ggZm9yIGFsbCBvcGVyYXRpb25zXG4gICAgdGVtcGxhdGUuaGFzUmVzb3VyY2VQcm9wZXJ0aWVzKCdBV1M6OkxhbWJkYTo6RnVuY3Rpb24nLCB7XG4gICAgICBUaW1lb3V0OiAxMCxcbiAgICB9KTtcbiAgfSk7XG5cbiAgaXQoJ3Nob3VsZCBjb25maWd1cmUgTGFtYmRhIHdpdGggcHJvcGVyIHJ1bnRpbWUnLCAoKSA9PiB7XG4gICAgdGVtcGxhdGUuaGFzUmVzb3VyY2VQcm9wZXJ0aWVzKCdBV1M6OkxhbWJkYTo6RnVuY3Rpb24nLCB7XG4gICAgICBSdW50aW1lOiAnbm9kZWpzMjAueCcsXG4gICAgfSk7XG4gIH0pO1xuXG4gIGl0KCdzaG91bGQgY29uZmlndXJlIExhbWJkYSB3aXRoIGhhbmRsZXInLCAoKSA9PiB7XG4gICAgdGVtcGxhdGUuaGFzUmVzb3VyY2VQcm9wZXJ0aWVzKCdBV1M6OkxhbWJkYTo6RnVuY3Rpb24nLCB7XG4gICAgICBIYW5kbGVyOiAnaGFuZGxlcnMvZ2VvY29kZS5oYW5kbGVyJyxcbiAgICB9KTtcbiAgfSk7XG5cbiAgaXQoJ3Nob3VsZCBjb25maWd1cmUgZW52aXJvbm1lbnQgdmFyaWFibGVzJywgKCkgPT4ge1xuICAgIHRlbXBsYXRlLmhhc1Jlc291cmNlUHJvcGVydGllcygnQVdTOjpMYW1iZGE6OkZ1bmN0aW9uJywge1xuICAgICAgRW52aXJvbm1lbnQ6IHtcbiAgICAgICAgVmFyaWFibGVzOiB7XG4gICAgICAgICAgRU5WSVJPTk1FTlQ6ICdkZXYnLFxuICAgICAgICAgIE5PREVfRU5WOiAncHJvZHVjdGlvbicsXG4gICAgICAgIH0sXG4gICAgICB9LFxuICAgIH0pO1xuICB9KTtcblxuICBpdCgnc2hvdWxkIGVuYWJsZSBYLVJheSB0cmFjaW5nJywgKCkgPT4ge1xuICAgIHRlbXBsYXRlLmhhc1Jlc291cmNlUHJvcGVydGllcygnQVdTOjpMYW1iZGE6OkZ1bmN0aW9uJywge1xuICAgICAgVHJhY2luZ0NvbmZpZzoge1xuICAgICAgICBNb2RlOiAnQWN0aXZlJyxcbiAgICAgIH0sXG4gICAgfSk7XG4gIH0pO1xufSk7XG5cbiJdfQ==