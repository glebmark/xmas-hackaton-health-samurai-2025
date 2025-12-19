import React, { useMemo } from 'react';
import { Check, AlertTriangle, FileQuestion, ChevronLeft, ChevronRight, User as UserIcon, Key, Equal, ArrowRight, LucideIcon, ShieldX, Ban } from 'lucide-react';
import type { ResourceInfo, Pagination, CompareResults, User, AccessTestResult, OperationInfo } from '../types';

const OPERATIONS: OperationInfo[] = [
  { key: 'search', label: 'Search', method: 'GET' },
  { key: 'read', label: 'Read', method: 'GET' },
  { key: 'create', label: 'Create', method: 'POST' },
  { key: 'update', label: 'Update', method: 'PUT' },
  { key: 'patch', label: 'Patch', method: 'PATCH' },
  { key: 'delete', label: 'Delete', method: 'DELETE' },
];

interface CompareViewProps {
  results: CompareResults;
  resources: ResourceInfo[];
  user1: User | null;
  user2: User | null;
  pagination: Pagination;
  onPageChange: (page: number) => void;
  groupByCategory: boolean;
}

interface StatusIconResult {
  icon: LucideIcon;
  className: string;
}

function CompareView({ results, resources, user1, user2, pagination, onPageChange, groupByCategory }: CompareViewProps): React.ReactElement {
  const getStatusIcon = (result: AccessTestResult | undefined): StatusIconResult => {
    if (!result) return { icon: AlertTriangle, className: 'text-gray-500' };
    if (result.allowed) return { icon: Check, className: 'text-green-400' };
    if (result.unauthorized) return { icon: ShieldX, className: 'text-orange-400' };
    if (result.denied) return { icon: Ban, className: 'text-red-400' };
    if (result.notFound) return { icon: FileQuestion, className: 'text-yellow-400' };
    return { icon: AlertTriangle, className: 'text-gray-400' };
  };

  const compareResults = (res1: AccessTestResult | undefined, res2: AccessTestResult | undefined): boolean => {
    const getStatus = (r: AccessTestResult | undefined): string => {
      if (!r) return 'error';
      if (r.allowed) return 'allowed';
      if (r.unauthorized) return 'unauthorized';
      if (r.denied) return 'denied';
      if (r.notFound) return 'notFound';
      return 'error';
    };
    return getStatus(res1) === getStatus(res2);
  };

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

  const renderResourceRow = (resource: ResourceInfo, index: number): React.ReactElement => (
    <tr
      key={resource.name}
      className="border-b border-white/5 hover:bg-white/[0.02] transition-colors"
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
          </div>
        </div>
      </td>
      {OPERATIONS.map((op) => {
        const res1 = results?.user1?.[resource.name]?.[op.key];
        const res2 = results?.user2?.[resource.name]?.[op.key];
        const status1 = getStatusIcon(res1);
        const status2 = getStatusIcon(res2);
        const isSame = compareResults(res1, res2);
        const Icon1 = status1.icon;
        const Icon2 = status2.icon;

        return (
          <td key={op.key} className="px-3 py-4">
            <div className={`flex items-center justify-center gap-1 p-2 rounded-lg ${
              isSame ? 'bg-midnight-700' : 'bg-aurora-orange/10 border border-aurora-orange/30'
            }`}>
              <div className={`w-6 h-6 rounded flex items-center justify-center ${
                res1?.allowed ? 'bg-green-500/20' : res1?.unauthorized ? 'bg-orange-500/20' : res1?.denied ? 'bg-red-500/20' : 'bg-gray-500/20'
              }`}>
                <Icon1 className={`w-3 h-3 ${status1.className}`} />
              </div>
              <div className="text-gray-500">
                {isSame ? (
                  <Equal className="w-3 h-3" />
                ) : (
                  <ArrowRight className="w-3 h-3 text-aurora-orange" />
                )}
              </div>
              <div className={`w-6 h-6 rounded flex items-center justify-center ${
                res2?.allowed ? 'bg-green-500/20' : res2?.unauthorized ? 'bg-orange-500/20' : res2?.denied ? 'bg-red-500/20' : 'bg-gray-500/20'
              }`}>
                <Icon2 className={`w-3 h-3 ${status2.className}`} />
              </div>
            </div>
          </td>
        );
      })}
    </tr>
  );

  return (
    <div className="glass rounded-2xl overflow-hidden animate-slide-up stagger-2">
      {/* Header */}
      <div className="px-6 py-4 border-b border-white/5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold text-white">Access Policy Comparison</h2>
            <p className="text-sm text-gray-500">
              Comparing access between two users
            </p>
          </div>
        </div>

        {/* User Cards */}
        <div className="grid grid-cols-2 gap-4">
          <div className="flex items-center gap-3 p-3 bg-midnight-700 rounded-xl border border-aurora-blue/30">
            <div className="w-10 h-10 rounded-lg bg-aurora-blue/20 flex items-center justify-center">
              {user1?.type === 'client' ? (
                <Key className="w-5 h-5 text-aurora-blue" />
              ) : (
                <UserIcon className="w-5 h-5 text-aurora-blue" />
              )}
            </div>
            <div>
              <p className="text-white font-medium">{user1?.id}</p>
              <p className="text-xs text-gray-500">{user1?.type === 'client' ? 'Client' : 'User'}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3 p-3 bg-midnight-700 rounded-xl border border-aurora-purple/30">
            <div className="w-10 h-10 rounded-lg bg-aurora-purple/20 flex items-center justify-center">
              {user2?.type === 'client' ? (
                <Key className="w-5 h-5 text-aurora-purple" />
              ) : (
                <UserIcon className="w-5 h-5 text-aurora-purple" />
              )}
            </div>
            <div>
              <p className="text-white font-medium">{user2?.id}</p>
              <p className="text-xs text-gray-500">{user2?.type === 'client' ? 'Client' : 'User'}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Comparison Table */}
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
                        renderResourceRow(resource, categoryIndex * 10 + index)
                      )}
                    </React.Fragment>
                  )
                )
              : filteredResources.map((resource, index) =>
                  renderResourceRow(resource, index)
                )}
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

export default CompareView;

