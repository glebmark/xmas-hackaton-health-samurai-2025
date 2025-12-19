import React, { useMemo } from 'react';
import {
  Check,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  FileQuestion,
  ShieldX,
  Ban,
  Info,
} from 'lucide-react';
import StatusCell from './StatusCell';
import type {
  ResourceInfo,
  Pagination,
  ResourceAccessResults,
  OperationInfo,
} from '../types';

const OPERATIONS: OperationInfo[] = [
  { key: 'search', label: 'Search', method: 'GET', path: '/{resource}' },
  { key: 'read', label: 'Read', method: 'GET', path: '/{resource}/{id}' },
  { key: 'create', label: 'Create', method: 'POST', path: '/{resource}' },
  { key: 'update', label: 'Update', method: 'PUT', path: '/{resource}/{id}' },
  { key: 'patch', label: 'Patch', method: 'PATCH', path: '/{resource}/{id}' },
  {
    key: 'delete',
    label: 'Delete',
    method: 'DELETE',
    path: '/{resource}/{id}',
  },
];

interface AccessMatrixProps {
  results: ResourceAccessResults | null;
  resources: ResourceInfo[];
  isLoading: boolean;
  pagination: Pagination;
  onPageChange: (page: number) => void;
  groupByCategory: boolean;
}

