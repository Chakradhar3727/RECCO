'use client';

import React, { useState, useMemo } from 'react';
import { formatWeightKg } from '@/lib/utils/format-indian';
import { formatRelativeTime } from '@/lib/utils/date-ist';
import { Search, Package } from 'lucide-react';
import Link from 'next/link';

interface Collection {
  id: string;
  material_type: string;
  median_weight: number;
  status: string;
  gps_lat: number | null;
  gps_lng: number | null;
  created_at: string;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  AVAILABLE_FOR_BATCHING: { label: 'Available', color: 'text-emerald-700', bg: 'bg-emerald-100' },
  IN_BATCH: { label: 'In Batch', color: 'text-blue-700', bg: 'bg-blue-100' },
  COMPLETE: { label: 'Complete', color: 'text-gray-600', bg: 'bg-gray-100' },
};

const MATERIAL_FILTERS = ['All', 'PET', 'HDPE', 'LDPE', 'PP', 'MLP', 'MIXED'];
const STATUS_FILTERS = ['All', 'Available', 'Batched', 'Complete'];

export default function CollectionFilters({ collections }: { collections: Collection[] }) {
  const [search, setSearch] = useState('');
  const [materialFilters, setMaterialFilters] = useState<string[]>(['All']);
  const [statusFilter, setStatusFilter] = useState('All');

  const toggleMaterialFilter = (f: string) => {
    if (f === 'All') {
      setMaterialFilters(['All']);
    } else {
      setMaterialFilters(prev => {
        const withoutAll = prev.filter(p => p !== 'All');
        if (withoutAll.includes(f)) {
          const next = withoutAll.filter(p => p !== f);
          return next.length === 0 ? ['All'] : next;
        } else {
          return [...withoutAll, f];
        }
      });
    }
  };

  const filtered = useMemo(() => {
    return collections.filter(c => {
      // Search
      if (search) {
        const q = search.toLowerCase();
        const matches = (c.material_type ?? '').toLowerCase().includes(q) ||
          c.id.toLowerCase().includes(q);
        if (!matches) return false;
      }
      // Material filter — data uses values like PET_BOTTLES, HDPE_CONTAINERS etc.
      if (!materialFilters.includes('All')) {
        const mt = (c.material_type || 'MIXED').toUpperCase();
        const matchesMaterial = materialFilters.some(f => mt.startsWith(f) || mt === f);
        if (!matchesMaterial) return false;
      }
      // Status filter
      if (statusFilter === 'Available' && c.status !== 'AVAILABLE_FOR_BATCHING') return false;
      if (statusFilter === 'Batched' && c.status !== 'IN_BATCH') return false;
      if (statusFilter === 'Complete' && c.status !== 'COMPLETE') return false;
      return true;
    });
  }, [collections, search, materialFilters, statusFilter]);

  return (
    <div className="px-4 pt-4">
      {/* Search */}
      <div className="relative mb-3">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          placeholder="Search by material or ID..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-9 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
        />
      </div>

      {/* Filter Chips */}
      <div className="flex gap-2 overflow-x-auto pb-2 mb-3 no-scrollbar">
        {MATERIAL_FILTERS.map(f => (
          <button
            key={f}
            onClick={() => toggleMaterialFilter(f)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
              materialFilters.includes(f)
                ? 'bg-emerald-700 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {/* Status Chips */}
      <div className="flex gap-2 overflow-x-auto pb-3 mb-3 no-scrollbar">
        {STATUS_FILTERS.map(f => (
          <button
            key={f}
            onClick={() => setStatusFilter(f)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
              statusFilter === f
                ? 'bg-emerald-700 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {/* Results Count */}
      <p className="text-xs text-gray-400 mb-3">{filtered.length} results</p>

      {/* Collection Cards */}
      {filtered.length === 0 ? (
        <div className="bg-white rounded-xl p-8 text-center border border-gray-100">
          <Package size={32} className="text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 text-sm">No collections found</p>
          <Link
            href="/aggregator/collections/new"
            className="text-emerald-700 text-sm font-medium mt-2 inline-block hover:underline"
          >
            Start your first collection →
          </Link>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(c => {
            const statusCfg = STATUS_CONFIG[c.status] ?? {
              label: c.status?.replace(/_/g, ' '),
              color: 'text-gray-600',
              bg: 'bg-gray-100',
            };

            return (
              <Link
                key={c.id}
                href={`/aggregator/collections/${c.id}`}
                className="block bg-white rounded-xl p-4 border border-gray-100 hover:border-emerald-200 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {c.material_type ?? 'Mixed Plastic'}
                      </p>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${statusCfg.bg} ${statusCfg.color}`}>
                        {statusCfg.label}
                      </span>
                    </div>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {formatRelativeTime(c.created_at)}
                    </p>
                  </div>
                  <span className="text-sm font-bold text-emerald-700 font-mono ml-3 shrink-0">
                    {formatWeightKg(Number(c.median_weight))}
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
