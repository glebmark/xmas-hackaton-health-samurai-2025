import React from 'react';
import { Search, Filter, X, Layers } from 'lucide-react';
import type { ResourceCategory } from '../types';

interface FilterPanelProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  selectedCategory: string;
  onCategoryChange: (category: string) => void;
  categories: ResourceCategory[];
  groupByCategory: boolean;
  onGroupByCategoryChange: (group: boolean) => void;
}

function FilterPanel({
  searchQuery,
  onSearchChange,
  selectedCategory,
  onCategoryChange,
  categories,
  groupByCategory,
  onGroupByCategoryChange,
}: FilterPanelProps): React.ReactElement {
  const hasActiveFilters = searchQuery || selectedCategory;

  const clearFilters = (): void => {
    onSearchChange('');
    onCategoryChange('');
  };

  return (
    <div className='glass rounded-2xl p-6 mb-6 animate-slide-up stagger-1'>
      <div className='flex items-center gap-3 mb-4'>
        <div className='w-10 h-10 rounded-xl bg-gradient-to-br from-aurora-purple to-aurora-pink flex items-center justify-center'>
          <Filter className='w-5 h-5 text-white' />
        </div>
        <div className='flex-1'>
          <h2 className='text-lg font-semibold text-white'>Filters & Search</h2>
          <p className='text-sm text-gray-400'>
            Narrow down resources and results
          </p>
        </div>
        {hasActiveFilters && (
          <button
            onClick={clearFilters}
            className='flex items-center gap-2 px-4 py-2 text-sm bg-midnight-700 hover:bg-midnight-600 text-gray-300 rounded-lg transition-colors'
          >
            <X className='w-4 h-4' />
            Clear All
          </button>
        )}
      </div>

      <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4'>
        {/* Search Input */}
        <div className='lg:col-span-2'>
          <label className='block text-sm font-medium text-gray-400 mb-2'>
            Search Resources
          </label>
          <div className='relative'>
            <Search className='absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-500' />
            <input
              type='text'
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder='Type resource name or description...'
              className='w-full pl-10 pr-4 py-2.5 bg-midnight-700 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-aurora-blue transition-colors'
            />
            {searchQuery && (
              <button
                onClick={() => onSearchChange('')}
                className='absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-300'
              >
                <X className='w-4 h-4' />
              </button>
            )}
          </div>
        </div>

        {/* Category Filter */}
        <div>
          <label className='block text-sm font-medium text-gray-400 mb-2'>
            Category
          </label>
          <select
            value={selectedCategory}
            onChange={(e) => onCategoryChange(e.target.value)}
            className='w-full px-4 py-2.5 bg-midnight-700 border border-white/10 rounded-lg text-white focus:outline-none focus:border-aurora-blue transition-colors appearance-none cursor-pointer'
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%239CA3AF' d='M6 9L1 4h10z'/%3E%3C/svg%3E")`,
              backgroundRepeat: 'no-repeat',
              backgroundPosition: 'right 1rem center',
            }}
          >
            <option value=''>All Categories</option>
            {categories.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Group By Toggle */}
      <div className='mt-4 pt-4 border-t border-white/5'>
        <label className='flex items-center gap-3 cursor-pointer group'>
          <div className='relative'>
            <input
              type='checkbox'
              checked={groupByCategory}
              onChange={(e) => onGroupByCategoryChange(e.target.checked)}
              className='sr-only peer'
            />
            <div className='w-11 h-6 bg-midnight-700 rounded-full peer-checked:bg-aurora-blue transition-colors' />
            <div className='absolute left-1 top-1 w-4 h-4 bg-white rounded-full transition-transform peer-checked:translate-x-5' />
          </div>
          <div className='flex items-center gap-2'>
            <Layers className='w-4 h-4 text-gray-400 group-hover:text-aurora-blue transition-colors' />
            <span className='text-sm font-medium text-gray-300 group-hover:text-white transition-colors'>
              Group resources by category
            </span>
          </div>
        </label>
      </div>

      {/* Active Filters Summary */}
      {hasActiveFilters && (
        <div className='mt-4 pt-4 border-t border-white/5'>
          <div className='flex flex-wrap gap-2'>
            {searchQuery && (
              <div className='flex items-center gap-2 px-3 py-1.5 bg-aurora-blue/20 text-aurora-blue rounded-lg text-sm'>
                <Search className='w-3.5 h-3.5' />
                <span>Search: "{searchQuery}"</span>
                <button
                  onClick={() => onSearchChange('')}
                  className='hover:bg-white/10 rounded p-0.5'
                >
                  <X className='w-3.5 h-3.5' />
                </button>
              </div>
            )}
            {selectedCategory && (
              <div className='flex items-center gap-2 px-3 py-1.5 bg-aurora-green/20 text-aurora-green rounded-lg text-sm'>
                <Filter className='w-3.5 h-3.5' />
                <span>Category: {selectedCategory}</span>
                <button
                  onClick={() => onCategoryChange('')}
                  className='hover:bg-white/10 rounded p-0.5'
                >
                  <X className='w-3.5 h-3.5' />
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default FilterPanel;

