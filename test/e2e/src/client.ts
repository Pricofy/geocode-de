/**
 * Geocode ES Lambda Client
 * 
 * Client for invoking the pricofy-geocode-es Lambda function via AWS SDK.
 */

import { LambdaClient, InvokeCommand } from '@aws-sdk/client-lambda';
import { config } from './config';

export interface GeocodeByPostalRequest {
  operation: 'geocode-by-postal';
  postalCode?: string;
  municipio?: string;
}

export interface ReverseGeocodeRequest {
  operation: 'reverse-geocode';
  lat: number;
  lon: number;
}

export interface ValidatePostalRequest {
  operation: 'validate-postal';
  postalCode: string;
}

export interface ValidateMunicipioRequest {
  operation: 'validate-municipio';
  municipio: string;
}

export interface AutocompletePostalRequest {
  operation: 'autocomplete-postal';
  prefix: string;
  limit?: number;
}

export interface AutocompleteMunicipioRequest {
  operation: 'autocomplete-municipio';
  query: string;
  limit?: number;
}

export interface LambdaResponse {
  statusCode: number;
  body: any;
}

/**
 * Client for invoking Geocode ES Lambda function
 */
export class GeocodeESClient {
  private client: LambdaClient;
  private functionName: string;

  constructor() {
    this.client = new LambdaClient({ region: config.awsRegion });
    this.functionName = config.lambdaFunctionName;
  }

  /**
   * Invoke Lambda function with request payload
   */
  private async invoke(request: any): Promise<LambdaResponse> {
    const command = new InvokeCommand({
      FunctionName: this.functionName,
      Payload: JSON.stringify({ body: JSON.stringify(request) }),
    });

    const response = await this.client.send(command);
    const payload = JSON.parse(new TextDecoder().decode(response.Payload));

    return {
      statusCode: payload.statusCode,
      body: JSON.parse(payload.body),
    };
  }

  /**
   * Geocode by postal code or municipality
   */
  async geocodeByPostal(postalCode?: string, municipio?: string): Promise<LambdaResponse> {
    return this.invoke({
      operation: 'geocode-by-postal',
      ...(postalCode && { postalCode }),
      ...(municipio && { municipio }),
    });
  }

  /**
   * Reverse geocode coordinates to postal code
   */
  async reverseGeocode(lat: number, lon: number): Promise<LambdaResponse> {
    return this.invoke({
      operation: 'reverse-geocode',
      lat,
      lon,
    });
  }

  /**
   * Validate postal code
   */
  async validatePostal(postalCode: string): Promise<LambdaResponse> {
    return this.invoke({
      operation: 'validate-postal',
      postalCode,
    });
  }

  /**
   * Validate municipality
   */
  async validateMunicipio(municipio: string): Promise<LambdaResponse> {
    return this.invoke({
      operation: 'validate-municipio',
      municipio,
    });
  }

  /**
   * Autocomplete postal code
   */
  async autocompletePostal(prefix: string, limit?: number): Promise<LambdaResponse> {
    return this.invoke({
      operation: 'autocomplete-postal',
      prefix,
      ...(limit && { limit }),
    });
  }

  /**
   * Autocomplete municipality
   */
  async autocompleteMunicipio(query: string, limit?: number): Promise<LambdaResponse> {
    return this.invoke({
      operation: 'autocomplete-municipio',
      query,
      ...(limit && { limit }),
    });
  }
}

