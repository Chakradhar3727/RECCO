'use client';

import React, { useState } from 'react';
import type { CollectionFormData } from '../page';
import { MATERIAL_TYPES } from '@/lib/constants/material-types';
import { formatWeightKg } from '@/lib/utils/format-indian';
import { ArrowLeft, Send, Loader2, CheckCircle2, MapPin, Camera, Package } from 'lucide-react';

interface Step4Props {
  formData: CollectionFormData;
  updateFormData: (updates: Partial<CollectionFormData>) => void;
  onBack: () => void;
  onComplete: () => void;
}

export default function CollectionFormStep4({ formData, updateFormData, onBack, onComplete }: Step4Props) {
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  const material = MATERIAL_TYPES.find(m => m.value === formData.materialType);

  const handleSubmit = async () => {
    setSubmitting(true);
    setError('');

    try {
      const res = await fetch('/api/collections/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          materialType: formData.materialType,
          photos: formData.photos.map(p => ({
            extractedWeight: p.extractedWeight,
            confidence: p.confidence,
            imageBase64: p.imageBase64,
          })),
          medianWeightKg: formData.medianWeightKg,
          weightVariancePct: formData.weightVariancePct,
          gpsLat: formData.gpsLat,
          gpsLng: formData.gpsLng,
          locationName: formData.locationName,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `Submission failed (${res.status})`);
      }

      const data = await res.json();
      updateFormData({ submissionId: data.id });
      setSubmitted(true);

      // Auto-navigate after 2 seconds
      setTimeout(onComplete, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Submission failed');
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mb-4">
          <CheckCircle2 size={40} className="text-emerald-600" />
        </div>
        <h2 className="text-xl font-bold text-gray-900 mb-1">Collection Submitted!</h2>
        <p className="text-sm text-gray-500">Redirecting to dashboard...</p>
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-lg font-bold text-gray-900 mb-1">Review & Submit</h2>
      <p className="text-sm text-gray-500 mb-4">Verify all details before submitting</p>

      <div className="space-y-3">
        {/* Material Type Card */}
        <div className="bg-white rounded-xl border border-gray-100 p-4">
          <div className="flex items-center gap-2 mb-2">
            <Package size={16} className="text-emerald-700" />
            <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">Material Type</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-2xl">{material?.icon}</span>
            <div>
              <p className="text-sm font-bold text-gray-900">{material?.label}</p>
              <p className="text-xs text-gray-500">{material?.category}</p>
            </div>
          </div>
        </div>

        {/* Weight Card */}
        <div className="bg-white rounded-xl border border-gray-100 p-4">
          <div className="flex items-center gap-2 mb-2">
            <Camera size={16} className="text-emerald-700" />
            <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">OCR Weight</span>
          </div>
          <p className="text-2xl font-bold text-emerald-800 font-mono">
            {formData.medianWeightKg !== null ? formatWeightKg(formData.medianWeightKg) : '—'}
          </p>
          <div className="flex items-center gap-3 mt-2 text-xs text-gray-500 font-mono">
            {formData.photos.map((p, i) => (
              <span key={i}>#{i + 1}: {p.extractedWeight?.toFixed(1) ?? '—'}</span>
            ))}
          </div>
          {formData.weightVariancePct !== null && (
            <p className={`text-xs mt-1 font-medium ${
              formData.weightVariancePct > 15 ? 'text-amber-600' : 'text-emerald-600'
            }`}>
              Variance: {formData.weightVariancePct.toFixed(1)}%
            </p>
          )}
        </div>

        {/* GPS Card */}
        <div className="bg-white rounded-xl border border-gray-100 p-4">
          <div className="flex items-center gap-2 mb-2">
            <MapPin size={16} className="text-emerald-700" />
            <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">Location</span>
          </div>
          <p className="text-sm font-bold text-gray-900">{formData.locationName ?? '—'}</p>
          <p className="text-xs text-gray-400 font-mono mt-0.5">
            {formData.gpsLat?.toFixed(6)}, {formData.gpsLng?.toFixed(6)}
          </p>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="mt-4 bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Navigation */}
      <div className="sticky bottom-0 pt-4 pb-2 bg-gray-50 mt-6 flex gap-3">
        <button
          onClick={onBack}
          disabled={submitting}
          className="flex-1 py-3.5 rounded-xl text-sm font-semibold border-2 border-gray-200 text-gray-600 flex items-center justify-center gap-2"
        >
          <ArrowLeft size={16} /> Back
        </button>
        <button
          onClick={handleSubmit}
          disabled={submitting}
          className="flex-[2] py-3.5 rounded-xl text-sm font-semibold bg-emerald-700 text-white flex items-center justify-center gap-2 hover:bg-emerald-800 disabled:opacity-50 transition-all"
        >
          {submitting ? (
            <><Loader2 size={16} className="animate-spin" /> Submitting...</>
          ) : (
            <><Send size={16} /> Submit Collection</>
          )}
        </button>
      </div>
    </div>
  );
}