function AccessMatrix({
  results,
  resources,
  isLoading,
  pagination,
  onPageChange,
  groupByCategory,
}: AccessMatrixProps): React.ReactElement {
  // Always show all resources (no status filtering)
  const filteredResources = resources;

  // Group resources by category if enabled
  const groupedResources = useMemo(() => {
    if (!groupByCategory) {
      return { '': filteredResources };
    }

    const groups: Record<string, ResourceInfo[]> = {};
    filteredResources.forEach((resource) => {
      const category = resource.category || 'Other';
      if (!groups[category]) {
        groups[category] = [];
      }
      groups[category].push(resource);
    });

    return groups;
  }, [filteredResources, groupByCategory]);

  const renderResourceRow = (
    resource: ResourceInfo,
    index: number
  ): React.ReactElement => (
    <tr
      key={resource.name}
      className={`border-b border-white/5 hover:bg-white/[0.02] transition-colors animate-fade-in stagger-${
        index + 1
      }`}
    >
      <td className='px-6 py-4'>
        <div className='flex items-center gap-3'>
          <div className='w-8 h-8 rounded-lg bg-gradient-to-br from-aurora-green/20 to-aurora-blue/20 flex items-center justify-center'>
            <span className='text-xs font-bold text-aurora-green'>
              {resource.name.slice(0, 2).toUpperCase()}
            </span>
          </div>
          <div className='min-w-0'>
            <p className='text-white font-medium'>{resource.name}</p>
            <p className='text-xs text-gray-500 max-w-[200px] line-clamp-2'>
              {resource.description}
            </p>
          </div>
        </div>
      </td>
      {OPERATIONS.map((op, opIndex) => (
        <td key={op.key} className='px-3 py-4'>
          <StatusCell
            result={results?.[resource.name]?.[op.key]}
            isLoading={isLoading}
            operation={op}
            resourceType={resource.name}
            isRightmost={opIndex === OPERATIONS.length - 1}
          />
        </td>
      ))}
    </tr>
  );

  return (
    <div className='glass rounded-2xl animate-slide-up stagger-2 relative z-10'>
      {/* Header */}
      <div className='px-6 py-4 border-b border-white/5 flex items-center justify-between'>
        <div>
          <h2 className='text-lg font-semibold text-white'>
            Access Policy Matrix
          </h2>
          {(results || isLoading || filteredResources.length > 0) && (
            <p className='text-sm text-gray-500'>
              Showing {filteredResources.length} resources • Page{' '}
              {pagination.currentPage} of {pagination.totalPages}
            </p>
          )}
        </div>

        {/* Legend */}
        {(results || isLoading) && (
          <div className='flex items-center gap-4 text-xs flex-wrap'>
            <div className='flex items-center gap-1.5'>
              <div className='w-4 h-4 rounded status-allowed flex items-center justify-center'>
                <Check className='w-3 h-3' />
              </div>
              <span className='text-gray-400'>Allowed</span>
            </div>
            <div className='flex items-center gap-1.5'>
              <div className='w-4 h-4 rounded status-unauthorized flex items-center justify-center'>
                <ShieldX className='w-3 h-3' />
              </div>
              <span className='text-gray-400'>Unauthorized</span>
            </div>
            <div className='flex items-center gap-1.5'>
              <div className='w-4 h-4 rounded status-forbidden flex items-center justify-center'>
                <Ban className='w-3 h-3' />
              </div>
              <span className='text-gray-400'>Forbidden</span>
            </div>
            <div className='flex items-center gap-1.5'>
              <div className='w-4 h-4 rounded status-not-found flex items-center justify-center'>
                <FileQuestion className='w-3 h-3' />
              </div>
              <span className='text-gray-400'>Not Found</span>
            </div>
            <div className='flex items-center gap-1.5'>
              <div className='w-4 h-4 rounded status-error flex items-center justify-center'>
                <AlertTriangle className='w-3 h-3' />
              </div>
              <span className='text-gray-400'>Error</span>
            </div>
            <div className='flex items-center gap-1.5 border-l border-white/10 pl-4'>
              <div className='w-3 h-3 bg-aurora-purple rounded-full' />
              <span className='text-gray-400'>Has Policy</span>
            </div>
          </div>
        )}
      </div>

      {/* Matrix Table */}
      <div>
        {!results && !isLoading && filteredResources.length === 0 && (
          <div className='px-6 py-12 flex flex-col items-center justify-center text-center'>
            <div className='w-16 h-16 rounded-full bg-aurora-blue/10 flex items-center justify-center mb-4'>
              <Info className='w-8 h-8 text-aurora-blue' />
            </div>
            <h3 className='text-lg font-semibold text-white mb-2'>
              No Resources Found
            </h3>
            <p className='text-gray-400 max-w-md'>
              Try adjusting your search or filter criteria to find resources.
            </p>
          </div>
        )}

        {(results || isLoading || filteredResources.length > 0) && (
          <table className='w-full'>
            <thead>
              <tr className='border-b border-white/5'>
                <th className='px-6 py-4 text-left text-sm font-medium text-gray-400 w-48'>
                  Resource
                </th>
                {OPERATIONS.map((op) => (
                  <th
                    key={op.key}
                    className='px-3 py-4 text-center text-sm font-medium text-gray-400'
                  >
                    <div className='flex flex-col items-center'>
                      <span className='font-mono text-xs px-2 py-0.5 rounded bg-midnight-700 text-gray-300 mb-1'>
                        {op.method}
                      </span>
                      <span>{op.label}</span>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {groupByCategory
                ? Object.entries(groupedResources).map(
                    ([category, categoryResources], categoryIndex) => (
                      <React.Fragment key={category}>
                        {category && (
                          <tr className='bg-white/[0.02]'>
                            <td
                              colSpan={OPERATIONS.length + 1}
                              className='px-6 py-3'
                            >
                              <div className='flex items-center gap-2'>
                                <div className='h-px flex-1 bg-gradient-to-r from-transparent via-aurora-blue/30 to-transparent' />
                                <span className='text-sm font-semibold text-aurora-blue uppercase tracking-wider'>
                                  {category}
                                </span>
                                <div className='h-px flex-1 bg-gradient-to-r from-transparent via-aurora-blue/30 to-transparent' />
                              </div>
                            </td>
                          </tr>
                        )}
                        {categoryResources.map((resource, index) =>
                          renderResourceRow(
                            resource,
                            categoryIndex * 10 + index
                          )
                        )}
                      </React.Fragment>
                    )
                  )
                : filteredResources.map((resource, index) =>
                    renderResourceRow(resource, index)
                  )}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination - only show when there are results */}
      {(results || isLoading || filteredResources.length > 0) && (
        <div className='px-6 py-4 border-t border-white/5 flex items-center justify-between'>
          <p className='text-sm text-gray-500'>
            Showing {(pagination.currentPage - 1) * pagination.limit + 1} to{' '}
            {Math.min(
              pagination.currentPage * pagination.limit,
              pagination.totalResources
            )}{' '}
            of {pagination.totalResources} resources
          </p>

          <div className='flex items-center gap-2'>
            <button
              onClick={() => onPageChange(pagination.currentPage - 1)}
              disabled={pagination.currentPage === 1}
              className='p-2 rounded-lg bg-midnight-700 hover:bg-midnight-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors'
            >
              <ChevronLeft className='w-5 h-5 text-gray-400' />
            </button>

            <div className='flex items-center gap-1'>
              {Array.from(
                { length: pagination.totalPages },
                (_, i) => i + 1
              ).map((page) => (
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
              className='p-2 rounded-lg bg-midnight-700 hover:bg-midnight-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors'
            >
              <ChevronRight className='w-5 h-5 text-gray-400' />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default AccessMatrix;
