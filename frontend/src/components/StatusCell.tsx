import React, { useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Check, AlertTriangle, HelpCircle, FileQuestion, Loader2, LucideIcon, ShieldX, Ban } from 'lucide-react';
import type { AccessTestResult, OperationInfo } from '../types';

interface StatusCellProps {
  result: AccessTestResult | undefined;
  isLoading: boolean;
  operation: OperationInfo;
  resourceType: string;
  isRightmost?: boolean; // For positioning tooltip on right edge
}

interface StatusInfo {
  icon: LucideIcon;
  className: string;
  label: string;
  color: string;
}

function StatusCell({ result, isLoading, operation, isRightmost = false }: StatusCellProps): React.ReactElement {
  const [showTooltip, setShowTooltip] = useState(false);
  const [tooltipPosition, setTooltipPosition] = useState({ top: 0, left: 0 });
  const hideTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const handleMouseEnter = () => {
    if (hideTimeoutRef.current) {
      clearTimeout(hideTimeoutRef.current);
      hideTimeoutRef.current = null;
    }
    
    // Calculate tooltip position
    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setTooltipPosition({
        top: rect.top + window.scrollY,
        left: rect.left + window.scrollX + rect.width / 2,
      });
    }
    
    setShowTooltip(true);
  };

  const handleMouseLeave = () => {
    // Delay hiding to allow moving to tooltip
    hideTimeoutRef.current = setTimeout(() => {
      setShowTooltip(false);
    }, 150);
  };

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
        ref={buttonRef}
        className={`w-10 h-10 rounded-lg ${status.className} flex items-center justify-center transition-all hover:scale-110 cursor-pointer relative`}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        <Icon className="w-4 h-4" />
        {/* Access policy indicator */}
        {result.accessPolicy && (
          <div className="absolute -top-1 -right-1 w-3 h-3 bg-aurora-purple rounded-full border-2 border-midnight-800" 
               title="Has access policy" />
        )}
      </button>

      {/* Tooltip - rendered in portal */}
      {showTooltip && createPortal(
        <div 
          className="fixed z-[9999] animate-fade-in"
          style={{
            top: `${tooltipPosition.top}px`,
            left: `${tooltipPosition.left}px`,
            transform: isRightmost ? 'translate(-100%, -100%) translateY(-8px)' : 'translate(-50%, -100%) translateY(-8px)',
          }}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
        >
          <div className="bg-midnight-800 border border-white/10 rounded-xl p-4 shadow-xl min-w-[280px] max-w-[400px]">
            {/* Header */}
            <div className="flex items-center gap-2 mb-3 pb-3 border-b border-white/5">
              <div className={`w-6 h-6 rounded-lg ${status.className} flex items-center justify-center`}>
                <Icon className="w-3 h-3" />
              </div>
              <span className={`font-medium ${status.color}`}>{status.label}</span>
            </div>

            {/* Details */}
            <div className="space-y-2 text-sm">
              <div className="flex justify-between gap-4">
                <span className="text-gray-500">Operation:</span>
                <span className="text-white font-mono">{operation.label}</span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-gray-500">Method:</span>
                <span className="text-white font-mono">{result.method}</span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-gray-500 shrink-0">Path:</span>
                <span className="text-white font-mono text-xs truncate">{result.path}</span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-gray-500">Status:</span>
                <span className="text-white">{result.status} {result.statusText}</span>
              </div>
              
              <div className="mt-3 pt-3 border-t border-white/5">
                <span className="text-gray-500 block mb-1">Access Policy:</span>
                {result.accessPolicy ? (
                  <span className="text-aurora-green font-mono text-xs bg-aurora-green/10 px-2 py-1 rounded inline-block">
                    {result.accessPolicy}
                  </span>
                ) : (
                  <span className="text-gray-400 text-xs italic">
                    {result.allowed ? 'Not reported by server' : 'N/A'}
                  </span>
                )}
              </div>

              {result.error != null && (
                <div className="mt-3 pt-3 border-t border-white/5">
                  <span className="text-gray-500 block mb-1">Error:</span>
                  <pre className="text-red-400 text-xs bg-red-500/10 p-2 rounded overflow-auto max-w-[350px] max-h-[200px]">
                    {typeof result.error === 'object' && result.error !== null
                      ? JSON.stringify(result.error, null, 2) 
                      : String(result.error)}
                  </pre>
                </div>
              )}
            </div>

            {/* Arrow */}
            <div 
              className="absolute -bottom-2 w-4 h-4 bg-midnight-800 border-r border-b border-white/10 rotate-45"
              style={{
                left: isRightmost ? 'auto' : '50%',
                right: isRightmost ? '16px' : 'auto',
                transform: isRightmost ? 'rotate(45deg)' : 'translateX(-50%) rotate(45deg)',
              }}
            />
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}

export default StatusCell;

