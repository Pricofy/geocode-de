/**
 * Tests for Validate Municipality Handler
 *
 * @module test/handlers/validate-municipio
 */

import { validateMunicipioOperation } from '../../src/operations/validate-municipio';
import { LambdaEvent } from '../../src/types';

describe('Validate Municipality Handler', () => {
  describe('Success Cases', () => {
    it('should validate existing municipality', async () => {
      const event: LambdaEvent = {
        body: JSON.stringify({ municipio: 'Madrid' }),
      };

      const response = await validateMunicipioOperation(event);
      const body = JSON.parse(response.body);

      expect(response.statusCode).toBe(200);
      expect(body.valid).toBe(true);
      expect(body.value).toBe('Madrid');
    });

    it('should validate non-existing municipality', async () => {
      const event: LambdaEvent = {
        body: JSON.stringify({ municipio: 'NonExistentCity' }),
      };

      const response = await validateMunicipioOperation(event);
      const body = JSON.parse(response.body);

      expect(response.statusCode).toBe(200);
      expect(body.valid).toBe(false);
      expect(body.value).toBe('NonExistentCity');
    });

    it('should be case-insensitive', async () => {
      const event: LambdaEvent = {
        body: JSON.stringify({ municipio: 'MADRID' }),
      };

      const response = await validateMunicipioOperation(event);
      const body = JSON.parse(response.body);

      expect(response.statusCode).toBe(200);
      expect(body.valid).toBe(true);
      expect(body.value).toBe('MADRID');
    });
  });

  describe('Error Cases', () => {
    it('should return 400 for missing municipio', async () => {
      const event: LambdaEvent = {
        body: JSON.stringify({}),
      };

      const response = await validateMunicipioOperation(event);

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.valid).toBe(false);
      expect(body.error).toContain('municipio is required');
    });

    it('should return 400 for empty municipio', async () => {
      const event: LambdaEvent = {
        body: JSON.stringify({ municipio: '' }),
      };

      const response = await validateMunicipioOperation(event);

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.valid).toBe(false);
      expect(body.error).toContain('municipio is required');
    });

    it('should return 400 for invalid JSON', async () => {
      const event: LambdaEvent = {
        body: 'invalid json',
      };

      const response = await validateMunicipioOperation(event);

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

      const PostalCodeService = require('../../src/services/postal-code-service').PostalCodeService;
      const originalValidate = PostalCodeService.prototype.validateMunicipio;
      PostalCodeService.prototype.validateMunicipio = () => {
        throw new Error('Database error');
      };

      try {
        const event: LambdaEvent = {
          body: JSON.stringify({ municipio: 'Madrid' }),
        };

        const response = await validateMunicipioOperation(event);
        const body = JSON.parse(response.body);

        expect(response.statusCode).toBe(500);
        expect(body.valid).toBe(false);
        expect(body.error).toBe('Internal server error');
        expect(body.details).toBe('Database error');
      } finally {
        PostalCodeService.prototype.validateMunicipio = originalValidate;
        process.env.ENVIRONMENT = originalEnv;
      }
    });

    it('should return 500 without details in production', async () => {
      const originalEnv = process.env.ENVIRONMENT;
      delete process.env.ENVIRONMENT;

      const PostalCodeService = require('../../src/services/postal-code-service').PostalCodeService;
      const originalValidate = PostalCodeService.prototype.validateMunicipio;
      PostalCodeService.prototype.validateMunicipio = () => {
        throw new Error('Error');
      };

      try {
        const event: LambdaEvent = {
          body: JSON.stringify({ municipio: 'Madrid' }),
        };

        const response = await validateMunicipioOperation(event);
        const body = JSON.parse(response.body);

        expect(response.statusCode).toBe(500);
        expect(body.details).toBeUndefined();
      } finally {
        PostalCodeService.prototype.validateMunicipio = originalValidate;
        process.env.ENVIRONMENT = originalEnv;
      }
    });
  });

  describe('Real-world scenarios', () => {
    it('should validate municipalities from different provinces', async () => {
      const municipalities = ['Madrid', 'Barcelona', 'Sevilla', 'Valencia', 'Zaragoza'];
      
      for (const municipio of municipalities) {
        const event: LambdaEvent = {
          body: JSON.stringify({ municipio }),
        };

        const response = await validateMunicipioOperation(event);
        const body = JSON.parse(response.body);

        expect(response.statusCode).toBe(200);
        expect(body.valid).toBe(true);
        expect(body.value.toLowerCase()).toBe(municipio.toLowerCase());
      }
    });

    it('should handle case-insensitive validation', async () => {
      const variations = ['madrid', 'MADRID', 'Madrid', 'MaDrId'];
      
      for (const variation of variations) {
        const event: LambdaEvent = {
          body: JSON.stringify({ municipio: variation }),
        };

        const response = await validateMunicipioOperation(event);
        const body = JSON.parse(response.body);

        expect(response.statusCode).toBe(200);
        expect(body.valid).toBe(true);
      }
    });

    it('should reject completely invalid municipalities', async () => {
      const event: LambdaEvent = {
        body: JSON.stringify({ municipio: 'NonExistentCityXYZ123' }),
      };

      const response = await validateMunicipioOperation(event);
      const body = JSON.parse(response.body);

      expect(response.statusCode).toBe(200);
      expect(body.valid).toBe(false);
    });

    it('should handle municipalities with special characters', async () => {
      const event: LambdaEvent = {
        body: JSON.stringify({ municipio: 'L\'Hospitalet de Llobregat' }),
      };

      const response = await validateMunicipioOperation(event);

      // Should either find it or not, but not crash
      expect([200]).toContain(response.statusCode);
      const body = JSON.parse(response.body);
      expect(body).toHaveProperty('valid');
    });
  });
});

