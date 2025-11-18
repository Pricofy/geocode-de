/**
 * Edge case tests for PostalCodeProvider
 * 
 * These tests cover edge cases that are difficult to trigger in normal operation
 * but are important for code coverage and robustness.
 */

import { PostalCodeProvider } from '../../src/providers/postal-code-provider';
import { PostalCodeNotFoundError } from '../../src/types/errors';

describe('PostalCodeProvider Edge Cases', () => {
  describe('reverseGeocode - empty database', () => {
    it('should throw PostalCodeNotFoundError when no postal codes found', async () => {
      // This tests the edge case in postal-code-provider.ts lines 311-312
      // where nearest is null after searching (should never happen with real data)
      const provider = new PostalCodeProvider();
      
      // Mock getCodes to return empty object
      const originalGetCodes = (provider as any).getCodes;
      (provider as any).getCodes = jest.fn().mockReturnValue({});

      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      try {
        await provider.reverseGeocode(40.4168, -3.7038);
        fail('Should have thrown PostalCodeNotFoundError');
      } catch (error) {
        expect(error).toBeInstanceOf(PostalCodeNotFoundError);
        // Verify error was logged
        expect(consoleErrorSpy).toHaveBeenCalled();
        const logCall = consoleErrorSpy.mock.calls[0][0];
        const logEntry = JSON.parse(logCall);
        expect(logEntry.message).toBe('No postal code found (should never happen)');
        expect(logEntry.component).toBe('PostalCodeProvider');
      } finally {
        (provider as any).getCodes = originalGetCodes;
        consoleErrorSpy.mockRestore();
      }
    });
  });
});

