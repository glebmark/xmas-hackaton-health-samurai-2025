import type { 
  AidboxUser, 
  AidboxClient, 
  AccessTestResult, 
  AccessTestResults,
  Bundle,
  BatchRequest,
  BatchRequestEntry,
  BatchResponse,
  OperationConfig
} from '../types.js';

// Define all operations we want to test
const OPERATIONS: OperationConfig[] = [
  { 
    key: 'search', 
    method: 'GET', 
    getUrl: (resourceType) => `${resourceType}?_count=0` 
  },
  { 
    key: 'read', 
    method: 'GET', 
    getUrl: (resourceType, resourceId) => `${resourceType}/${resourceId || '__nonexistent__'}` 
  },
  { 
    key: 'create', 
    method: 'POST', 
    getUrl: (resourceType) => resourceType
  },
  { 
    key: 'update', 
    method: 'PUT', 
    getUrl: (resourceType, resourceId) => `${resourceType}/${resourceId || '__nonexistent__'}` 
  },
  { 
    key: 'patch', 
    method: 'PATCH', 
    getUrl: (resourceType, resourceId) => `${resourceType}/${resourceId || '__nonexistent__'}` 
  },
  { 
    key: 'delete', 
    method: 'DELETE', 
    getUrl: (resourceType, resourceId) => `${resourceType}/${resourceId || '__nonexistent__'}` 
  },
];

// Token response from Aidbox OAuth
interface TokenResponse {
  access_token: string;
  token_type: string;
  expires_in?: number;
}

// Cached token with expiration
interface CachedToken {
  accessToken: string;
  expiresAt: number; // Unix timestamp in milliseconds
}

class AidboxService {
  private _baseUrl: string | null = null;
  private _clientId: string | null = null;
  private _clientSecret: string | null = null;
  private _cachedToken: CachedToken | null = null;

  // Lazy getters to ensure env vars are loaded (dotenv.config() must run first)
  private get baseUrl(): string {
    if (this._baseUrl === null) {
      let url = process.env.AIDBOX_URL || '';
      // Extract just the origin (protocol + host) if a full URL with path is provided
      try {
        const parsed = new URL(url);
        url = parsed.origin; // Gets just https://hostname.com without any path
      } catch {
        // If URL parsing fails, try basic cleanup
        url = url.replace(/\/+$/, ''); // Remove trailing slashes
      }
      this._baseUrl = url;
    }
    return this._baseUrl;
  }

  private get clientId(): string {
    if (this._clientId === null) {
      this._clientId = process.env.AIDBOX_CLIENT_ID || '';
    }
    return this._clientId;
  }

  private get clientSecret(): string {
    if (this._clientSecret === null) {
      this._clientSecret = process.env.AIDBOX_CLIENT_SECRET || '';
    }
    return this._clientSecret;
  }

