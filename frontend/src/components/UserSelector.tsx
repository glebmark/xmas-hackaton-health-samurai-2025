import React, { useState, useEffect, useRef } from 'react';
import { Search, User as UserIcon, Key, ChevronDown, X } from 'lucide-react';
import type { User, AidboxUser, AidboxClient } from '../types';

interface UserSelectorProps {
  label: string;
  value: User | null;
  onChange: (user: User | null) => void;
  placeholder: string;
}

function UserSelector({ label, value, onChange, placeholder }: UserSelectorProps): React.ReactElement {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [users, setUsers] = useState<AidboxUser[]>([]);
  const [clients, setClients] = useState<AidboxClient[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [password, setPassword] = useState('');
  const [showPasswordInput, setShowPasswordInput] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent): void => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (isOpen) {
      fetchUsersAndClients();
    }
  }, [isOpen, search]);

  const fetchUsersAndClients = async (): Promise<void> => {
    setIsLoading(true);
    try {
      const [usersRes, clientsRes] = await Promise.all([
        fetch(`/api/users?q=${encodeURIComponent(search)}`),
        fetch(`/api/users/clients?q=${encodeURIComponent(search)}`),
      ]);
      const usersData: AidboxUser[] = await usersRes.json();
      const clientsData: AidboxClient[] = await clientsRes.json();
      setUsers(usersData);
      setClients(clientsData);
    } catch (err) {
      console.error('Failed to fetch users/clients:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelect = (item: AidboxUser | AidboxClient, type: 'user' | 'client'): void => {
    if (type === 'client') {
      const client = item as AidboxClient;
      onChange({ 
        id: client.id, 
        type: 'client', 
        secret: client.secret,
        grant_types: client.grant_types 
      });
      setIsOpen(false);
      setShowPasswordInput(false);
    } else {
      const user = item as AidboxUser;
      onChange({ 
        id: user.id, 
        type: 'user', 
        name: user.name,
        password: '' 
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
    <div className="relative" ref={dropdownRef}>
      <label className="block text-sm font-medium text-gray-400 mb-2">{label}</label>
      
      {value ? (
        <div className="flex items-center gap-2">
          <div className="flex-1 flex items-center gap-3 px-4 py-3 bg-midnight-700 border border-white/10 rounded-xl">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
              value.type === 'client' ? 'bg-aurora-purple/20' : 'bg-aurora-blue/20'
            }`}>
              {value.type === 'client' ? (
                <Key className="w-4 h-4 text-aurora-purple" />
              ) : (
                <UserIcon className="w-4 h-4 text-aurora-blue" />
              )}
            </div>
            <div className="flex-1">
              <p className="text-white font-medium">{value.id || value.name?.givenName || 'Unknown'}</p>
              <p className="text-xs text-gray-500">
                {value.type === 'client' ? 'Client' : 'User'}
                {value.password || value.secret ? ' • Authenticated' : ' • Password required'}
              </p>
            </div>
            <button onClick={clearSelection} className="p-1 hover:bg-white/5 rounded-lg transition-colors">
              <X className="w-4 h-4 text-gray-400" />
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setIsOpen(true)}
          className="w-full flex items-center gap-3 px-4 py-3 bg-midnight-700 border border-white/10 rounded-xl hover:border-aurora-green/30 transition-all text-left"
        >
          <Search className="w-5 h-5 text-gray-500" />
          <span className="text-gray-500">{placeholder}</span>
          <ChevronDown className="w-5 h-5 text-gray-500 ml-auto" />
        </button>
      )}

      {/* Password Input Modal */}
      {showPasswordInput && value && value.type === 'user' && (
        <div className="mt-3 p-4 bg-midnight-700 border border-white/10 rounded-xl">
          <label className="block text-sm text-gray-400 mb-2">
            Enter password for {value.id}
          </label>
          <div className="flex gap-2">
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password..."
              className="flex-1 px-4 py-2 bg-midnight-800 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-aurora-green/50"
              onKeyDown={(e) => e.key === 'Enter' && handlePasswordSubmit()}
            />
            <button
              onClick={handlePasswordSubmit}
              className="px-4 py-2 bg-aurora-green text-white rounded-lg hover:opacity-90 transition-opacity"
            >
              Confirm
            </button>
          </div>
        </div>
      )}

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-midnight-700 border border-white/10 rounded-xl shadow-xl z-50 overflow-hidden">
          <div className="p-3 border-b border-white/5">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search users or clients..."
                className="w-full pl-10 pr-4 py-2 bg-midnight-800 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-aurora-green/50"
                autoFocus
              />
            </div>
          </div>

          <div className="max-h-72 overflow-y-auto">
            {isLoading ? (
              <div className="p-4 text-center text-gray-500">Loading...</div>
            ) : (
              <>
                {/* Clients Section */}
                {clients.length > 0 && (
                  <div>
                    <div className="px-4 py-2 text-xs font-medium text-gray-500 uppercase tracking-wider bg-midnight-800/50">
                      Clients
                    </div>
                    {clients.map((client) => (
                      <button
                        key={client.id}
                        onClick={() => handleSelect(client, 'client')}
                        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/5 transition-colors text-left"
                      >
                        <div className="w-8 h-8 rounded-lg bg-aurora-purple/20 flex items-center justify-center">
                          <Key className="w-4 h-4 text-aurora-purple" />
                        </div>
                        <div>
                          <p className="text-white font-medium">{client.id}</p>
                          <p className="text-xs text-gray-500">
                            {client.grant_types?.join(', ') || 'client_credentials'}
                          </p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}

                {/* Users Section */}
                {users.length > 0 && (
                  <div>
                    <div className="px-4 py-2 text-xs font-medium text-gray-500 uppercase tracking-wider bg-midnight-800/50">
                      Users
                    </div>
                    {users.map((user) => (
                      <button
                        key={user.id}
                        onClick={() => handleSelect(user, 'user')}
                        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/5 transition-colors text-left"
                      >
                        <div className="w-8 h-8 rounded-lg bg-aurora-blue/20 flex items-center justify-center">
                          <UserIcon className="w-4 h-4 text-aurora-blue" />
                        </div>
                        <div>
                          <p className="text-white font-medium">{user.id}</p>
                          <p className="text-xs text-gray-500">
                            {user.name?.givenName} {user.name?.familyName}
                          </p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}

                {!isLoading && users.length === 0 && clients.length === 0 && (
                  <div className="p-4 text-center text-gray-500">
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

