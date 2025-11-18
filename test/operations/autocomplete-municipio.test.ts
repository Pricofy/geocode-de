/**
 * Tests for Autocomplete Municipality Handler
 *
 * @module test/handlers/autocomplete-municipio
 */

import { autocompleteMunicipioOperation } from '../../src/operations/autocomplete-municipio';
import { LambdaEvent } from '../../src/types';

describe('Autocomplete Municipality Handler', () => {
  describe('Success Cases', () => {
    it('should return autocomplete results for valid query', async () => {
      const event: LambdaEvent = {
        body: JSON.stringify({ query: 'mad', limit: 5 }),
      };

      const response = await autocompleteMunicipioOperation(event);
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

      // Verify results match query (case-insensitive)
      body.results.forEach((result: { municipio: string }) => {
        const municipioLower = result.municipio.toLowerCase();
        expect(
          municipioLower.startsWith('mad') || municipioLower.includes('mad')
        ).toBe(true);
      });
    });

    it('should prioritize starts-with matches', async () => {
      const event: LambdaEvent = {
        body: JSON.stringify({ query: 'mad', limit: 10 }),
      };

      const response = await autocompleteMunicipioOperation(event);
      const body = JSON.parse(response.body);

      expect(response.statusCode).toBe(200);
      if (body.results.length > 0) {
        // First result should start with 'mad'
        const firstResult = body.results[0] as { municipio: string };
        expect(firstResult.municipio.toLowerCase().startsWith('mad')).toBe(true);
      }
    });

    it('should return empty array for non-matching query', async () => {
      const event: LambdaEvent = {
        body: JSON.stringify({ query: 'NonExistentCityXYZ123' }),
      };

      const response = await autocompleteMunicipioOperation(event);
      const body = JSON.parse(response.body);

      expect(response.statusCode).toBe(200);
      expect(body.results).toEqual([]);
      expect(body.count).toBe(0);
    });

    it('should respect limit parameter', async () => {
      const event: LambdaEvent = {
        body: JSON.stringify({ query: 'a', limit: 3 }),
      };

      const response = await autocompleteMunicipioOperation(event);
      const body = JSON.parse(response.body);

      expect(response.statusCode).toBe(200);
      expect(body.results.length).toBeLessThanOrEqual(3);
      expect(body.count).toBe(body.results.length);
    });

    it('should be case-insensitive', async () => {
      const event: LambdaEvent = {
        body: JSON.stringify({ query: 'MADRID', limit: 5 }),
      };

      const response = await autocompleteMunicipioOperation(event);
      const body = JSON.parse(response.body);

      expect(response.statusCode).toBe(200);
      expect(body.results.length).toBeGreaterThan(0);
    });

    it('should use default limit if not provided', async () => {
      const event: LambdaEvent = {
        body: JSON.stringify({ query: 'mad' }),
      };

      const response = await autocompleteMunicipioOperation(event);
      const body = JSON.parse(response.body);

      expect(response.statusCode).toBe(200);
      expect(body.results.length).toBeLessThanOrEqual(10); // Default limit
    });

    it('should cap limit at 50', async () => {
      const event: LambdaEvent = {
        body: JSON.stringify({ query: 'a', limit: 100 }),
      };

      const response = await autocompleteMunicipioOperation(event);
      const body = JSON.parse(response.body);

      expect(response.statusCode).toBe(200);
      expect(body.results.length).toBeLessThanOrEqual(50); // Max limit
    });
  });

  describe('Error Cases', () => {
    it('should return 400 for missing query', async () => {
      const event: LambdaEvent = {
        body: JSON.stringify({}),
      };

      const response = await autocompleteMunicipioOperation(event);

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

      const response = await autocompleteMunicipioOperation(event);

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
      const originalAutocomplete = PostalCodeService.prototype.autocompleteMunicipio;
      PostalCodeService.prototype.autocompleteMunicipio = () => {
        throw new Error('Search index error');
      };

      try {
        const event: LambdaEvent = {
          body: JSON.stringify({ query: 'Mad' }),
        };

        const response = await autocompleteMunicipioOperation(event);
        const body = JSON.parse(response.body);

        expect(response.statusCode).toBe(500);
        expect(body.results).toEqual([]);
        expect(body.error).toBe('Internal server error');
        expect(body.details).toBe('Search index error');
      } finally {
        PostalCodeService.prototype.autocompleteMunicipio = originalAutocomplete;
        process.env.ENVIRONMENT = originalEnv;
      }
    });

    it('should return 500 without details in production', async () => {
      const originalEnv = process.env.ENVIRONMENT;
      delete process.env.ENVIRONMENT;

      const PostalCodeService = require('../../src/services/postal-code-service').PostalCodeService;
      const originalAutocomplete = PostalCodeService.prototype.autocompleteMunicipio;
      PostalCodeService.prototype.autocompleteMunicipio = () => {
        throw new Error('Error');
      };

      try {
        const event: LambdaEvent = {
          body: JSON.stringify({ query: 'Mad' }),
        };

        const response = await autocompleteMunicipioOperation(event);
        const body = JSON.parse(response.body);

        expect(response.statusCode).toBe(500);
        expect(body.details).toBeUndefined();
      } finally {
        PostalCodeService.prototype.autocompleteMunicipio = originalAutocomplete;
        process.env.ENVIRONMENT = originalEnv;
      }
    });
  });

  describe('Real-world autocomplete scenarios', () => {
    it('should find municipalities starting with "Bar"', async () => {
      const event: LambdaEvent = {
        body: JSON.stringify({ query: 'Bar', limit: 10 }),
      };

      const response = await autocompleteMunicipioOperation(event);
      const body = JSON.parse(response.body);

      expect(response.statusCode).toBe(200);
      expect(body.results.length).toBeGreaterThan(0);
      
      // At least one result should start with "Bar" (case insensitive)
      const hasBarcelona = body.results.some(
        (r: { municipio: string }) => r.municipio.toLowerCase().startsWith('bar')
      );
      expect(hasBarcelona).toBe(true);
    });

    it('should handle case-insensitive search', async () => {
      const queries = ['mad', 'MAD', 'Mad'];
      
      for (const query of queries) {
        const event: LambdaEvent = {
          body: JSON.stringify({ query, limit: 5 }),
        };

        const response = await autocompleteMunicipioOperation(event);
        const body = JSON.parse(response.body);

        expect(response.statusCode).toBe(200);
        expect(body.results.length).toBeGreaterThan(0);
      }
    });

    it('should prioritize starts-with matches', async () => {
      const event: LambdaEvent = {
        body: JSON.stringify({ query: 'Madr', limit: 10 }),
      };

      const response = await autocompleteMunicipioOperation(event);
      const body = JSON.parse(response.body);

      expect(response.statusCode).toBe(200);
      
      if (body.results.length > 0) {
        // First result should start with the query
        const firstResult = body.results[0].municipio.toLowerCase();
        expect(firstResult.startsWith('madr')).toBe(true);
      }
    });

    it('should handle short queries', async () => {
      const event: LambdaEvent = {
        body: JSON.stringify({ query: 'A', limit: 5 }),
      };

      const response = await autocompleteMunicipioOperation(event);
      const body = JSON.parse(response.body);

      expect(response.statusCode).toBe(200);
      expect(Array.isArray(body.results)).toBe(true);
    });

    it('should include province information', async () => {
      const event: LambdaEvent = {
        body: JSON.stringify({ query: 'Mad', limit: 3 }),
      };

      const response = await autocompleteMunicipioOperation(event);
      const body = JSON.parse(response.body);

      expect(response.statusCode).toBe(200);
      
      body.results.forEach((result: { provincia: string; municipio: string }) => {
        expect(result.provincia).toBeDefined();
        expect(result.provincia.length).toBeGreaterThan(0);
        expect(result.municipio).toBeDefined();
      });
    });
  });
});

