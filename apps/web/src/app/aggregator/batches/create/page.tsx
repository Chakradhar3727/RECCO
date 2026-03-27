'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { formatWeightKg } from '@/lib/utils/format-indian';
import { formatRelativeTime } from '@/lib/utils/date-ist';
import { ArrowLeft, Check, Layers, Loader2 } from 'lucide-react';

interface AvailableCollection {
  id: string;
  material_type: string;
  median_weight: number;
  created_at: string;
}

export default function CreateBatchPage() {
  const router = useRouter();
  const [collections, setCollections] = useState<AvailableCollection[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Fetch available collections
  useEffect(() => {
    async function fetchAvailable() {
      try {
        const res = await fetch('/api/batches/available-collections');
        if (res.ok) {
          const data = await res.json();
          setCollections(data.collections ?? []);
        }
      } catch {
        setError('Failed to load collections');
      } finally {
        setLoading(false);
      }
    }
    fetchAvailable();
  }, []);

  const toggleSelection = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const selectedCollections = collections.filter(c => selectedIds.has(c.id));
  const totalWeight = selectedCollections.reduce((sum, c) => sum + (Number(c.median_weight) || 0), 0);

  const handleCreateBatch = async () => {
    if (selectedIds.size < 1) return;
    setSubmitting(true);
    setError('');

    try {
      const res = await fetch('/api/batches/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ collectionIds: Array.from(selectedIds) }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Batch creation failed');
      }

      router.push('/aggregator/batches');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create batch');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-[180px] md:pb-8">
      {/* Header */}
      <div className="bg-emerald-900 text-white px-4 md:px-8 pt-6 pb-5 md:pb-8 rounded-b-3xl md:rounded-b-none">
        <div className="flex items-center gap-3">
          <button onClick={() => router.back()} className="hover:bg-emerald-700 p-1.5 md:p-2 rounded-lg transition-colors">
            <ArrowLeft size={20} className="md:w-6 md:h-6" />
          </button>
          <div>
            <h1 className="text-lg md:text-2xl font-bold">Create New Batch</h1>
            <p className="text-emerald-200 text-xs md:text-sm mt-0.5">Group collections for recycler transfer</p>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 md:px-8 pt-6 md:pt-8 w-full">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 size={24} className="text-emerald-600 animate-spin" />
          </div>
        ) : collections.length === 0 ? (
          <div className="bg-white rounded-xl p-8 text-center border border-gray-100 shadow-sm">
            <Layers size={32} className="text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 text-sm">No available collections for batching</p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl md:p-6 md:shadow-sm md:border md:border-gray-100 relative pb-[160px] md:pb-[100px]">
            <p className="text-sm text-gray-500 mb-4 px-1">
              Select collections to group into a batch ({collections.length} available)
            </p>

            {/* Select All */}
            <button
              onClick={() => {
                if (selectedIds.size === collections.length) {
                  setSelectedIds(new Set());
                } else {
                  setSelectedIds(new Set(collections.map(c => c.id)));
                }
              }}
              className="text-xs md:text-sm text-emerald-700 font-medium mb-4 px-1 hover:underline"
            >
              {selectedIds.size === collections.length ? 'Deselect All' : 'Select All'}
            </button>

            <div className="space-y-4">
              {collections.map(c => {
                const isSelected = selectedIds.has(c.id);
                return (
                  <button
                    key={c.id}
                    onClick={() => toggleSelection(c.id)}
                    className={`w-full text-left p-4 rounded-xl border-2 transition-all ${
                      isSelected
                        ? 'border-emerald-500 bg-emerald-50 shadow-sm'
                        : 'border-gray-100 bg-white hover:border-emerald-200'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-4 md:gap-5 flex-1 min-w-0">
                        <div className={`shrink-0 w-6 h-6 md:w-7 md:h-7 rounded-md border-2 flex items-center justify-center transition-colors ${
                          isSelected ? 'bg-emerald-600 border-emerald-600' : 'border-gray-300'
                        }`}>
                          {isSelected && <Check size={14} className="text-white" />}
                        </div>
                        <div className="min-w-0 flex-1 ml-1">
                          <p className="text-sm md:text-base font-bold text-gray-900 truncate">{c.material_type?.replace(/_/g, ' ') ?? 'Mixed'}</p>
                          <p className="text-xs md:text-sm text-gray-400 mt-0.5 truncate">{formatRelativeTime(c.created_at)}</p>
                        </div>
                      </div>
                      <span className="shrink-0 text-sm md:text-base font-black text-emerald-700 font-mono bg-white px-2 py-1 rounded-md border border-emerald-100">
                        {formatWeightKg(Number(c.median_weight))}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Error */}
            {error && (
              <div className="mt-4 bg-red-50 border border-red-200 rounded-xl p-4 text-sm font-medium text-red-700">
                {error}
              </div>
            )}

            {/* Sticky Bottom Summary - Mobile vs Desktop handling */}
            {selectedIds.size > 0 && (
              <div className="fixed md:absolute bottom-0 left-0 right-0 bg-white md:bg-gray-50 md:rounded-b-2xl border-t md:border-t-0 md:border-x md:border-b border-gray-200 px-4 md:px-6 py-4 z-50 shadow-[0_-10px_15px_-3px_rgba(0,0,0,0.05)] md:shadow-none">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex flex-col md:flex-row md:items-center gap-1 md:gap-4 text-sm text-gray-600">
                    <div>
                      <span className="font-bold text-gray-900 text-base">{selectedIds.size}</span> collections selected
                    </div>
                    <div className="hidden md:block w-1 h-1 bg-gray-300 rounded-full" />
                    <div>
                      Total Weight: <span className="font-bold text-emerald-700 font-mono text-base">{formatWeightKg(totalWeight)}</span>
                    </div>
                  </div>
                  <button
                    onClick={handleCreateBatch}
                    disabled={submitting}
                    className="w-full md:w-auto px-8 py-3 rounded-xl bg-emerald-700 text-white text-sm md:text-base font-bold flex items-center justify-center gap-2 hover:bg-emerald-800 disabled:opacity-50 transition-colors shadow-md shadow-emerald-700/20"
                  >
                    {submitting ? (
                      <><Loader2 size={18} className="animate-spin" /> Processing</>
                    ) : (
                      <><Layers size={18} /> Create Batch</>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
