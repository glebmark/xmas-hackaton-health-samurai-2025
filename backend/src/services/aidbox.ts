import type { 
  AidboxUser, 
  AidboxClient, 
  AccessTestResult, 
  AccessTestResults,
  AidboxRequestResult,
  Bundle
} from '../types.js';

class AidboxService {
  private baseUrl: string;
  private clientId: string;
  private clientSecret: string;

  constructor() {
    this.baseUrl = process.env.AIDBOX_URL || '';
    this.clientId = process.env.AIDBOX_CLIENT_ID || '';
    this.clientSecret = process.env.AIDBOX_CLIENT_SECRET || '';
  }

  private getBasicAuthHeader(): string {
    const credentials = Buffer.from(`${this.clientId}:${this.clientSecret}`).toString('base64');
    return `Basic ${credentials}`;
  }

  async request(path: string, options: RequestInit = {}): Promise<Response> {
    const url = `${this.baseUrl}${path}`;
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      'Authorization': this.getBasicAuthHeader(),
      ...options.headers,
    };

    const response = await fetch(url, {
      ...options,
      headers,
    });

    return response;
  }

  async requestAsUser(path: string, options: RequestInit = {}, userAuth: string): Promise<AidboxRequestResult> {
    const url = `${this.baseUrl}${path}`;
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      'Authorization': userAuth,
      ...options.headers,
    };

    const response = await fetch(url, {
      ...options,
      headers,
    });

    let body: unknown = null;
    try {
      body = await response.json();
    } catch {
      // Response might not be JSON
    }

    return {
      status: response.status,
      statusText: response.statusText,
      headers: Object.fromEntries(response.headers.entries()),
      body,
    };
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

  async testAccessDirect(
    resourceType: string, 
    operation: string, 
    userAuth: string, 
    resourceId: string | null = null
  ): Promise<AccessTestResult> {
    const testId = resourceId || '__nonexistent__';
    let path: string;
    let method: string;
    let body: string | null = null;

    switch (operation) {
      case 'search':
        path = `/${resourceType}?_count=0`;
        method = 'GET';
        break;
      case 'read':
        path = `/${resourceType}/${testId}`;
        method = 'GET';
        break;
      case 'create':
        path = `/${resourceType}/$validate`;
        method = 'POST';
        body = JSON.stringify({ resourceType });
        break;
      case 'update':
        path = `/${resourceType}/${testId}`;
        method = 'GET';
        break;
      case 'delete':
        path = `/${resourceType}/${testId}`;
        method = 'GET';
        break;
      case 'patch':
        path = `/${resourceType}/${testId}`;
        method = 'GET';
        break;
      default:
        throw new Error(`Unknown operation: ${operation}`);
    }

    const result = await this.requestAsUser(path, {
      method,
      body: body || undefined,
    }, userAuth);

    const accessPolicy = result.headers['x-aidbox-access-policy'] || 
                         result.headers['x-access-policy'] ||
                         null;

    return {
      operation,
      resourceType,
      method,
      path,
      status: result.status,
      statusText: result.statusText,
      accessPolicy,
      allowed: result.status >= 200 && result.status < 300,
      denied: result.status === 403,
      notFound: result.status === 404,
      error: result.status >= 400 ? result.body : undefined,
    };
  }

  async testAllOperations(
    resourceType: string, 
    userAuth: string, 
    existingResourceId: string | null = null
  ): Promise<AccessTestResults> {
    const operations = ['search', 'read', 'create', 'update', 'delete', 'patch'];
    const results: AccessTestResults = {};

    for (const operation of operations) {
      try {
        results[operation] = await this.testAccessDirect(resourceType, operation, userAuth, existingResourceId);
      } catch (error) {
        results[operation] = {
          operation,
          resourceType,
          method: '',
          path: '',
          status: 0,
          statusText: '',
          accessPolicy: null,
          error: error instanceof Error ? error.message : 'Unknown error',
          allowed: false,
          denied: false,
          notFound: false,
        };
      }
    }

    return results;
  }

  async getResourceSample(resourceType: string): Promise<string | null> {
    try {
      const response = await this.request(`/${resourceType}?_count=1`);
      const data = await response.json() as Bundle<{ id: string }>;
      if (data.entry && data.entry.length > 0) {
        return data.entry[0].resource.id;
      }
    } catch (e) {
      console.error(`Failed to get sample for ${resourceType}:`, e instanceof Error ? e.message : e);
    }
    return null;
  }
}

export const aidboxService = new AidboxService();