  /**
   * Get an access token using OAuth client_credentials grant type.
   * Tokens are cached and reused until they expire.
   */
  private async getAccessToken(): Promise<string> {
    // Check if we have a valid cached token (with 30 second buffer before expiration)
    if (this._cachedToken && this._cachedToken.expiresAt > Date.now() + 30000) {
      return this._cachedToken.accessToken;
    }

    // Request new token using client_credentials
    const tokenUrl = `${this.baseUrl}/auth/token`;
    
    const response = await fetch(tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        grant_type: 'client_credentials',
        client_id: this.clientId,
        client_secret: this.clientSecret,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to get access token: ${response.status} ${error}`);
    }

    const tokenData = await response.json() as TokenResponse;

    // Cache the token with expiration time
    // Default to 10 minutes if expires_in is not provided
    const expiresIn = tokenData.expires_in || 600;
    this._cachedToken = {
      accessToken: tokenData.access_token,
      expiresAt: Date.now() + expiresIn * 1000,
    };

    console.log(`🔑 Obtained new access token (expires in ${expiresIn}s)`);

    return tokenData.access_token;
  }

  /**
   * Get the Authorization header with Bearer token for system operations
   */
  private async getAuthHeader(): Promise<string> {
    const token = await this.getAccessToken();
    return `Bearer ${token}`;
  }

  /**
   * Make an authenticated request to Aidbox using the system token
   */
  async request(path: string, options: RequestInit = {}): Promise<Response> {
    const url = `${this.baseUrl}${path}`;
    const authHeader = await this.getAuthHeader();
    
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Authorization': authHeader,
      ...(options.headers as Record<string, string> || {}),
    };

    return fetch(url, { ...options, headers });
  }

  async requestAsUser(path: string, options: RequestInit = {}, userAuth: string): Promise<Response> {
    const url = `${this.baseUrl}${path}`;
    const headers: Record<string, string> = {
      'Content-Type': 'application/fhir+json',
      'Accept': 'application/fhir+json',
      'Authorization': userAuth,
      ...(options.headers as Record<string, string> || {}),
    };

    return fetch(url, { ...options, headers });
  }

  async searchUsers(query: string = ''): Promise<AidboxUser[]> {
    const searchParam = query ? `&.name:ilike=${encodeURIComponent(query)}` : '';
    const response = await this.request(`/User?_count=50${searchParam}`);
    const data = await response.json() as Bundle<AidboxUser>;
    return data.entry?.map(e => e.resource) || [];
  }

  async getClients(query: string = ''): Promise<AidboxClient[]> {
    const searchParam = query ? `&.id:ilike=${encodeURIComponent(query)}` : '';
    const response = await this.request(`/Client?_count=50${searchParam}`);
    const data = await response.json() as Bundle<AidboxClient>;
    return data.entry?.map(e => e.resource) || [];
  }

  /**
   * Build a FHIR Batch request to test all operations for multiple resource types
   */
  private buildBatchRequest(resourceTypes: string[], sampleIds: Record<string, string | null>): BatchRequest {
    const entries: BatchRequestEntry[] = [];

    for (const resourceType of resourceTypes) {
      const sampleId = sampleIds[resourceType];
      
      for (const op of OPERATIONS) {
        const url = op.getUrl(resourceType, sampleId || undefined);
        const fullUrl = `urn:uuid:${resourceType}-${op.key}`;
        
        const entry: BatchRequestEntry = {
          fullUrl,
          request: {
            method: op.method,
            url,
          },
        };

        // For create operations, include a minimal resource body
        if (op.key === 'create') {
          entry.resource = { resourceType };
        }
        // For update operations, include the resource body
        if (op.key === 'update') {
          entry.resource = { 
            resourceType, 
            id: sampleId || '__nonexistent__' 
          };
        }
        // For patch operations, include a JSON Patch body
        if (op.key === 'patch') {
          entry.resource = [
            { op: 'test', path: '/resourceType', value: resourceType }
          ];
        }

        entries.push(entry);
      }
    }

    return {
      resourceType: 'Bundle',
      type: 'batch',
      entry: entries,
    };
  }

  /**
   * Parse the batch response and extract results for each resource/operation
   */
  private parseBatchResponse(
    response: BatchResponse, 
    resourceTypes: string[]
  ): Record<string, AccessTestResults> {
    const results: Record<string, AccessTestResults> = {};
    
    // Initialize results structure
    for (const resourceType of resourceTypes) {
      results[resourceType] = {};
    }

    // Map response entries back to resource/operation
    let entryIndex = 0;
    for (const resourceType of resourceTypes) {
      for (const op of OPERATIONS) {
        const entry = response.entry[entryIndex];
        const status = parseInt(entry?.response?.status || '0', 10);
        const url = op.getUrl(resourceType);

        results[resourceType][op.key] = {
          operation: op.key,
          resourceType,
          method: op.method,
          path: `/${url}`,
          status,
          statusText: this.getStatusText(status),
          accessPolicy: null, // Batch responses don't include this header per-entry
          allowed: status >= 200 && status < 300,
          denied: status === 403,
          notFound: status === 404,
          error: status >= 400 ? entry?.resource : undefined,
          body: entry?.resource,
        };

        entryIndex++;
      }
    }

    return results;
  }

  private getStatusText(status: number): string {
    const statusTexts: Record<number, string> = {
      200: 'OK',
      201: 'Created',
      204: 'No Content',
      400: 'Bad Request',
      401: 'Unauthorized',
      403: 'Forbidden',
      404: 'Not Found',
      405: 'Method Not Allowed',
      409: 'Conflict',
      422: 'Unprocessable Entity',
      500: 'Internal Server Error',
    };
    return statusTexts[status] || 'Unknown';
  }

  /**
   * Test access for multiple resource types using a single FHIR Batch request
   * This is much more efficient than making individual requests
   */
  async testAccessBatch(
    resourceTypes: string[], 
    userAuth: string,
    sampleIds: Record<string, string | null> = {}
  ): Promise<Record<string, AccessTestResults>> {
    try {
      // Build the batch request
      const batchRequest = this.buildBatchRequest(resourceTypes, sampleIds);

      // Send the batch request
      const response = await this.requestAsUser('/fhir', {
        method: 'POST',
        body: JSON.stringify(batchRequest),
      }, userAuth);

      if (!response.ok && response.status !== 200) {
        // If the batch request itself fails, return error results for all
        const errorBody = await response.json().catch(() => null);
        return this.buildErrorResults(resourceTypes, response.status, errorBody);
      }

      const batchResponse = await response.json() as BatchResponse;
      
      // Parse and return results
      return this.parseBatchResponse(batchResponse, resourceTypes);
    } catch (error) {
      console.error('Batch request failed:', error);
      return this.buildErrorResults(
        resourceTypes, 
        0, 
        error instanceof Error ? error.message : 'Unknown error'
      );
    }
  }

  private buildErrorResults(
    resourceTypes: string[], 
    status: number, 
    error: unknown
  ): Record<string, AccessTestResults> {
    const results: Record<string, AccessTestResults> = {};
    
    for (const resourceType of resourceTypes) {
      results[resourceType] = {};
      for (const op of OPERATIONS) {
        results[resourceType][op.key] = {
          operation: op.key,
          resourceType,
          method: op.method,
          path: `/${op.getUrl(resourceType)}`,
          status,
          statusText: 'Error',
          accessPolicy: null,
          allowed: false,
          denied: status === 403,
          notFound: false,
          error,
        };
      }
    }
    
    return results;
  }

  /**
   * Get sample resource IDs for testing read/update/delete operations
   * Uses a batch request to fetch samples for all resource types at once
   */
  async getResourceSamples(resourceTypes: string[]): Promise<Record<string, string | null>> {
    const samples: Record<string, string | null> = {};
    
    // Build batch request to get one sample of each resource type
    const entries: BatchRequestEntry[] = resourceTypes.map(resourceType => ({
      fullUrl: `urn:uuid:sample-${resourceType}`,
      request: {
        method: 'GET',
        url: `${resourceType}?_count=1`,
      },
    }));

    const batchRequest: BatchRequest = {
      resourceType: 'Bundle',
      type: 'batch',
      entry: entries,
    };

    try {
      const response = await this.request('/fhir', {
        method: 'POST',
        body: JSON.stringify(batchRequest),
        headers: {
          'Content-Type': 'application/fhir+json',
          'Accept': 'application/fhir+json',
        },
      });

      const batchResponse = await response.json() as BatchResponse;

      // Extract sample IDs from response
      for (let i = 0; i < resourceTypes.length; i++) {
        const entry = batchResponse.entry[i];
        const resource = entry?.resource as { entry?: Array<{ resource: { id: string } }> } | undefined;
        samples[resourceTypes[i]] = resource?.entry?.[0]?.resource?.id || null;
      }
    } catch (error) {
      console.error('Failed to get resource samples:', error);
      // Return null for all on error
      for (const rt of resourceTypes) {
        samples[rt] = null;
      }
    }

    return samples;
  }

  // Legacy method for backward compatibility - now uses batch internally
  async testAllOperations(
    resourceType: string, 
    userAuth: string, 
    existingResourceId: string | null = null
  ): Promise<AccessTestResults> {
    const sampleIds = { [resourceType]: existingResourceId };
    const results = await this.testAccessBatch([resourceType], userAuth, sampleIds);
    return results[resourceType] || {};
  }

  // Legacy method
  async getResourceSample(resourceType: string): Promise<string | null> {
    const samples = await this.getResourceSamples([resourceType]);
    return samples[resourceType] || null;
  }
}

export const aidboxService = new AidboxService();
