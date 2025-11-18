import { geocodeByPostalOperation } from '../../src/operations/geocode-by-postal';
import { LambdaEvent } from '../../src/types';

/**
 * Integration tests for geocode-by-postal handler
 * 
 * These tests use the real postal codes database (no mocks) to ensure
 * proper code coverage and realistic test scenarios.
 */
describe('geocode-by-postal handler', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Success Cases', () => {
    it('should geocode by postal code successfully', async () => {
      const event: LambdaEvent = {
        body: JSON.stringify({ postalCode: '28001' }),
      };

      const response = await geocodeByPostalOperation(event);
      const body = JSON.parse(response.body);

      expect(response.statusCode).toBe(200);
      expect(body.success).toBe(true);
      expect(body.coords).toBeDefined();
      expect(body.coords.lat).toBeDefined();
      expect(body.coords.lon).toBeDefined();
      expect(body.postalCode).toBe('28001');
      expect(body.municipio).toBeDefined();
      expect(body.provincia).toBeDefined();
      expect(body.source).toBe('postal_code');
    });

    it('should geocode by municipio when postal code not provided', async () => {
      const event: LambdaEvent = {
        body: JSON.stringify({ municipio: 'Madrid' }),
      };

      const response = await geocodeByPostalOperation(event);
      const body = JSON.parse(response.body);

      expect(response.statusCode).toBe(200);
      expect(body.success).toBe(true);
      expect(body.coords).toBeDefined();
      expect(body.municipio.toLowerCase()).toBe('madrid');
      expect(body.source).toBe('municipio');
    });

    it('should prefer postal code over municipio when both provided', async () => {
      const event: LambdaEvent = {
        body: JSON.stringify({ postalCode: '28001', municipio: 'Barcelona' }),
      };

      const response = await geocodeByPostalOperation(event);
      const body = JSON.parse(response.body);

      expect(response.statusCode).toBe(200);
      expect(body.success).toBe(true);
      expect(body.postalCode).toBe('28001');
      expect(body.source).toBe('postal_code');
    });

    it('should handle postal code with leading zeros', async () => {
      const event: LambdaEvent = {
        body: JSON.stringify({ postalCode: '01001' }),
      };

      const response = await geocodeByPostalOperation(event);
      const body = JSON.parse(response.body);

      expect(response.statusCode).toBe(200);
      expect(body.success).toBe(true);
      expect(body.postalCode).toBe('01001');
    });
  });

  describe('Error Cases', () => {
    it('should return 400 for invalid postal code format', async () => {
      const event: LambdaEvent = {
        body: JSON.stringify({ postalCode: 'invalid' }),
      };

      const response = await geocodeByPostalOperation(event);

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(false);
      expect(body.error).toContain('Invalid postal code format');
    });

    it('should return 400 for postal code with wrong length', async () => {
      const event: LambdaEvent = {
        body: JSON.stringify({ postalCode: '123' }),
      };

      const response = await geocodeByPostalOperation(event);

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(false);
    });

    it('should return 400 for postal code with letters', async () => {
      const event: LambdaEvent = {
        body: JSON.stringify({ postalCode: '2800A' }),
      };

      const response = await geocodeByPostalOperation(event);

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(false);
    });

    it('should return 404 when postal code not found in database', async () => {
      const event: LambdaEvent = {
        body: JSON.stringify({ postalCode: '99999' }),
      };

      const response = await geocodeByPostalOperation(event);

      expect(response.statusCode).toBe(404);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(false);
      expect(body.error).toContain('not found');
      expect(body.hint).toBeDefined();
    });

    it('should return 404 when municipio not found', async () => {
      const event: LambdaEvent = {
        body: JSON.stringify({ municipio: 'NonExistentCity' }),
      };

      const response = await geocodeByPostalOperation(event);

      expect(response.statusCode).toBe(404);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(false);
      expect(body.error).toContain('not found');
    });

    it('should return 404 when neither postalCode nor municipio provided', async () => {
      const event: LambdaEvent = {
        body: JSON.stringify({}),
      };

      const response = await geocodeByPostalOperation(event);

      expect(response.statusCode).toBe(404);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(false);
      expect(body.error).toContain('not found');
    });

    it('should return 400 for invalid JSON', async () => {
      const event: LambdaEvent = {
        body: 'invalid json',
      };

      const response = await geocodeByPostalOperation(event);

      expect(response.statusCode).toBe(400);
    });
  });


  describe('Error handling', () => {
    it('should return 500 for unexpected errors in dev environment', async () => {
      const originalEnv = process.env.ENVIRONMENT;
      process.env.ENVIRONMENT = 'dev';

      const PostalCodeService = require('../../src/services/postal-code-service').PostalCodeService;
      const originalGeocode = PostalCodeService.prototype.geocodeByPostal;
      PostalCodeService.prototype.geocodeByPostal = () => {
        throw new Error('Database connection lost');
      };

      try {
        const event: LambdaEvent = {
          body: JSON.stringify({ postalCode: '28001' }),
        };

        const response = await geocodeByPostalOperation(event);
        const body = JSON.parse(response.body);

        expect(response.statusCode).toBe(500);
        expect(body.success).toBe(false);
        expect(body.error).toBe('Internal server error');
        expect(body.details).toBe('Database connection lost');
      } finally {
        PostalCodeService.prototype.geocodeByPostal = originalGeocode;
        process.env.ENVIRONMENT = originalEnv;
      }
    });

    it('should return 500 without details in production', async () => {
      const originalEnv = process.env.ENVIRONMENT;
      delete process.env.ENVIRONMENT;

      const PostalCodeService = require('../../src/services/postal-code-service').PostalCodeService;
      const originalGeocode = PostalCodeService.prototype.geocodeByPostal;
      PostalCodeService.prototype.geocodeByPostal = () => {
        throw new Error('Error');
      };

      try {
        const event: LambdaEvent = {
          body: JSON.stringify({ postalCode: '28001' }),
        };

        const response = await geocodeByPostalOperation(event);
        const body = JSON.parse(response.body);

        expect(response.statusCode).toBe(500);
        expect(body.success).toBe(false);
        expect(body.error).toBe('Internal server error');
        expect(body.details).toBeUndefined();
      } finally {
        PostalCodeService.prototype.geocodeByPostal = originalGeocode;
        process.env.ENVIRONMENT = originalEnv;
      }
    });

    it('should handle non-Error exceptions', async () => {
      const PostalCodeService = require('../../src/services/postal-code-service').PostalCodeService;
      const originalGeocode = PostalCodeService.prototype.geocodeByPostal;
      PostalCodeService.prototype.geocodeByPostal = () => {
        throw 'String error';
      };

      try {
        const event: LambdaEvent = {
          body: JSON.stringify({ postalCode: '28001' }),
        };

        const response = await geocodeByPostalOperation(event);
        const body = JSON.parse(response.body);

        expect(response.statusCode).toBe(500);
        expect(body.success).toBe(false);
        expect(body.details).toBeUndefined();
      } finally {
        PostalCodeService.prototype.geocodeByPostal = originalGeocode;
      }
    });
  });

  describe('Edge Cases', () => {
    it('should handle case-insensitive municipio search', async () => {
      const event: LambdaEvent = {
        body: JSON.stringify({ municipio: 'madrid' }),
      };

      const response = await geocodeByPostalOperation(event);

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.municipio.toLowerCase()).toBe('madrid');
    });

    it('should handle municipio with special characters', async () => {
      const event: LambdaEvent = {
        body: JSON.stringify({ municipio: 'Vitoria-Gasteiz' }),
      };

      const response = await geocodeByPostalOperation(event);

      // Should either find it or return 404, but not crash
      expect([200, 404]).toContain(response.statusCode);
    });

    it('should fallback to municipio when postal code not found but municipio provided', async () => {
      // This tests the edge case in postal-code-service.ts lines 169-173
      // where PostalCodeNotFoundError is caught and null is returned to signal fallback
      // This is tested through integration: when postal code fails, municipio is tried
      const event: LambdaEvent = {
        body: JSON.stringify({ 
          postalCode: '99999', // Non-existent postal code
          municipio: 'Madrid'  // But municipio exists
        }),
      };

      const response = await geocodeByPostalOperation(event);
      const body = JSON.parse(response.body);

      // Should succeed using municipio fallback
      expect(response.statusCode).toBe(200);
      expect(body.success).toBe(true);
      expect(body.municipio.toLowerCase()).toBe('madrid');
      expect(body.source).toBe('municipio');
    });
  });
});
