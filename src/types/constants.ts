/**
 * Application Constants for Spanish Geocoding Service
 *
 * @description
 * Centralized constants for the Spanish geocoding service.
 * Consolidates magic numbers and strings used throughout the application.
 *
 * @module types/constants
 */

/**
 * Regex pattern for Spanish postal codes
 * Format: 5 digits (e.g., 28001, 08001)
 */
export const POSTAL_CODE_REGEX = /^\d{5}$/;

/**
 * Earth radius in kilometers (for Haversine distance calculations)
 */
export const EARTH_RADIUS_KM = 6371;

/**
 * Coordinate validation ranges
 */
export const COORDINATE_RANGES = {
  /** Minimum valid latitude */
  MIN_LATITUDE: -90,
  /** Maximum valid latitude */
  MAX_LATITUDE: 90,
  /** Minimum valid longitude */
  MIN_LONGITUDE: -180,
  /** Maximum valid longitude */
  MAX_LONGITUDE: 180,
} as const;

