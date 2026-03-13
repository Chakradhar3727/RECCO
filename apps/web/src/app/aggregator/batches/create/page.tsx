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
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Header */}
      <div className="bg-emerald-800 text-white px-4 pt-6 pb-5">
        <div className="flex items-center gap-3">
          <button onClick={() => router.back()} className="hover:bg-emerald-700 p-1 rounded-lg">
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-lg font-bold">Create New Batch</h1>
            <p className="text-emerald-200 text-xs">Group collections for recycler transfer</p>
          </div>
        </div>
      </div>

      <div className="px-4 pt-4">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 size={24} className="text-emerald-600 animate-spin" />
          </div>
        ) : collections.length === 0 ? (
          <div className="bg-white rounded-xl p-8 text-center border border-gray-100">
            <Layers size={32} className="text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 text-sm">No available collections for batching</p>
          </div>
        ) : (
          <>
            <p className="text-sm text-gray-500 mb-3">
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
              className="text-xs text-emerald-700 font-medium mb-3 hover:underline"
            >
              {selectedIds.size === collections.length ? 'Deselect All' : 'Select All'}
            </button>

            <div className="space-y-2">
              {collections.map(c => {
                const isSelected = selectedIds.has(c.id);
                return (
                  <button
                    key={c.id}
                    onClick={() => toggleSelection(c.id)}
                    className={`w-full text-left p-3 rounded-xl border-2 transition-all ${
                      isSelected
                        ? 'border-emerald-500 bg-emerald-50'
                        : 'border-gray-100 bg-white'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center ${
                          isSelected ? 'bg-emerald-600 border-emerald-600' : 'border-gray-300'
                        }`}>
                          {isSelected && <Check size={12} className="text-white" />}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">{c.material_type ?? 'Mixed'}</p>
                          <p className="text-xs text-gray-400">{formatRelativeTime(c.created_at)}</p>
                        </div>
                      </div>
                      <span className="text-sm font-bold text-emerald-700 font-mono">
                        {formatWeightKg(Number(c.median_weight))}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="mx-4 mt-3 bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Sticky Bottom Summary */}
      {selectedIds.size > 0 && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-4 py-3 z-50">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-600">
              <span className="font-bold text-gray-900">{selectedIds.size}</span> collections · <span className="font-bold text-emerald-700 font-mono">{formatWeightKg(totalWeight)}</span>
            </span>
          </div>
          <button
            onClick={handleCreateBatch}
            disabled={submitting}
            className="w-full py-3 rounded-xl bg-emerald-700 text-white text-sm font-semibold flex items-center justify-center gap-2 hover:bg-emerald-800 disabled:opacity-50"
          >
            {submitting ? (
              <><Loader2 size={16} className="animate-spin" /> Creating...</>
            ) : (
              <><Layers size={16} /> Create Batch</>
            )}
          </button>
        </div>
      )}
    </div>
  );
}
