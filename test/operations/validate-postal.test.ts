/**
 * Tests for Validate Postal Code Handler
 *
 * @module test/handlers/validate-postal
 */

import { validatePostalOperation } from '../../src/operations/validate-postal';
import { LambdaEvent } from '../../src/types';

describe('Validate Postal Code Handler', () => {
  describe('Success Cases', () => {
    it('should validate existing postal code', async () => {
      const event: LambdaEvent = {
        body: JSON.stringify({ postalCode: '28001' }),
      };

      const response = await validatePostalOperation(event);
      const body = JSON.parse(response.body);

      expect(response.statusCode).toBe(200);
      expect(body.valid).toBe(true);
      expect(body.value).toBe('28001');
    });

    it('should validate non-existing postal code', async () => {
      const event: LambdaEvent = {
        body: JSON.stringify({ postalCode: '99999' }),
      };

      const response = await validatePostalOperation(event);
      const body = JSON.parse(response.body);

      expect(response.statusCode).toBe(200);
      expect(body.valid).toBe(false);
      expect(body.value).toBe('99999');
    });
  });

  describe('Error Cases', () => {
    it('should return 400 for missing postal code', async () => {
      const event: LambdaEvent = {
        body: JSON.stringify({}),
      };

      const response = await validatePostalOperation(event);

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.valid).toBe(false);
      expect(body.error).toContain('postalCode is required');
    });

    it('should return 400 for empty postal code', async () => {
      const event: LambdaEvent = {
        body: JSON.stringify({ postalCode: '' }),
      };

      const response = await validatePostalOperation(event);

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.valid).toBe(false);
      expect(body.error).toContain('postalCode is required');
    });

    it('should return 400 for invalid JSON', async () => {
      const event: LambdaEvent = {
        body: 'invalid json',
      };

      const response = await validatePostalOperation(event);

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.valid).toBe(false);
      expect(body.error).toContain('Invalid JSON');
    });
  });


  describe('Error handling', () => {
    it('should return 500 for unexpected errors in dev environment', async () => {
      const originalEnv = process.env.ENVIRONMENT;
      process.env.ENVIRONMENT = 'dev';

      // Force an error by mocking the service
      const PostalCodeService = require('../../src/services/postal-code-service').PostalCodeService;
      const originalValidate = PostalCodeService.prototype.validatePostal;
      PostalCodeService.prototype.validatePostal = () => {
        throw new Error('Unexpected database error');
      };

      try {
        const event: LambdaEvent = {
          body: JSON.stringify({ postalCode: '28001' }),
        };

        const response = await validatePostalOperation(event);
        const body = JSON.parse(response.body);

        expect(response.statusCode).toBe(500);
        expect(body.valid).toBe(false);
        expect(body.error).toBe('Internal server error');
        expect(body.details).toBe('Unexpected database error'); // Dev env shows details
      } finally {
        PostalCodeService.prototype.validatePostal = originalValidate;
        process.env.ENVIRONMENT = originalEnv;
      }
    });

    it('should return 500 without details in production environment', async () => {
      const originalEnv = process.env.ENVIRONMENT;
      process.env.ENVIRONMENT = 'production';

      const PostalCodeService = require('../../src/services/postal-code-service').PostalCodeService;
      const originalValidate = PostalCodeService.prototype.validatePostal;
      PostalCodeService.prototype.validatePostal = () => {
        throw new Error('Database connection failed');
      };

      try {
        const event: LambdaEvent = {
          body: JSON.stringify({ postalCode: '28001' }),
        };

        const response = await validatePostalOperation(event);
        const body = JSON.parse(response.body);

        expect(response.statusCode).toBe(500);
        expect(body.valid).toBe(false);
        expect(body.error).toBe('Internal server error');
        expect(body.details).toBeUndefined(); // Production hides details
      } finally {
        PostalCodeService.prototype.validatePostal = originalValidate;
        process.env.ENVIRONMENT = originalEnv;
      }
    });

    it('should handle non-Error exceptions', async () => {
      const PostalCodeService = require('../../src/services/postal-code-service').PostalCodeService;
      const originalValidate = PostalCodeService.prototype.validatePostal;
      PostalCodeService.prototype.validatePostal = () => {
        throw 'String error'; // Non-Error exception
      };

      try {
        const event: LambdaEvent = {
          body: JSON.stringify({ postalCode: '28001' }),
        };

        const response = await validatePostalOperation(event);
        const body = JSON.parse(response.body);

        expect(response.statusCode).toBe(500);
        expect(body.valid).toBe(false);
        expect(body.error).toBe('Internal server error');
        expect(body.details).toBeUndefined(); // Non-Error has no message
      } finally {
        PostalCodeService.prototype.validatePostal = originalValidate;
      }
    });
  });

  describe('Real-world scenarios', () => {
    it('should validate postal codes from different provinces', async () => {
      const postalCodes = ['28001', '08001', '41001', '46001', '50001'];
      
      for (const code of postalCodes) {
        const event: LambdaEvent = {
          body: JSON.stringify({ postalCode: code }),
        };

        const response = await validatePostalOperation(event);
        const body = JSON.parse(response.body);

        expect(response.statusCode).toBe(200);
        expect(body.valid).toBe(true);
        expect(body.value).toBe(code);
      }
    });

    it('should validate postal codes with wrong format as invalid', async () => {
      const event: LambdaEvent = {
        body: JSON.stringify({ postalCode: '2800A' }),
      };

      const response = await validatePostalOperation(event);

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.valid).toBe(false);
      expect(body.value).toBe('2800A');
    });

    it('should validate postal codes with wrong length as invalid', async () => {
      const event: LambdaEvent = {
        body: JSON.stringify({ postalCode: '123' }),
      };

      const response = await validatePostalOperation(event);

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.valid).toBe(false);
      expect(body.value).toBe('123');
    });

    it('should handle whitespace in postal code', async () => {
      const event: LambdaEvent = {
        body: JSON.stringify({ postalCode: ' 28001 ' }),
      };

      const response = await validatePostalOperation(event);

      // Should either trim and validate, or reject - both are valid behaviors
      expect([200, 400]).toContain(response.statusCode);
    });
  });
});

