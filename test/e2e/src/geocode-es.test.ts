/**
 * Geocode ES End-to-End Tests
 * 
 * Comprehensive integration tests for the pricofy-geocode-es Lambda function.
 * Tests all 6 operations with real Lambda invocations and measures execution time.
 * 
 * Test Coverage:
 * - Geocode by Postal (postal code and municipality)
 * - Reverse Geocode (coordinates to postal code)
 * - Validate Postal (postal code validation)
 * - Validate Municipality (municipality validation)
 * - Autocomplete Postal (prefix-based search)
 * - Autocomplete Municipality (fuzzy search)
 * - Error Handling
 * - Performance Benchmarks
 */

import { GeocodeESClient } from './client';

// Initialize client
const client = new GeocodeESClient();

describe('Geocode ES E2E Tests', () => {
  beforeAll(() => {
    console.log('🚀 Starting Geocode ES E2E Tests');
    console.log(`📍 Testing Lambda: ${process.env.LAMBDA_FUNCTION_NAME || 'pricofy-geocode-es'}`);
    console.log(`🌍 Region: ${process.env.AWS_REGION || 'eu-west-1'}\n`);
  });

  afterAll(() => {
    console.log('\n🏁 Geocode ES E2E Tests Completed');
  });

  // ============================================================================
  // Health Check
  // ============================================================================

  describe('Health Check', () => {
    test('should successfully invoke Lambda function', async () => {
      console.log('🧪 Testing Lambda health check');

      const startTime = Date.now();
      const response = await client.geocodeByPostal('28001');
      const duration = Date.now() - startTime;

      expect(response.statusCode).toBe(200);
      expect(response.body.success).toBe(true);

      console.log(`   ✅ Lambda is healthy (${duration}ms)`);
    }, 30000);
  });

  // ============================================================================
  // Geocode by Postal
  // ============================================================================

  describe('Geocode by Postal', () => {
    test('should geocode Madrid postal code (28001)', async () => {
      console.log('🧪 Testing geocode-by-postal with Madrid (28001)');

      const startTime = Date.now();
      const response = await client.geocodeByPostal('28001');
      const duration = Date.now() - startTime;

      const result = response.body;

      // Validate response structure
      expect(response.statusCode).toBe(200);
      expect(result).toHaveProperty('success', true);
      expect(result).toHaveProperty('coords');
      expect(result).toHaveProperty('municipality');
      expect(result).toHaveProperty('province');
      expect(result).toHaveProperty('postalCode', '28001');
      expect(result).toHaveProperty('source', 'postal_code');

      // Validate coordinates
      expect(result.coords).toHaveProperty('lat');
      expect(result.coords).toHaveProperty('lon');
      expect(typeof result.coords.lat).toBe('number');
      expect(typeof result.coords.lon).toBe('number');

      // Madrid coordinates should be around 40.4, -3.7
      expect(result.coords.lat).toBeGreaterThan(40);
      expect(result.coords.lat).toBeLessThan(41);
      expect(result.coords.lon).toBeGreaterThan(-4);
      expect(result.coords.lon).toBeLessThan(-3);

      console.log(`   ✅ Success in ${duration}ms`);
      console.log(`   Municipality: ${result.municipality}`);
      console.log(`   Provincia: ${result.province}`);
      console.log(`   Coords: ${result.coords.lat}, ${result.coords.lon}`);
    }, 30000);

    test('should geocode Barcelona postal code (08001)', async () => {
      console.log('🧪 Testing geocode-by-postal with Barcelona (08001)');

      const startTime = Date.now();
      const response = await client.geocodeByPostal('08001');
      const duration = Date.now() - startTime;

      const result = response.body;

      expect(response.statusCode).toBe(200);
      expect(result.success).toBe(true);
      expect(result.postalCode).toBe('08001');
      expect(result.municipality).toContain('Barcelona');

      console.log(`   ✅ Success in ${duration}ms`);
      console.log(`   Municipality: ${result.municipality}`);
    }, 30000);

    test('should geocode by municipality name (Madrid)', async () => {
      console.log('🧪 Testing geocode-by-postal with municipality (Madrid)');

      const startTime = Date.now();
      const response = await client.geocodeByPostal(undefined, 'Madrid');
      const duration = Date.now() - startTime;

      const result = response.body;

      expect(response.statusCode).toBe(200);
      expect(result.success).toBe(true);
      expect(result.municipality).toBe('Madrid');
      expect(result.source).toBe('municipality');

      console.log(`   ✅ Success in ${duration}ms`);
      console.log(`   Postal Code: ${result.postalCode}`);
    }, 30000);

    test('should return 404 for invalid postal code', async () => {
      console.log('🧪 Testing geocode-by-postal with invalid postal code');

      const response = await client.geocodeByPostal('99999');

      expect(response.statusCode).toBe(404);
      expect(response.body.success).toBe(false);

      console.log(`   ✅ Correctly returned 404 for invalid postal code`);
    }, 30000);
  });

  // ============================================================================
  // Reverse Geocode
  // ============================================================================

  describe('Reverse Geocode', () => {
    test('should reverse geocode Madrid coordinates', async () => {
      console.log('🧪 Testing reverse-geocode with Madrid coordinates');

      const startTime = Date.now();
      const response = await client.reverseGeocode(40.4168, -3.7038);
      const duration = Date.now() - startTime;

      const result = response.body;

      expect(response.statusCode).toBe(200);
      expect(result).toHaveProperty('success', true);
      expect(result).toHaveProperty('city');
      expect(result).toHaveProperty('postalCode');
      expect(result).toHaveProperty('province');
      expect(result).toHaveProperty('country', 'España');
      expect(result).toHaveProperty('distance');

      // Distance should be small (within Madrid)
      expect(result.distance).toBeLessThan(5);

      console.log(`   ✅ Success in ${duration}ms`);
      console.log(`   City: ${result.city}`);
      console.log(`   Postal Code: ${result.postalCode}`);
      console.log(`   Distance: ${result.distance} km`);
    }, 30000);

    test('should reverse geocode Barcelona coordinates', async () => {
      console.log('🧪 Testing reverse-geocode with Barcelona coordinates');

      const startTime = Date.now();
      const response = await client.reverseGeocode(41.3851, 2.1734);
      const duration = Date.now() - startTime;

      const result = response.body;

      expect(response.statusCode).toBe(200);
      expect(result.success).toBe(true);
      expect(result.city).toContain('Barcelona');

      console.log(`   ✅ Success in ${duration}ms`);
      console.log(`   City: ${result.city}`);
      console.log(`   Postal Code: ${result.postalCode}`);
    }, 30000);

    test('should return error for invalid coordinates', async () => {
      console.log('🧪 Testing reverse-geocode with invalid coordinates');

      const response = await client.reverseGeocode(999, 999);

      expect(response.statusCode).toBe(400);
      expect(response.body.success).toBe(false);

      console.log(`   ✅ Correctly returned error for invalid coordinates`);
    }, 30000);
  });

  // ============================================================================
  // Validate Postal
  // ============================================================================

  describe('Validate Postal', () => {
    test('should validate existing postal code (28001)', async () => {
      console.log('🧪 Testing validate-postal with valid postal code');

      const startTime = Date.now();
      const response = await client.validatePostal('28001');
      const duration = Date.now() - startTime;

      const result = response.body;

      expect(response.statusCode).toBe(200);
      expect(result).toHaveProperty('valid', true);
      expect(result).toHaveProperty('value', '28001');

      console.log(`   ✅ Success in ${duration}ms`);
      console.log(`   Valid: ${result.valid}`);
    }, 30000);

    test('should invalidate non-existing postal code', async () => {
      console.log('🧪 Testing validate-postal with invalid postal code');

      const startTime = Date.now();
      const response = await client.validatePostal('99999');
      const duration = Date.now() - startTime;

      const result = response.body;

      expect(response.statusCode).toBe(200);
      expect(result.valid).toBe(false);

      console.log(`   ✅ Success in ${duration}ms`);
      console.log(`   Valid: ${result.valid}`);
    }, 30000);
  });

  // ============================================================================
  // Validate Municipality
  // ============================================================================

  describe('Validate Municipality', () => {
    test('should validate existing municipality (Madrid)', async () => {
      console.log('🧪 Testing validate-municipality with valid municipality');

      const startTime = Date.now();
      const response = await client.validateMunicipality('Madrid');
      const duration = Date.now() - startTime;

      const result = response.body;

      expect(response.statusCode).toBe(200);
      expect(result.valid).toBe(true);
      expect(result.value).toBe('Madrid');

      console.log(`   ✅ Success in ${duration}ms`);
      console.log(`   Valid: ${result.valid}`);
    }, 30000);

    test('should invalidate non-existing municipality', async () => {
      console.log('🧪 Testing validate-municipality with invalid municipality');

      const startTime = Date.now();
      const response = await client.validateMunicipality('NonExistentCity');
      const duration = Date.now() - startTime;

      const result = response.body;

      expect(response.statusCode).toBe(200);
      expect(result.valid).toBe(false);

      console.log(`   ✅ Success in ${duration}ms`);
      console.log(`   Valid: ${result.valid}`);
    }, 30000);
  });

  // ============================================================================
  // Autocomplete Postal
  // ============================================================================

  describe('Autocomplete Postal', () => {
    test('should autocomplete postal codes starting with 280', async () => {
      console.log('🧪 Testing autocomplete-postal with prefix 280');

      const startTime = Date.now();
      const response = await client.autocompletePostal('280', 10);
      const duration = Date.now() - startTime;

      const result = response.body;

      expect(response.statusCode).toBe(200);
      expect(result.success).toBe(true);
      expect(result.results).toBeDefined();
      expect(Array.isArray(result.results)).toBe(true);
      expect(result.results.length).toBeGreaterThan(0);
      expect(result.results.length).toBeLessThanOrEqual(10);

      // All results should start with 280
      result.results.forEach((item: any) => {
        expect(item.postalCode).toMatch(/^280/);
        expect(item).toHaveProperty('municipality');
        expect(item).toHaveProperty('province');
      });

      console.log(`   ✅ Success in ${duration}ms`);
      console.log(`   Results: ${result.results.length}`);
      console.log(`   Sample: ${result.results[0].postalCode} - ${result.results[0].municipality}`);
    }, 30000);

    test('should return empty results for non-matching prefix', async () => {
      console.log('🧪 Testing autocomplete-postal with non-matching prefix');

      const response = await client.autocompletePostal('999', 10);
      const result = response.body;

      expect(response.statusCode).toBe(200);
      expect(result.success).toBe(true);
      expect(result.results).toEqual([]);

      console.log(`   ✅ Correctly returned empty results`);
    }, 30000);
  });

  // ============================================================================
  // Autocomplete Municipality
  // ============================================================================

  describe('Autocomplete Municipality', () => {
    test('should autocomplete municipalities starting with Mad', async () => {
      console.log('🧪 Testing autocomplete-municipality with query Mad');

      const startTime = Date.now();
      const response = await client.autocompleteMunicipality('Mad', 10);
      const duration = Date.now() - startTime;

      const result = response.body;

      expect(response.statusCode).toBe(200);
      expect(result.success).toBe(true);
      expect(result.results).toBeDefined();
      expect(Array.isArray(result.results)).toBe(true);
      expect(result.results.length).toBeGreaterThan(0);

      // Should include Madrid
      const hasMadrid = result.results.some((item: any) => item.municipality === 'Madrid');
      expect(hasMadrid).toBe(true);

      console.log(`   ✅ Success in ${duration}ms`);
      console.log(`   Results: ${result.results.length}`);
      console.log(`   Sample: ${result.results[0].municipality} (${result.results[0].province})`);
    }, 30000);

    test('should return empty results for non-matching query', async () => {
      console.log('🧪 Testing autocomplete-municipality with non-matching query');

      const response = await client.autocompleteMunicipality('XYZ123', 10);
      const result = response.body;

      expect(response.statusCode).toBe(200);
      expect(result.success).toBe(true);
      expect(result.results).toEqual([]);

      console.log(`   ✅ Correctly returned empty results`);
    }, 30000);
  });

  // ============================================================================
  // Performance Tests
  // ============================================================================

  describe('Performance', () => {
    test('geocode-by-postal should complete in < 100ms', async () => {
      console.log('🧪 Testing geocode-by-postal performance');

      const startTime = Date.now();
      await client.geocodeByPostal('28001');
      const duration = Date.now() - startTime;

      expect(duration).toBeLessThan(100);

      console.log(`   ✅ Completed in ${duration}ms (< 100ms)`);
    }, 30000);

    test('reverse-geocode should complete in < 200ms', async () => {
      console.log('🧪 Testing reverse-geocode performance');

      const startTime = Date.now();
      await client.reverseGeocode(40.4168, -3.7038);
      const duration = Date.now() - startTime;

      expect(duration).toBeLessThan(200);

      console.log(`   ✅ Completed in ${duration}ms (< 200ms)`);
    }, 30000);

    test('validate-postal should complete in < 50ms', async () => {
      console.log('🧪 Testing validate-postal performance');

      const startTime = Date.now();
      await client.validatePostal('28001');
      const duration = Date.now() - startTime;

      expect(duration).toBeLessThan(50);

      console.log(`   ✅ Completed in ${duration}ms (< 50ms)`);
    }, 30000);
  });
});

