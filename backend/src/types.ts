export interface AidboxUser {
  id: string;
  resourceType: 'User';
  name?: {
    givenName?: string;
    familyName?: string;
  };
  email?: string;
  password?: string;
}

export interface AidboxClient {
  id: string;
  resourceType: 'Client';
  secret?: string;
  grant_types?: string[];
}

export interface AccessTestResult {
  operation: string;
  resourceType: string;
  method: string;
  path: string;
  status: number;
  statusText: string;
  accessPolicy: string | null;
  allowed: boolean;
  denied: boolean;
  notFound: boolean;
  error?: unknown;
  body?: unknown;
}

export interface AccessTestResults {
  [operation: string]: AccessTestResult;
}

export interface ResourceInfo {
  name: string;
  description: string;
}

export interface PaginatedResponse<T> {
  resources: T[];
  pagination: {
    currentPage: number;
    totalPages: number;
    totalResources: number;
    limit: number;
  };
}

export interface AidboxRequestResult {
  status: number;
  statusText: string;
  headers: Record<string, string>;
  body: unknown;
}

export interface BundleEntry<T> {
  resource: T;
}

export interface Bundle<T> {
  entry?: BundleEntry<T>[];
}

export interface CompareResults {
  user1: Record<string, AccessTestResults>;
  user2: Record<string, AccessTestResults>;
}

