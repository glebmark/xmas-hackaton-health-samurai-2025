export interface User {
  id: string;
  type: 'user' | 'client';
  name?: {
    givenName?: string;
    familyName?: string;
  };
  clientName?: string; // For clients only
  email?: string;
  password?: string;
  secret?: string;
  grant_types?: string[];
}

export interface AidboxUser {
  id: string;
  name?: {
    givenName?: string;
    familyName?: string;
  };
  email?: string;
}

export interface AidboxClient {
  id: string;
  name?: string;
  secret?: string;
  grant_types?: string[];
}

export interface ResourceInfo {
  name: string;
  description: string;
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
  unauthorized: boolean;
  denied: boolean;
  notFound: boolean;
  error?: unknown;
}

export interface AccessTestResults {
  [operation: string]: AccessTestResult;
}

export interface ResourceAccessResults {
  [resourceType: string]: AccessTestResults;
}

export interface CompareResults {
  user1: ResourceAccessResults;
  user2: ResourceAccessResults;
}

export interface Pagination {
  currentPage: number;
  totalPages: number;
  totalResources: number;
  limit: number;
}

export interface PaginatedResourcesResponse {
  resources: ResourceInfo[];
  pagination: Pagination;
}

export interface OperationInfo {
  key: string;
  label: string;
  method: string;
  path?: string;
}

