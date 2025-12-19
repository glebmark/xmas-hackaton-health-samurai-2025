import React, { useState, useEffect, useRef } from 'react';
import { Shield, Users, GitCompare, RefreshCw } from 'lucide-react';
import UserSelector from './components/UserSelector';
import AccessMatrix from './components/AccessMatrix';
import CompareView from './components/CompareView';
import Header from './components/Header';
import type {
  User,
  ResourceInfo,
  Pagination,
  ResourceAccessResults,
  CompareResults,
  PaginatedResourcesResponse,
} from './types';

function App(): React.ReactElement {
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [compareUser, setCompareUser] = useState<User | null>(null);
  const [isCompareMode, setIsCompareMode] = useState(false);
  const [accessResults, setAccessResults] =
    useState<ResourceAccessResults | null>(null);
  const [compareResults, setCompareResults] = useState<CompareResults | null>(
    null
  );
  const [isLoading, setIsLoading] = useState(false);
  const [resources, setResources] = useState<ResourceInfo[]>([]);
  const [pagination, setPagination] = useState<Pagination>({
    currentPage: 1,
    totalPages: 1,
    totalResources: 0,
    limit: 10,
  });
  const [error, setError] = useState<string | null>(null);

  // Track if testing was initiated to auto-retest on pagination
  const hasTestedRef = useRef(false);

  useEffect(() => {
    fetchResources(pagination.currentPage);
  }, [pagination.currentPage]);

  // Reset tested flag when user or compare mode changes
  useEffect(() => {
    hasTestedRef.current = false;
    setAccessResults(null);
    setCompareResults(null);
  }, [selectedUser, compareUser, isCompareMode]);

  // Auto-test access when resources change (after pagination) if testing was initiated
  useEffect(() => {
    if (
      hasTestedRef.current &&
      selectedUser &&
      resources.length > 0 &&
      !isLoading
    ) {
      // Automatically test the new page
      testAccess();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resources]);

  const fetchResources = async (page: number): Promise<void> => {
    try {
      const response = await fetch(
        `/api/resources/paginated?page=${page}&limit=10`
      );
      const data: PaginatedResourcesResponse = await response.json();
      setResources(data.resources);
      setPagination(data.pagination);
    } catch (err) {
      setError('Failed to fetch resources');
      console.error(err);
    }
  };

  const testAccess = async (): Promise<void> => {
    if (!selectedUser) return;

    hasTestedRef.current = true;
    setIsLoading(true);
    setError(null);

    try {
      // Build UserAuthInfo object for backend
      const userAuth = {
        type: selectedUser.type,
        id: selectedUser.id,
        ...(selectedUser.type === 'client'
          ? { secret: selectedUser.secret }
          : { password: selectedUser.password }),
      };

      if (isCompareMode && compareUser) {
        const compareAuth = {
          type: compareUser.type,
          id: compareUser.id,
          ...(compareUser.type === 'client'
            ? { secret: compareUser.secret }
            : { password: compareUser.password }),
        };

        const response = await fetch('/api/access/compare', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            resourceTypes: resources.map((r) => r.name),
            userAuth1: userAuth,
            userAuth2: compareAuth,
          }),
        });

        const data: CompareResults = await response.json();
        setCompareResults(data);
      } else {
        const response = await fetch('/api/access/test-batch', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            resourceTypes: resources.map((r) => r.name),
            userAuth,
          }),
        });

        const data: ResourceAccessResults = await response.json();
        setAccessResults(data);
      }
    } catch (err) {
      setError('Failed to test access');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePageChange = (newPage: number): void => {
    setPagination((prev) => ({ ...prev, currentPage: newPage }));
  };

  return (
    <div className='min-h-screen relative'>
      {/* Aurora background */}
      <div className='aurora-bg' />

      {/* Content */}
      <div className='relative z-10'>
        <Header />

        <main className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8'>
          {/* User Selection Section */}
          <div className='glass rounded-2xl p-6 mb-8 animate-slide-up relative z-20'>
            <div className='flex items-center gap-3 mb-6'>
              <div className='w-10 h-10 rounded-xl bg-gradient-to-br from-aurora-green to-aurora-blue flex items-center justify-center'>
                <Users className='w-5 h-5 text-white' />
              </div>
              <div>
                <h2 className='text-lg font-semibold text-white'>
                  Select User
                </h2>
                <p className='text-sm text-gray-400'>
                  Choose a user or client to test access policies
                </p>
              </div>
            </div>

            <div className='grid grid-cols-1 lg:grid-cols-2 gap-6'>
              <UserSelector
                label='User / Client'
                value={selectedUser}
                onChange={setSelectedUser}
                placeholder='Search for a user or client...'
              />

              {isCompareMode && (
                <UserSelector
                  label='Compare With'
                  value={compareUser}
                  onChange={setCompareUser}
                  placeholder='Select user to compare...'
                />
              )}
            </div>

            <div className='flex items-center gap-4 mt-6'>
              <button
                onClick={testAccess}
                disabled={!selectedUser || isLoading}
                className='flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-aurora-green to-aurora-blue text-white font-medium rounded-xl hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed'
              >
                {isLoading ? (
                  <RefreshCw className='w-5 h-5 animate-spin' />
                ) : (
                  <Shield className='w-5 h-5' />
                )}
                {isLoading ? 'Testing...' : 'Test Access'}
              </button>

              <button
                onClick={() => {
                  setIsCompareMode(!isCompareMode);
                  setCompareResults(null);
                }}
                className={`flex items-center gap-2 px-6 py-3 rounded-xl font-medium transition-all ${
                  isCompareMode
                    ? 'bg-aurora-purple/20 text-aurora-purple border border-aurora-purple/40'
                    : 'bg-midnight-700 text-gray-300 hover:bg-midnight-600'
                }`}
              >
                <GitCompare className='w-5 h-5' />
                Compare Mode
              </button>
            </div>
          </div>

          {/* Error Display */}
          {error && (
            <div className='glass rounded-xl p-4 mb-6 border border-red-500/30 bg-red-500/10'>
              <p className='text-red-400'>{error}</p>
            </div>
          )}

          {/* Results Matrix */}
          {isCompareMode && compareResults ? (
            <CompareView
              results={compareResults}
              resources={resources}
              user1={selectedUser}
              user2={compareUser}
              pagination={pagination}
              onPageChange={handlePageChange}
            />
          ) : (
            <AccessMatrix
              results={accessResults}
              resources={resources}
              isLoading={isLoading}
              pagination={pagination}
              onPageChange={handlePageChange}
            />
          )}
        </main>
      </div>
    </div>
  );
}

export default App;
