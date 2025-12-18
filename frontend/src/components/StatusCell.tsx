import React, { useState } from 'react';
import { Check, X, AlertTriangle, HelpCircle, FileQuestion, Loader2, LucideIcon, ShieldX, Ban } from 'lucide-react';
import type { AccessTestResult, OperationInfo } from '../types';

interface StatusCellProps {
  result: AccessTestResult | undefined;
  isLoading: boolean;
  operation: OperationInfo;
  resourceType: string;
}

interface StatusInfo {
  icon: LucideIcon;
  className: string;
  label: string;
  color: string;
}

function StatusCell({ result, isLoading, operation }: StatusCellProps): React.ReactElement {
  const [showTooltip, setShowTooltip] = useState(false);

  if (isLoading) {
    return (
      <div className="flex justify-center">
        <div className="w-10 h-10 rounded-lg bg-midnight-700 flex items-center justify-center">
          <Loader2 className="w-4 h-4 text-gray-500 animate-spin" />
        </div>
      </div>
    );
  }

  if (!result) {
    return (
      <div className="flex justify-center">
        <div className="w-10 h-10 rounded-lg bg-midnight-700 flex items-center justify-center">
          <HelpCircle className="w-4 h-4 text-gray-500" />
        </div>
      </div>
    );
  }

  const getStatusInfo = (): StatusInfo => {
    if (result.allowed) {
      return {
        icon: Check,
        className: 'status-allowed',
        label: 'Allowed',
        color: 'text-green-400',
      };
    }
    if (result.unauthorized) {
      return {
        icon: ShieldX,
        className: 'status-unauthorized',
        label: 'Unauthorized (401)',
        color: 'text-orange-400',
      };
    }
    if (result.denied) {
      return {
        icon: Ban,
        className: 'status-forbidden',
        label: 'Forbidden (403)',
        color: 'text-red-400',
      };
    }
    if (result.notFound) {
      return {
        icon: FileQuestion,
        className: 'status-not-found',
        label: 'Not Found (404)',
        color: 'text-yellow-400',
      };
    }
    return {
      icon: AlertTriangle,
      className: 'status-error',
      label: `Error (${result.status})`,
      color: 'text-gray-400',
    };
  };

  const status = getStatusInfo();
  const Icon = status.icon;

  return (
    <div className="relative flex justify-center">
      <button
        className={`w-10 h-10 rounded-lg ${status.className} flex items-center justify-center transition-all hover:scale-110 cursor-pointer`}
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
      >
        <Icon className="w-4 h-4" />
      </button>

      {/* Tooltip */}
      {showTooltip && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50 animate-fade-in">
          <div className="bg-midnight-800 border border-white/10 rounded-xl p-4 shadow-xl min-w-[280px]">
            {/* Header */}
            <div className="flex items-center gap-2 mb-3 pb-3 border-b border-white/5">
              <div className={`w-6 h-6 rounded-lg ${status.className} flex items-center justify-center`}>
                <Icon className="w-3 h-3" />
              </div>
              <span className={`font-medium ${status.color}`}>{status.label}</span>
            </div>

            {/* Details */}
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Operation:</span>
                <span className="text-white font-mono">{operation.label}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Method:</span>
                <span className="text-white font-mono">{result.method}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Path:</span>
                <span className="text-white font-mono text-xs">{result.path}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Status:</span>
                <span className="text-white">{result.status} {result.statusText}</span>
              </div>
              
              {result.accessPolicy && (
                <div className="mt-3 pt-3 border-t border-white/5">
                  <span className="text-gray-500 block mb-1">Access Policy:</span>
                  <span className="text-aurora-green font-mono text-xs bg-aurora-green/10 px-2 py-1 rounded">
                    {result.accessPolicy}
                  </span>
                </div>
              )}

              {result.error && (
                <div className="mt-3 pt-3 border-t border-white/5">
                  <span className="text-gray-500 block mb-1">Error:</span>
                  <pre className="text-red-400 text-xs bg-red-500/10 p-2 rounded overflow-x-auto max-w-[300px]">
                    {typeof result.error === 'object' 
                      ? JSON.stringify(result.error, null, 2) 
                      : String(result.error)}
                  </pre>
                </div>
              )}
            </div>

            {/* Arrow */}
            <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-4 h-4 bg-midnight-800 border-r border-b border-white/10 rotate-45" />
          </div>
        </div>
      )}
    </div>
  );
}

export default StatusCell;

