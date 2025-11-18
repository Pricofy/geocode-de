/**
 * Tests for Autocomplete Postal Code Handler
 *
 * @module test/handlers/autocomplete-postal
 */

import { autocompletePostalOperation } from '../../src/operations/autocomplete-postal';
import { LambdaEvent } from '../../src/types';

describe('Autocomplete Postal Code Handler', () => {
  describe('Success Cases', () => {
    it('should return autocomplete results for valid prefix', async () => {
      const event: LambdaEvent = {
        body: JSON.stringify({ prefix: '280', limit: 5 }),
      };

      const response = await autocompletePostalOperation(event);
      const body = JSON.parse(response.body);

      expect(response.statusCode).toBe(200);
      expect(body.results).toBeDefined();
      expect(Array.isArray(body.results)).toBe(true);
      expect(body.count).toBe(body.results.length);

      // Verify each result has required fields
      body.results.forEach((result: unknown) => {
        expect(result).toHaveProperty('postalCode');
        expect(result).toHaveProperty('municipio');
        expect(result).toHaveProperty('provincia');
      });

      // Verify all results start with prefix
      body.results.forEach((result: { postalCode: string }) => {
        expect(result.postalCode.startsWith('280')).toBe(true);
      });
    });

    it('should return empty array for non-matching prefix', async () => {
      const event: LambdaEvent = {
        body: JSON.stringify({ prefix: '99999' }),
      };

      const response = await autocompletePostalOperation(event);
      const body = JSON.parse(response.body);

      expect(response.statusCode).toBe(200);
      expect(body.results).toEqual([]);
      expect(body.count).toBe(0);
    });

    it('should respect limit parameter', async () => {
      const event: LambdaEvent = {
        body: JSON.stringify({ prefix: '28', limit: 3 }),
      };

      const response = await autocompletePostalOperation(event);
      const body = JSON.parse(response.body);

      expect(response.statusCode).toBe(200);
      expect(body.results.length).toBeLessThanOrEqual(3);
      expect(body.count).toBe(body.results.length);
    });

    it('should use default limit if not provided', async () => {
      const event: LambdaEvent = {
        body: JSON.stringify({ prefix: '28' }),
      };

      const response = await autocompletePostalOperation(event);
      const body = JSON.parse(response.body);

      expect(response.statusCode).toBe(200);
      expect(body.results.length).toBeLessThanOrEqual(10); // Default limit
    });

    it('should cap limit at 50', async () => {
      const event: LambdaEvent = {
        body: JSON.stringify({ prefix: '28', limit: 100 }),
      };

      const response = await autocompletePostalOperation(event);
      const body = JSON.parse(response.body);

      expect(response.statusCode).toBe(200);
      expect(body.results.length).toBeLessThanOrEqual(50); // Max limit
    });
  });

  describe('Error Cases', () => {
    it('should return 400 for missing prefix', async () => {
      const event: LambdaEvent = {
        body: JSON.stringify({}),
      };

      const response = await autocompletePostalOperation(event);

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.results).toEqual([]);
      expect(body.count).toBe(0);
      expect(body.error).toContain('prefix or query is required');
    });

    it('should return 400 for invalid JSON', async () => {
      const event: LambdaEvent = {
        body: 'invalid json',
      };

      const response = await autocompletePostalOperation(event);

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.results).toEqual([]);
      expect(body.count).toBe(0);
      expect(body.error).toContain('Invalid JSON');
    });
  });


  describe('Error handling', () => {
    it('should return 500 for unexpected errors in dev environment', async () => {
      const originalEnv = process.env.ENVIRONMENT;
      process.env.ENVIRONMENT = 'dev';

      const PostalCodeService = require('../../src/services/postal-code-service').PostalCodeService;
      const originalAutocomplete = PostalCodeService.prototype.autocompletePostal;
      PostalCodeService.prototype.autocompletePostal = () => {
        throw new Error('Index corrupted');
      };

      try {
        const event: LambdaEvent = {
          body: JSON.stringify({ prefix: '28' }),
        };

        const response = await autocompletePostalOperation(event);
        const body = JSON.parse(response.body);

        expect(response.statusCode).toBe(500);
        expect(body.results).toEqual([]);
        expect(body.error).toBe('Internal server error');
        expect(body.details).toBe('Index corrupted');
      } finally {
        PostalCodeService.prototype.autocompletePostal = originalAutocomplete;
        process.env.ENVIRONMENT = originalEnv;
      }
    });

    it('should return 500 without details in production', async () => {
      const originalEnv = process.env.ENVIRONMENT;
      delete process.env.ENVIRONMENT;

      const PostalCodeService = require('../../src/services/postal-code-service').PostalCodeService;
      const originalAutocomplete = PostalCodeService.prototype.autocompletePostal;
      PostalCodeService.prototype.autocompletePostal = () => {
        throw new Error('Error');
      };

      try {
        const event: LambdaEvent = {
          body: JSON.stringify({ prefix: '28' }),
        };

        const response = await autocompletePostalOperation(event);
        const body = JSON.parse(response.body);

        expect(response.statusCode).toBe(500);
        expect(body.details).toBeUndefined();
      } finally {
        PostalCodeService.prototype.autocompletePostal = originalAutocomplete;
        process.env.ENVIRONMENT = originalEnv;
      }
    });
  });

  describe('Edge Cases', () => {
    it('should return 400 for limit that is NaN', async () => {
      // This tests the edge case in postal-code-service.ts line 460
      const event: LambdaEvent = {
        body: JSON.stringify({ prefix: '28', limit: 'invalid' }),
      };

      const response = await autocompletePostalOperation(event);
      const body = JSON.parse(response.body);

      expect(response.statusCode).toBe(400);
      expect(body.results).toEqual([]);
      expect(body.count).toBe(0);
      expect(body.error).toContain('limit must be a positive number');
    });

    it('should return 400 for limit less than 1', async () => {
      // This tests the edge case in postal-code-service.ts line 460
      const event: LambdaEvent = {
        body: JSON.stringify({ prefix: '28', limit: 0 }),
      };

      const response = await autocompletePostalOperation(event);
      const body = JSON.parse(response.body);

      expect(response.statusCode).toBe(400);
      expect(body.results).toEqual([]);
      expect(body.count).toBe(0);
      expect(body.error).toContain('limit must be a positive number');
    });

    it('should return 400 for negative limit', async () => {
      const event: LambdaEvent = {
        body: JSON.stringify({ prefix: '28', limit: -5 }),
      };

      const response = await autocompletePostalOperation(event);
      const body = JSON.parse(response.body);

      expect(response.statusCode).toBe(400);
      expect(body.results).toEqual([]);
      expect(body.count).toBe(0);
      expect(body.error).toContain('limit must be a positive number');
    });
  });

  describe('Real-world autocomplete scenarios', () => {
    it('should autocomplete Madrid postal codes (28xxx)', async () => {
      const event: LambdaEvent = {
        body: JSON.stringify({ prefix: '28', limit: 10 }),
      };

      const response = await autocompletePostalOperation(event);
      const body = JSON.parse(response.body);

      expect(response.statusCode).toBe(200);
      expect(body.results.length).toBeGreaterThan(0);
      expect(body.results.every((r: { postalCode: string }) => r.postalCode.startsWith('28'))).toBe(true);
    });

    it('should handle single digit prefix', async () => {
      const event: LambdaEvent = {
        body: JSON.stringify({ prefix: '0', limit: 5 }),
      };

      const response = await autocompletePostalOperation(event);
      const body = JSON.parse(response.body);

      expect(response.statusCode).toBe(200);
      expect(Array.isArray(body.results)).toBe(true);
    });

    it('should handle full postal code as prefix', async () => {
      const event: LambdaEvent = {
        body: JSON.stringify({ prefix: '28001' }),
      };

      const response = await autocompletePostalOperation(event);
      const body = JSON.parse(response.body);

      expect(response.statusCode).toBe(200);
      if (body.results.length > 0) {
        expect(body.results[0].postalCode).toBe('28001');
      }
    });

    it('should return sorted results', async () => {
      const event: LambdaEvent = {
        body: JSON.stringify({ prefix: '280', limit: 10 }),
      };

      const response = await autocompletePostalOperation(event);
      const body = JSON.parse(response.body);

      expect(response.statusCode).toBe(200);
      
      // Verify results are sorted
      for (let i = 1; i < body.results.length; i++) {
        expect(body.results[i].postalCode >= body.results[i - 1].postalCode).toBe(true);
      }
    });
  });
});

