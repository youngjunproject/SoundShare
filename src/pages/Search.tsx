import React, { useState, useEffect } from 'react';
import { Layout } from '../components/Layout';
import { SoundCard } from '../components/SoundCard';
import { AudioPlayer } from '../components/AudioPlayer';
import { supabase } from '../lib/supabase';
import { Search as SearchIcon, Filter, X } from 'lucide-react';
import type { Sound } from '../types/sound';

type SortOption = 'relevance' | 'date' | 'popularity';
type TimeFilter = 'all' | 'day' | 'week' | 'month' | 'year';

interface SearchFilters {
  sortBy: SortOption;
  timeRange: TimeFilter;
  minDuration?: number;
  maxDuration?: number;
}

export function Search() {
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [sounds, setSounds] = useState<Sound[]>([]);
  const [currentSound, setCurrentSound] = useState<Sound | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<SearchFilters>({
    sortBy: 'relevance',
    timeRange: 'all'
  });

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query);
    }, 300);

    return () => clearTimeout(timer);
  }, [query]);

  // Perform search when debounced query or filters change
  useEffect(() => {
    if (debouncedQuery) {
      performSearch();
    }
  }, [debouncedQuery, filters]);

  const performSearch = async () => {
    try {
      setLoading(true);
      setError(null);

      let query = supabase
        .from('sounds')
        .select(`
          *,
          profiles:user_id (username)
        `)
        .textSearch('title', debouncedQuery, {
          type: 'websearch',
          config: 'english'
        });

      // Apply time range filter
      if (filters.timeRange !== 'all') {
        const now = new Date();
        let startDate = new Date();

        switch (filters.timeRange) {
          case 'day':
            startDate.setDate(now.getDate() - 1);
            break;
          case 'week':
            startDate.setDate(now.getDate() - 7);
            break;
          case 'month':
            startDate.setMonth(now.getMonth() - 1);
            break;
          case 'year':
            startDate.setFullYear(now.getFullYear() - 1);
            break;
        }

        query = query.gte('created_at', startDate.toISOString());
      }

      // Apply duration filters
      if (filters.minDuration !== undefined) {
        query = query.gte('duration', filters.minDuration);
      }
      if (filters.maxDuration !== undefined) {
        query = query.lte('duration', filters.maxDuration);
      }

      // Apply sorting
      switch (filters.sortBy) {
        case 'date':
          query = query.order('created_at', { ascending: false });
          break;
        case 'popularity':
          query = query.order('upvotes', { ascending: false });
          break;
        // For relevance, we use the default full-text search ranking
      }

      const { data, error: searchError } = await query;

      if (searchError) throw searchError;

      const soundsWithUsername = data.map(sound => ({
        ...sound,
        username: sound.profiles?.username || 'Anonymous'
      }));

      setSounds(soundsWithUsername);
    } catch (err) {
      console.error('Error performing search:', err);
      setError('Failed to perform search');
    } finally {
      setLoading(false);
    }
  };

  const clearSearch = () => {
    setQuery('');
    setDebouncedQuery('');
    setSounds([]);
  };

  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <SearchIcon className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search sounds..."
              className="block w-full pl-10 pr-12 py-3 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500"
            />
            <div className="absolute inset-y-0 right-0 pr-3 flex items-center space-x-2">
              {query && (
                <button
                  onClick={clearSearch}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="h-5 w-5" />
                </button>
              )}
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`text-gray-400 hover:text-gray-600 ${
                  showFilters ? 'text-indigo-600' : ''
                }`}
              >
                <Filter className="h-5 w-5" />
              </button>
            </div>
          </div>

          {showFilters && (
            <div className="mt-4 p-4 bg-white rounded-lg shadow-lg">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Sort by
                  </label>
                  <select
                    value={filters.sortBy}
                    onChange={(e) => setFilters({
                      ...filters,
                      sortBy: e.target.value as SortOption
                    })}
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                  >
                    <option value="relevance">Relevance</option>
                    <option value="date">Date</option>
                    <option value="popularity">Popularity</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Time range
                  </label>
                  <select
                    value={filters.timeRange}
                    onChange={(e) => setFilters({
                      ...filters,
                      timeRange: e.target.value as TimeFilter
                    })}
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                  >
                    <option value="all">All time</option>
                    <option value="day">Last 24 hours</option>
                    <option value="week">Last week</option>
                    <option value="month">Last month</option>
                    <option value="year">Last year</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Duration (seconds)
                  </label>
                  <div className="flex items-center space-x-2">
                    <input
                      type="number"
                      min="0"
                      placeholder="Min"
                      value={filters.minDuration || ''}
                      onChange={(e) => setFilters({
                        ...filters,
                        minDuration: e.target.value ? Number(e.target.value) : undefined
                      })}
                      className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                    />
                    <span className="text-gray-500">to</span>
                    <input
                      type="number"
                      min="0"
                      placeholder="Max"
                      value={filters.maxDuration || ''}
                      onChange={(e) => setFilters({
                        ...filters,
                        maxDuration: e.target.value ? Number(e.target.value) : undefined
                      })}
                      className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {loading ? (
          <div className="flex items-center justify-center min-h-[50vh]">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600" />
          </div>
        ) : error ? (
          <div className="text-center py-12">
            <p className="text-red-600">{error}</p>
            <button
              onClick={performSearch}
              className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
            >
              Try Again
            </button>
          </div>
        ) : sounds.length === 0 ? (
          query ? (
            <div className="text-center py-12 bg-white rounded-lg shadow">
              <p className="text-gray-500">No sounds found matching your search</p>
            </div>
          ) : null
        ) : (
          <div>
            <p className="text-sm text-gray-500 mb-4">
              Found {sounds.length} sound{sounds.length === 1 ? '' : 's'}
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {sounds.map((sound) => (
                <SoundCard 
                  key={sound.id} 
                  sound={sound} 
                  onPlay={setCurrentSound}
                />
              ))}
            </div>
          </div>
        )}
      </div>
      <AudioPlayer sound={currentSound} />
    </Layout>
  );
}