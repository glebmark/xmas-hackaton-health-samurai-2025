import React from 'react';
import { Check, X, AlertTriangle, HelpCircle, ChevronLeft, ChevronRight, FileQuestion } from 'lucide-react';
import StatusCell from './StatusCell';
import type { ResourceInfo, Pagination, ResourceAccessResults, OperationInfo } from '../types';

const OPERATIONS: OperationInfo[] = [
  { key: 'search', label: 'Search', method: 'GET', path: '/{resource}' },
  { key: 'read', label: 'Read', method: 'GET', path: '/{resource}/{id}' },
  { key: 'create', label: 'Create', method: 'POST', path: '/{resource}' },
  { key: 'update', label: 'Update', method: 'PUT', path: '/{resource}/{id}' },
  { key: 'patch', label: 'Patch', method: 'PATCH', path: '/{resource}/{id}' },
  { key: 'delete', label: 'Delete', method: 'DELETE', path: '/{resource}/{id}' },
];

interface AccessMatrixProps {
  results: ResourceAccessResults | null;
  resources: ResourceInfo[];
  isLoading: boolean;
  pagination: Pagination;
  onPageChange: (page: number) => void;
}

function AccessMatrix({ results, resources, isLoading, pagination, onPageChange }: AccessMatrixProps): React.ReactElement {
  return (
    <div className="glass rounded-2xl overflow-hidden animate-slide-up stagger-2">
      {/* Header */}
      <div className="px-6 py-4 border-b border-white/5 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-white">Access Policy Matrix</h2>
          <p className="text-sm text-gray-500">
            Showing {resources.length} resources • Page {pagination.currentPage} of {pagination.totalPages}
          </p>
        </div>
        
        {/* Legend */}
        <div className="flex items-center gap-4 text-xs">
          <div className="flex items-center gap-1.5">
            <div className="w-4 h-4 rounded status-allowed flex items-center justify-center">
              <Check className="w-3 h-3" />
            </div>
            <span className="text-gray-400">Allowed</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-4 h-4 rounded status-denied flex items-center justify-center">
              <X className="w-3 h-3" />
            </div>
            <span className="text-gray-400">Denied</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-4 h-4 rounded status-not-found flex items-center justify-center">
              <FileQuestion className="w-3 h-3" />
            </div>
            <span className="text-gray-400">Not Found</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-4 h-4 rounded status-error flex items-center justify-center">
              <AlertTriangle className="w-3 h-3" />
            </div>
            <span className="text-gray-400">Error</span>
          </div>
        </div>
      </div>

      {/* Matrix Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-white/5">
              <th className="px-6 py-4 text-left text-sm font-medium text-gray-400 w-48">
                Resource
              </th>
              {OPERATIONS.map((op) => (
                <th key={op.key} className="px-3 py-4 text-center text-sm font-medium text-gray-400">
                  <div className="flex flex-col items-center">
                    <span className="font-mono text-xs px-2 py-0.5 rounded bg-midnight-700 text-gray-300 mb-1">
                      {op.method}
                    </span>
                    <span>{op.label}</span>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {resources.map((resource, index) => (
              <tr
                key={resource.name}
                className={`border-b border-white/5 hover:bg-white/[0.02] transition-colors animate-fade-in stagger-${index + 1}`}
              >
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-aurora-green/20 to-aurora-blue/20 flex items-center justify-center">
                      <span className="text-xs font-bold text-aurora-green">
                        {resource.name.slice(0, 2).toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <p className="text-white font-medium">{resource.name}</p>
                      <p className="text-xs text-gray-500 max-w-[200px] truncate">
                        {resource.description}
                      </p>
                    </div>
                  </div>
                </td>
                {OPERATIONS.map((op) => (
                  <td key={op.key} className="px-3 py-4">
                    <StatusCell
                      result={results?.[resource.name]?.[op.key]}
                      isLoading={isLoading}
                      operation={op}
                      resourceType={resource.name}
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="px-6 py-4 border-t border-white/5 flex items-center justify-between">
        <p className="text-sm text-gray-500">
          Showing {(pagination.currentPage - 1) * pagination.limit + 1} to{' '}
          {Math.min(pagination.currentPage * pagination.limit, pagination.totalResources)} of{' '}
          {pagination.totalResources} resources
        </p>
        
        <div className="flex items-center gap-2">
          <button
            onClick={() => onPageChange(pagination.currentPage - 1)}
            disabled={pagination.currentPage === 1}
            className="p-2 rounded-lg bg-midnight-700 hover:bg-midnight-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronLeft className="w-5 h-5 text-gray-400" />
          </button>
          
          <div className="flex items-center gap-1">
            {Array.from({ length: pagination.totalPages }, (_, i) => i + 1).map((page) => (
              <button
                key={page}
                onClick={() => onPageChange(page)}
                className={`w-8 h-8 rounded-lg text-sm font-medium transition-colors ${
                  page === pagination.currentPage
                    ? 'bg-aurora-green text-white'
                    : 'bg-midnight-700 text-gray-400 hover:bg-midnight-600'
                }`}
              >
                {page}
              </button>
            ))}
          </div>
          
          <button
            onClick={() => onPageChange(pagination.currentPage + 1)}
            disabled={pagination.currentPage === pagination.totalPages}
            className="p-2 rounded-lg bg-midnight-700 hover:bg-midnight-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronRight className="w-5 h-5 text-gray-400" />
          </button>
        </div>
      </div>
    </div>
  );
}

export default AccessMatrix;

