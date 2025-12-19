import React, { useState, useEffect, useRef } from 'react';
import {
  Search,
  User as UserIcon,
  Key,
  ChevronDown,
  X,
  Loader2,
} from 'lucide-react';
import type { User, AidboxUser, AidboxClient } from '../types';

interface UserSelectorProps {
  label: string;
  value: User | null;
  onChange: (user: User | null) => void;
  placeholder: string;
}

function UserSelector({
  label,
  value,
  onChange,
  placeholder,
}: UserSelectorProps): React.ReactElement {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [users, setUsers] = useState<AidboxUser[]>([]);
  const [clients, setClients] = useState<AidboxClient[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [password, setPassword] = useState('');
  const [showPasswordInput, setShowPasswordInput] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Cache for initial data (when search is empty)
  const cachedInitialUsers = useRef<AidboxUser[]>([]);
  const cachedInitialClients = useRef<AidboxClient[]>([]);
  const hasFetchedInitialData = useRef(false);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent): void => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchUsersAndClients = async (
    searchQuery: string,
    signal?: AbortSignal
  ): Promise<void> => {
    console.log('🔍 Fetching users/clients with query:', searchQuery);
    setIsLoading(true);
    try {
      const [usersRes, clientsRes] = await Promise.all([
        fetch(`/api/users?q=${encodeURIComponent(searchQuery)}`, { signal }),
        fetch(`/api/users/clients?q=${encodeURIComponent(searchQuery)}`, {
          signal,
        }),
      ]);

      console.log('📡 Response status:', usersRes.status, clientsRes.status);

      const usersData: AidboxUser[] = await usersRes.json();
      const clientsData: AidboxClient[] = await clientsRes.json();

      console.log(
        '✅ Received:',
        usersData.length,
        'users,',
        clientsData.length,
        'clients'
      );

      setUsers(usersData);
      setClients(clientsData);

      // Cache initial data (when search is empty) for future use
      if (!searchQuery) {
        cachedInitialUsers.current = usersData;
        cachedInitialClients.current = clientsData;
        hasFetchedInitialData.current = true;
      }
    } catch (err) {
      // Ignore abort errors (they're expected when cancelling requests)
      if (err instanceof Error && err.name === 'AbortError') {
        console.log('🚫 Request aborted for query:', searchQuery);
        return;
      }
      console.error('❌ Failed to fetch users/clients:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      if (search) {
        // Create AbortController for this search request
        const abortController = new AbortController();

        // Debounce search: wait 400ms after user stops typing
        const timeoutId = setTimeout(() => {
          console.log('🔍 Debounced search executing for:', search);
          setIsLoading(true);
          fetchUsersAndClients(search, abortController.signal);
        }, 400);

        return () => {
          console.log('🔍 Debounce cancelled for:', search);
          clearTimeout(timeoutId);
          // Abort the fetch request if it's in progress
          abortController.abort();
          // Hide loading indicator when search is cancelled
          setIsLoading(false);
        };
      } else {
        // For empty search, use cached data if available
        if (hasFetchedInitialData.current) {
          setUsers(cachedInitialUsers.current);
          setClients(cachedInitialClients.current);
          setIsLoading(false);
        } else {
          // Fetch initial data only once
          fetchUsersAndClients('');
        }
      }
    }
  }, [isOpen, search]);

  const handleSelect = (
    item: AidboxUser | AidboxClient,
    type: 'user' | 'client'
  ): void => {
    if (type === 'client') {
      const client = item as AidboxClient;
      onChange({
        id: client.id,
        type: 'client',
        clientName: client.name,
        secret: client.secret,
        grant_types: client.grant_types,
      });
      setIsOpen(false);
      setShowPasswordInput(false);
    } else {
      const user = item as AidboxUser;
      onChange({
        id: user.id,
        type: 'user',
        name: user.name,
        email: user.email,
        password: '',
      });
      setShowPasswordInput(true);
      setIsOpen(false);
    }
  };

  const handlePasswordSubmit = (): void => {
    if (value && password) {
      onChange({ ...value, password });
      setShowPasswordInput(false);
      setPassword('');
    }
  };

  const clearSelection = (): void => {
    onChange(null);
    setShowPasswordInput(false);
    setPassword('');
  };

  return (
    <div ref={containerRef} className='relative'>
      <label className='block text-sm font-medium text-gray-400 mb-2'>
        {label}
      </label>

      <div>
        {value ? (
          <div className='flex items-center gap-2'>
            <div className='flex-1 flex items-center gap-3 px-4 py-3 bg-midnight-700 border border-white/10 rounded-xl'>
              <div
                className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                  value.type === 'client'
                    ? 'bg-aurora-purple/20'
                    : 'bg-aurora-blue/20'
                }`}
              >
                {value.type === 'client' ? (
                  <Key className='w-4 h-4 text-aurora-purple' />
                ) : (
                  <UserIcon className='w-4 h-4 text-aurora-blue' />
                )}
              </div>
              <div className='flex-1'>
                {value.type === 'client' ? (
                  <>
                    <p className='text-white font-medium truncate'>
                      {value.clientName || value.id}
                    </p>
                    <p className='text-xs text-gray-500 truncate'>
                      Client{value.clientName ? ` • ${value.id}` : ''}
                      {value.grant_types
                        ? ` • ${value.grant_types.join(', ')}`
                        : ''}
                      {value.secret
                        ? ' • ✓ Authenticated'
                        : ' • Secret required'}
                    </p>
                  </>
                ) : (
                  <>
                    <p className='text-white font-medium truncate'>
                      {value.name?.givenName || value.name?.familyName
                        ? `${value.name.givenName || ''} ${
                            value.name.familyName || ''
                          }`.trim()
                        : value.email || value.id}
                    </p>
                    <p className='text-xs text-gray-500 truncate'>
                      {value.email &&
                        (value.name?.givenName || value.name?.familyName) &&
                        `${value.email} • `}
                      User
                      {value.password
                        ? ' • ✓ Authenticated'
                        : ' • Password required'}
                    </p>
                  </>
                )}
              </div>
              <button
                onClick={clearSelection}
                className='p-1 hover:bg-white/5 rounded-lg transition-colors'
              >
                <X className='w-4 h-4 text-gray-400' />
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setIsOpen(true)}
            className='w-full flex items-center gap-3 px-4 py-3 bg-midnight-700 border border-white/10 rounded-xl hover:border-aurora-green/30 transition-all text-left'
          >
            <Search className='w-5 h-5 text-gray-500' />
            <span className='text-gray-500'>{placeholder}</span>
            <ChevronDown className='w-5 h-5 text-gray-500 ml-auto' />
          </button>
        )}
      </div>

      {/* Password Input Modal */}
      {showPasswordInput && value && value.type === 'user' && (
        <div className='mt-3 p-4 bg-midnight-700 border border-white/10 rounded-xl'>
          <label className='block text-sm text-gray-400 mb-2'>
            Enter password for{' '}
            {value.email || value.name?.givenName || value.id}
          </label>
          <div className='flex gap-2'>
            <input
              type='password'
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder='Password...'
              className='flex-1 px-4 py-2 bg-midnight-800 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-aurora-green/50'
              onKeyDown={(e) => e.key === 'Enter' && handlePasswordSubmit()}
            />
            <button
              onClick={handlePasswordSubmit}
              className='px-4 py-2 bg-aurora-green text-white rounded-lg hover:opacity-90 transition-opacity'
            >
              Confirm
            </button>
          </div>
        </div>
      )}

      {/* Dropdown */}
      {isOpen && (
        <div
          ref={dropdownRef}
          className='absolute top-full left-0 right-0 mt-2 bg-midnight-700 border border-white/10 rounded-xl shadow-xl z-[100] overflow-hidden'
        >
          <div className='p-3 border-b border-white/5'>
            <div className='relative'>
              <Search className='absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none' />
              <input
                type='text'
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder='Search users or clients...'
                className='w-full pl-10 pr-10 py-2 bg-midnight-800 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-aurora-green/50'
                autoFocus
              />
              {isLoading && (
                <Loader2 className='absolute right-3 top-3 w-4 h-4 text-aurora-green animate-spin pointer-events-none' />
              )}
            </div>
          </div>

          <div className='max-h-72 overflow-y-auto'>
            {isLoading ? (
              <div className='p-4 text-center text-gray-500'>Loading...</div>
            ) : (
              <>
                {/* Clients Section */}
                {clients.length > 0 && (
                  <div>
                    <div className='px-4 py-2 text-xs font-medium text-gray-500 uppercase tracking-wider bg-midnight-800/50'>
                      Clients
                    </div>
                    {clients.map((client) => {
                      // Determine display priority: name > shortened ID
                      const displayName = client.name || client.id;

                      // Show shortened ID in subtitle if we're showing name
                      let subtitle = '';
                      if (client.name) {
                        subtitle =
                          client.id.length > 20
                            ? `${client.id.substring(
                                0,
                                8
                              )}...${client.id.substring(client.id.length - 8)}`
                            : client.id;
                      } else {
                        // Show grant types if no name
                        subtitle =
                          client.grant_types && client.grant_types.length > 0
                            ? client.grant_types.join(', ')
                            : 'client_credentials';
                      }

                      return (
                        <button
                          key={client.id}
                          onClick={() => handleSelect(client, 'client')}
                          className='w-full flex items-center gap-3 px-4 py-3 hover:bg-white/5 transition-colors text-left'
                        >
                          <div className='w-8 h-8 rounded-lg bg-aurora-purple/20 flex items-center justify-center'>
                            <Key className='w-4 h-4 text-aurora-purple' />
                          </div>
                          <div className='flex-1 min-w-0'>
                            <p
                              className='text-white font-medium truncate'
                              title={client.id}
                            >
                              {displayName}
                            </p>
                            <p className='text-xs text-gray-500 truncate'>
                              {subtitle}
                            </p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}

                {/* Users Section */}
                {users.length > 0 && (
                  <div>
                    <div className='px-4 py-2 text-xs font-medium text-gray-500 uppercase tracking-wider bg-midnight-800/50'>
                      Users
                    </div>
                    {users.map((user) => {
                      // Determine display priority: name > email > shortened ID
                      const hasName =
                        user.name?.givenName || user.name?.familyName;
                      const fullName = hasName
                        ? `${user.name?.givenName || ''} ${
                            user.name?.familyName || ''
                          }`.trim()
                        : null;

                      const displayName = fullName || user.email || user.id;

                      // For subtitle: show email if we're showing name, show ID if we're showing email
                      let subtitle = '';
                      if (fullName && user.email) {
                        subtitle = user.email;
                      } else if (fullName || user.email) {
                        // Show shortened ID
                        subtitle =
                          user.id.length > 20
                            ? `${user.id.substring(0, 8)}...${user.id.substring(
                                user.id.length - 8
                              )}`
                            : user.id;
                      }

                      return (
                        <button
                          key={user.id}
                          onClick={() => handleSelect(user, 'user')}
                          className='w-full flex items-center gap-3 px-4 py-3 hover:bg-white/5 transition-colors text-left'
                        >
                          <div className='w-8 h-8 rounded-lg bg-aurora-blue/20 flex items-center justify-center'>
                            <UserIcon className='w-4 h-4 text-aurora-blue' />
                          </div>
                          <div className='flex-1 min-w-0'>
                            <p className='text-white font-medium truncate'>
                              {displayName}
                            </p>
                            {subtitle && (
                              <p className='text-xs text-gray-500 truncate'>
                                {subtitle}
                              </p>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}

                {!isLoading && users.length === 0 && clients.length === 0 && (
                  <div className='p-4 text-center text-gray-500'>
                    No users or clients found
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default UserSelector;
