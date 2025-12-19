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
  error?: string;
  error_description?: string;
}

// Cached token with expiration
interface CachedToken {
  accessToken: string;
  expiresAt: number; // Unix timestamp in milliseconds
}

// User auth info passed from frontend
export interface UserAuthInfo {
  type: 'user' | 'client';
  id: string;
  secret?: string;    // For clients
  password?: string;  // For users
}

class AidboxService {
  private _baseUrl: string | null = null;
  private _clientId: string | null = null;
  private _clientSecret: string | null = null;
  private _userAuthClientId: string | null = null;
  private _userAuthClientSecret: string | null = null;
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

  // Client for password grant (user authentication)
  // Falls back to main client if not specified
  private get userAuthClientId(): string {
    if (this._userAuthClientId === null) {
      this._userAuthClientId = process.env.AIDBOX_USER_AUTH_CLIENT_ID || this.clientId;
    }
    return this._userAuthClientId;
  }

  private get userAuthClientSecret(): string {
    if (this._userAuthClientSecret === null) {
      this._userAuthClientSecret = process.env.AIDBOX_USER_AUTH_CLIENT_SECRET || this.clientSecret;
    }
    return this._userAuthClientSecret;
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

    // Debug: Log what credentials we're using
    console.log(`🔐 Attempting token request with client_id: ${this.clientId}`);
    console.log(`🔐 Client secret length: ${this.clientSecret.length}, first 5 chars: ${this.clientSecret.substring(0, 5)}...`);

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

  /**
   * Get an access token for a User using OAuth password grant.
   * This is needed because Users can't use Basic auth directly on FHIR endpoints.
   * 
   * Uses AIDBOX_USER_AUTH_CLIENT_ID/SECRET if configured, otherwise falls back to main client.
   * The client must have 'password' grant type enabled.
   */
  async getUserToken(userId: string, password: string): Promise<string> {
    const tokenUrl = `${this.baseUrl}/auth/token`;
    
    console.log(`🔐 Getting user token for user: ${userId}`);
    console.log(`🔐 Using password grant client: ${this.userAuthClientId}`);
    console.log(`🔐 Client secret length: ${this.userAuthClientSecret.length}`);
    
    const response = await fetch(tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        grant_type: 'password',
        username: userId,
        password: password,
        client_id: this.userAuthClientId,
        client_secret: this.userAuthClientSecret,
      }),
    });

    const tokenData = await response.json() as TokenResponse;
    
    if (!response.ok || tokenData.error) {
      console.error('Failed to get user token:', tokenData);
      
      // Provide helpful error message if password grant is not allowed
      if (tokenData.error === 'invalid_grant' && tokenData.error_description?.includes('password grant is not allowed')) {
        throw new Error(
          `Password grant not allowed for client "${this.userAuthClientId}". ` +
          `Either enable password grant on this client in Aidbox, or set AIDBOX_USER_AUTH_CLIENT_ID/SECRET ` +
          `environment variables to a client that supports password grant.`
        );
      }
      
      throw new Error(tokenData.error_description || tokenData.error || `Failed to authenticate user: ${response.status}`);
    }

    console.log(`🔑 Obtained user token for ${userId}`);
    return tokenData.access_token;
  }

  /**
   * Get a token for a client using client_credentials grant.
   */
  private async getClientToken(clientId: string, clientSecret: string): Promise<string> {
    const tokenUrl = `${this.baseUrl}/auth/token`;
    
    const response = await fetch(tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        grant_type: 'client_credentials',
        client_id: clientId,
        client_secret: clientSecret,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error(`Failed to get client token for ${clientId}:`, error);
      throw new Error(`Failed to get client token: ${response.status} ${error}`);
    }

    const tokenData = await response.json() as TokenResponse;
    console.log(`🔑 Obtained client token for ${clientId}`);
    return tokenData.access_token;
  }

  /**
   * Resolve UserAuthInfo to an Authorization header.
   * - For clients: OAuth client_credentials grant to get Bearer token
   * - For users: OAuth password grant to get Bearer token
   */
  async resolveAuthHeader(authInfo: UserAuthInfo): Promise<string> {
    if (authInfo.type === 'client') {
      // Clients use client_credentials grant to get a token
      if (!authInfo.secret) {
        throw new Error('Client secret is required for client authentication.');
      }
      const token = await this.getClientToken(authInfo.id, authInfo.secret);
      return `Bearer ${token}`;
    } else {
      // Users MUST use OAuth password grant
      if (!authInfo.password) {
        throw new Error('Password is required for user authentication. Please enter the user\'s password.');
      }
      const token = await this.getUserToken(authInfo.id, authInfo.password);
      return `Bearer ${token}`;
    }
  }

  /**
   * Verify credentials by making a simple test request
   * Returns whether the credentials are valid
   */
  async verifyCredentials(authHeader: string): Promise<{ valid: boolean; message?: string }> {
    try {
      // Make a simple request to get the current user info
      // This endpoint should be accessible to any authenticated user
      const response = await this.requestAsUser('/auth/userinfo', { method: 'GET' }, authHeader);
      
      if (response.ok) {
        return { valid: true };
      } else if (response.status === 401 || response.status === 403) {
        return { valid: false, message: 'Invalid credentials' };
      } else {
        console.error('Unexpected response status:', response.status);
        return { valid: false, message: `Unexpected error: ${response.status}` };
      }
    } catch (error) {
      console.error('Credential verification error:', error);
      return { valid: false, message: 'Failed to verify credentials' };
    }
  }

  /**
   * Try to get access policy name from response headers.
   * Aidbox may return x-access-policy header when BOX_SECURITY_DEV_MODE is enabled.
   * Returns null if not available (this is expected in many configurations).
   */
  private getAccessPolicyFromHeaders(response: Response): string | null {
    // Try various header names that Aidbox might use
    return response.headers.get('x-access-policy') 
      || response.headers.get('x-aidbox-access-policy')
      || response.headers.get('x-debug')
      || null;
  }

  /**
   * Use __debug=policy to find which access policy allowed a request.
   * This makes a separate request with the debug parameter to get policy evaluation info.
   * Requires BOX_SECURITY_DEV_MODE=true in Aidbox.
   * 
   * @see https://docs.aidbox.app/tutorials/security-access-control-tutorials/debug
   */
  private async findAllowingPolicy(
    url: string,
    method: string,
    userAuth: string,
    body?: string,
    headers?: Record<string, string>
  ): Promise<string | null> {
    try {
      // Add __debug=policy to the URL
      const debugUrl = url.includes('?') 
        ? `${url}&__debug=policy` 
        : `${url}?__debug=policy`;
      
      const fullUrl = `${this.baseUrl}/fhir/${debugUrl}`;
      
      const response = await fetch(fullUrl, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': userAuth,
          ...headers,
        },
        body: method !== 'GET' && method !== 'DELETE' ? body : undefined,
      });

      const data = await response.json() as {
        policies?: Array<{
          id?: string;
          'eval-result'?: boolean;
        }>;
        request?: {
          policies?: Array<{
            id?: string;
            'eval-result'?: boolean;
          }>;
        };
      };

      // Debug log for first few requests to understand the response structure
      if (url.includes('Client') && method === 'GET') {
        console.log(`🔍 Debug policy response for ${method} ${url}:`);
        console.log(`   Response keys: ${Object.keys(data).join(', ')}`);
        const policies = data.policies || data.request?.policies || [];
        console.log(`   Policies found: ${policies.length}`);
        if (policies.length > 0) {
          console.log(`   First policy: ${JSON.stringify(policies[0], null, 2).substring(0, 300)}`);
          const allowing = policies.find(p => p['eval-result'] === true);
          if (allowing) {
            console.log(`   ✅ Allowing policy: ${allowing.id}`);
          }
        }
      }

      // Find the policy that evaluated to true (allowed the request)
      const policies = data.policies || data.request?.policies || [];
      const allowingPolicy = policies.find(p => p['eval-result'] === true);
      
      if (allowingPolicy?.id) {
        return allowingPolicy.id;
      }

      return null;
    } catch (error) {
      // Debug endpoint might not be available
      return null;
    }
  }

  async searchUsers(query: string = ''): Promise<AidboxUser[]> {
    // Use FHIR API for better compatibility with access policies
    // Using _filter with ILIKE for case-insensitive search
    const searchParam = query ? `&_ilike="${encodeURIComponent(query)}%25"` : '';
    console.log(`🔍 Searching users with query: ${query}`);
    const response = await this.request(`/fhir/User?_count=50${searchParam}`);
    const data = await response.json() as Bundle<AidboxUser>;
    
    // Debug: log raw response
    console.log(`📦 User search response status: ${response.status}`);
    console.log(`📦 User search total: ${(data as { total?: number }).total ?? 'N/A'}, entries: ${data.entry?.length ?? 0}`);
    if (!data.entry?.length) {
      console.log(`📦 Raw response:`, JSON.stringify(data, null, 2).slice(0, 500));
    }
    
    return data.entry?.map(e => e.resource) || [];
  }

  async getClients(query: string = ''): Promise<AidboxClient[]> {
    // Use FHIR API for better compatibility with access policies
    // Using _filter with ILIKE for case-insensitive search
    const searchParam = query ? `&_filter=id ILIKE "${encodeURIComponent(query)}%25"` : '';
    const response = await this.request(`/fhir/Client?_count=50${searchParam}`);
    const data = await response.json() as Bundle<AidboxClient>;
    const clients = data.entry?.map(e => e.resource) || [];
    console.log(`✅ Found ${clients.length} clients`);
    return clients;
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
          unauthorized: status === 401,
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
      410: 'Gone',
      422: 'Unprocessable Entity',
      500: 'Internal Server Error',
    };
    return statusTexts[status] || 'Unknown';
  }

  /**
   * Test a single operation for a resource type
   */
  private async testSingleOperation(
    resourceType: string,
    op: OperationConfig,
    userAuth: string,
    sampleId: string | null
  ): Promise<AccessTestResult> {
    const baseUrl = op.getUrl(resourceType, sampleId || undefined);
    const url = `/fhir/${baseUrl}`;
    
    let body: string | undefined = undefined;
    const headers: Record<string, string> = {
      'Accept': 'application/fhir+json',
    };
    
    // For create operations, include a minimal resource body
    if (op.key === 'create') {
      body = JSON.stringify({ resourceType });
      headers['Content-Type'] = 'application/fhir+json';
    }
    // For update operations, include the resource body
    if (op.key === 'update') {
      body = JSON.stringify({ resourceType, id: sampleId || '__nonexistent__' });
      headers['Content-Type'] = 'application/fhir+json';
    }
    // For patch operations, include a JSON Patch body
    if (op.key === 'patch') {
      body = JSON.stringify([{ op: 'test', path: '/resourceType', value: resourceType }]);
      headers['Content-Type'] = 'application/json-patch+json';
    }

    try {
      const response = await this.requestAsUser(url, {
        method: op.method,
        body,
        headers,
      }, userAuth);

      const status = response.status;
      const responseBody = await response.json().catch(() => null) as Record<string, unknown> | null;
      
      // Log first search response for debugging
      if (op.key === 'search' && resourceType === 'Patient') {
        console.log(`🔍 Response for ${resourceType}/${op.key}: status=${status}`);
      }
      
      // Try to get access policy from response headers first
      let accessPolicy = this.getAccessPolicyFromHeaders(response);

      // Determine if access was allowed (vs denied by policy)
      // 404/410/422 mean access was granted but operation failed for other reasons
      const accessAllowed = status >= 200 && status < 300 
        || status === 404  // Not found - access allowed, resource doesn't exist
        || status === 410  // Gone/Deleted - access allowed, resource was deleted  
        || status === 422; // Validation error - access allowed, invalid data

      // If allowed but no policy from headers, use __debug=policy to find which policy allowed
      if (accessAllowed && !accessPolicy) {
        accessPolicy = await this.findAllowingPolicy(
          op.getUrl(resourceType, sampleId || undefined),
          op.method,
          userAuth,
          body,
          headers
        );
      }

      return {
        operation: op.key,
        resourceType,
        method: op.method,
        path: url,
        status,
        statusText: this.getStatusText(status),
        accessPolicy,
        allowed: accessAllowed,
        unauthorized: status === 401,
        denied: status === 403,
        notFound: status === 404 || status === 410,
        error: status >= 400 ? responseBody : undefined,
        body: responseBody,
      };
    } catch (error) {
      return {
        operation: op.key,
        resourceType,
        method: op.method,
        path: url,
        status: 0,
        statusText: 'Error',
        accessPolicy: null,
        allowed: false,
        unauthorized: false,
        denied: false,
        notFound: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Test access for multiple resource types using parallel individual requests.
   * Using individual requests instead of FHIR batch to avoid access policy issues
   * with batch processing (some SQL policies fail on batch context).
   */
  async testAccessBatch(
    resourceTypes: string[], 
    userAuth: string,
    sampleIds: Record<string, string | null> = {}
  ): Promise<Record<string, AccessTestResults>> {
    const results: Record<string, AccessTestResults> = {};
    
    // Initialize results structure
    for (const resourceType of resourceTypes) {
      results[resourceType] = {};
    }

    console.log(`🔄 Testing ${resourceTypes.length} resources × ${OPERATIONS.length} operations = ${resourceTypes.length * OPERATIONS.length} requests (parallel)`);

    // Build all test promises
    const testPromises: Array<{
      resourceType: string;
      opKey: string;
      promise: Promise<AccessTestResult>;
    }> = [];

    for (const resourceType of resourceTypes) {
      const sampleId = sampleIds[resourceType];
      for (const op of OPERATIONS) {
        testPromises.push({
          resourceType,
          opKey: op.key,
          promise: this.testSingleOperation(resourceType, op, userAuth, sampleId),
        });
      }
    }

    // Execute all tests in parallel
    const testResults = await Promise.all(testPromises.map(t => t.promise));

    // Map results back to structure
    for (let i = 0; i < testPromises.length; i++) {
      const { resourceType, opKey } = testPromises[i];
      results[resourceType][opKey] = testResults[i];
    }

    console.log(`✅ Completed ${testResults.length} access tests`);

    return results;
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
          unauthorized: status === 401,
          denied: status === 403,
          notFound: false,
          error,
        };
      }
    }
    
    return results;
  }

  // Sample ID fetching removed - we use __nonexistent__ placeholder IDs instead.
  // For access policy testing, a 404 response means "access allowed but resource not found"
  // which is sufficient to determine the policy grants access.

  // Legacy method for backward compatibility - now uses parallel requests internally
  async testAllOperations(
    resourceType: string, 
    userAuth: string, 
    existingResourceId: string | null = null
  ): Promise<AccessTestResults> {
    const sampleIds = existingResourceId ? { [resourceType]: existingResourceId } : {};
    const results = await this.testAccessBatch([resourceType], userAuth, sampleIds);
    return results[resourceType] || {};
  }

  /**
   * Test a single direct request (not batch) for debugging purposes.
   * This helps diagnose if issues are batch-specific.
   */
  async testSingleRequest(resourceType: string, userAuth: string): Promise<{
    search: { status: number; body: unknown };
    headers: Record<string, string>;
  }> {
    const url = `${this.baseUrl}/fhir/${resourceType}?_count=0`;
    
    console.log(`🔍 Testing single request: GET ${url}`);
    console.log(`   Auth: ${userAuth.substring(0, 20)}...`);
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/fhir+json',
        'Authorization': userAuth,
      },
    });
    
    const body = await response.json();
    const headers: Record<string, string> = {};
    response.headers.forEach((value, key) => {
      headers[key] = value;
    });
    
    console.log(`   Response: ${response.status}`);
    console.log(`   Body:`, JSON.stringify(body, null, 2));
    
    return {
      search: { status: response.status, body },
      headers,
    };
  }
}

export const aidboxService = new AidboxService();
