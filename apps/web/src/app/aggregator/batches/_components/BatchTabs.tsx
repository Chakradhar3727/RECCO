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
  CREATED: { label: 'Created', color: 'text-amber-700', bg: 'bg-amber-100' },
  AWAITING_ACKNOWLEDGMENT: { label: 'Awaiting Ack', color: 'text-orange-700', bg: 'bg-orange-100' },
  RESCHEDULED: { label: 'Rescheduled', color: 'text-yellow-700', bg: 'bg-yellow-100' },
  ACKNOWLEDGED: { label: 'Acknowledged', color: 'text-sky-700', bg: 'bg-sky-100' },
  PICKED_UP: { label: 'Picked Up', color: 'text-teal-700', bg: 'bg-teal-100' },
  IN_TRANSIT: { label: 'In Transit', color: 'text-blue-700', bg: 'bg-blue-100' },
  ARRIVED: { label: 'Arrived', color: 'text-indigo-700', bg: 'bg-indigo-100' },
  IN_PROCESSING: { label: 'Processing', color: 'text-purple-700', bg: 'bg-purple-100' },
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

            // Use batch_qr_payload or id prefix as batch identifier
            const batchLabel = batch.batch_qr_payload ?? `BATCH-${batch.id?.substring(0, 6).toUpperCase()}`;

            return (
              <div key={batch.id} className="bg-white rounded-xl border border-gray-100 p-4 hover:border-emerald-200 transition-colors">
                {/* Header Row */}
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-bold text-gray-900 font-mono">
                    {batchLabel}
                  </span>
                  <span className={`text-[10px] px-2.5 py-1 rounded-full font-bold ${statusCfg.bg} ${statusCfg.color}`}>
                    {statusCfg.label}
                  </span>
                </div>

                {/* Collection count if available */}
                {batch.collection_count && (
                  <p className="text-xs text-gray-500 mb-2">{batch.collection_count} collections</p>
                )}

                {/* Footer */}
                <div className="flex items-center justify-between text-xs text-gray-500 pt-2 border-t border-gray-50">
                  <div className="flex items-center gap-1">
                    <Clock size={12} />
                    <span>{formatRelativeTime(batch.created_at)}</span>
                  </div>
                  {batch.pickup_window_start && (
                    <span className="text-emerald-600 font-medium">
                      Pickup: {new Date(batch.pickup_window_start).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
