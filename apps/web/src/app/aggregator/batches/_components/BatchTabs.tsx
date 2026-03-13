'use client';

import React, { useState } from 'react';
import { formatWeightKg } from '@/lib/utils/format-indian';
import { formatRelativeTime } from '@/lib/utils/date-ist';
import { Layers, CheckCircle2, Clock, Truck, Package } from 'lucide-react';

interface BatchTabsProps {
  activeBatches: any[];
  completedBatches: any[];
}

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  PENDING_PICKUP: { label: 'Pending Pickup', color: 'text-amber-700', bg: 'bg-amber-100' },
  IN_TRANSIT: { label: 'In Transit', color: 'text-blue-700', bg: 'bg-blue-100' },
  AT_RECYCLER: { label: 'At Recycler', color: 'text-purple-700', bg: 'bg-purple-100' },
  PROCESSING: { label: 'Processing', color: 'text-indigo-700', bg: 'bg-indigo-100' },
  COMPLETE: { label: 'Complete', color: 'text-emerald-700', bg: 'bg-emerald-100' },
  ISSUED: { label: 'Certificate Issued', color: 'text-emerald-700', bg: 'bg-emerald-100' },
};

export default function BatchTabs({ activeBatches, completedBatches }: BatchTabsProps) {
  const [activeTab, setActiveTab] = useState<'active' | 'completed'>('active');
  const batches = activeTab === 'active' ? activeBatches : completedBatches;

  return (
    <div className="px-4 pt-4">
      {/* Tab Switcher */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 mb-4">
        <button
          onClick={() => setActiveTab('active')}
          className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all ${
            activeTab === 'active'
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-500'
          }`}
        >
          Active ({activeBatches.length})
        </button>
        <button
          onClick={() => setActiveTab('completed')}
          className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all ${
            activeTab === 'completed'
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-500'
          }`}
        >
          Completed ({completedBatches.length})
        </button>
      </div>

      {/* Batch Cards */}
      {batches.length === 0 ? (
        <div className="bg-white rounded-xl p-8 text-center border border-gray-100">
          <Layers size={32} className="text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 text-sm">
            {activeTab === 'active' ? 'No active batches' : 'No completed batches yet'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {batches.map((batch) => {
            const statusCfg = STATUS_CONFIG[batch.status] ?? {
              label: batch.status?.replace(/_/g, ' '),
              color: 'text-gray-600',
              bg: 'bg-gray-100',
            };

            return (
              <div key={batch.id} className="bg-white rounded-xl border border-gray-100 p-4 hover:border-emerald-200 transition-colors">
                {/* Header Row */}
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-bold text-gray-900 font-mono">
                    {batch.batch_number ?? `BATCH-${batch.id?.substring(0, 6)}`}
                  </span>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${statusCfg.bg} ${statusCfg.color}`}>
                    {statusCfg.label}
                  </span>
                </div>

                {/* Material Breakdown */}
                {batch.material_breakdown && typeof batch.material_breakdown === 'object' && (
                  <div className="flex flex-wrap gap-2 mb-3">
                    {Object.entries(batch.material_breakdown).map(([material, weight]) => (
                      <span key={material} className="text-xs bg-gray-50 px-2 py-1 rounded-lg text-gray-600">
                        {material}: {formatWeightKg(Number(weight))}
                      </span>
                    ))}
                  </div>
                )}

                {/* Footer */}
                <div className="flex items-center justify-between text-xs text-gray-500">
                  <span className="font-bold text-gray-900">
                    {formatWeightKg(Number(batch.total_weight) || 0)}
                  </span>
                  <span>{formatRelativeTime(batch.created_at)}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
