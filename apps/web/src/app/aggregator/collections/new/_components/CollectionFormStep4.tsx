'use client';

import React, { useState } from 'react';
import type { CollectionFormData } from '../page';
import { MATERIAL_TYPES } from '@/lib/constants/material-types';
import { formatWeightKg } from '@/lib/utils/format-indian';
import { ArrowLeft, Send, Loader2, CheckCircle2, MapPin, Camera, Package, AlertTriangle } from 'lucide-react';

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

  const selectedMaterials = MATERIAL_TYPES.filter(m => formData.materialTypes.includes(m.value));

  const handleSubmit = async () => {
    setSubmitting(true);
    setError('');

    try {
      const res = await fetch('/api/collections/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          materialType: formData.materialTypes.join(', '),
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
      <h2 className="text-lg md:text-xl font-bold text-gray-900 mb-1">Review & Submit</h2>
      <p className="text-sm text-gray-500 mb-4 md:mb-6">Verify all details before submitting</p>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4 mb-24 md:mb-8">
        {/* Material Type Card */}
        <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm flex flex-col justify-center">
          <div className="flex items-center gap-2 mb-3">
            <Package size={18} className="text-emerald-700" />
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Material Types</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {selectedMaterials.map(mat => (
              <div key={mat.value} className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2">
                <span className="text-xl">{mat.icon}</span>
                <div>
                  <p className="text-sm font-bold text-gray-900">{mat.label}</p>
                  <p className="text-[10px] text-gray-500">{mat.category}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Weight Card */}
        <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm flex flex-col justify-center">
          <div className="flex items-center gap-2 mb-3">
            <Camera size={18} className="text-emerald-700" />
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">OCR Weight</span>
          </div>
          <p className="text-3xl font-bold text-emerald-800 font-mono">
            {formData.medianWeightKg !== null ? formatWeightKg(formData.medianWeightKg) : '—'}
          </p>
          <div className="flex flex-wrap items-center gap-2 mt-2 text-xs text-gray-500 font-mono">
            {formData.photos.map((p, i) => (
              <span key={i} className="bg-gray-50 px-1.5 py-0.5 rounded">#{i + 1}: {p.extractedWeight?.toFixed(1) ?? '—'}</span>
            ))}
          </div>
          {formData.weightVariancePct !== null && (
            <p className={`text-xs mt-2 font-semibold inline-block px-2 py-1 rounded-md ${
              formData.weightVariancePct > 15 ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'
            }`}>
              Variance: {formData.weightVariancePct.toFixed(1)}%
            </p>
          )}
        </div>

        {/* GPS Card */}
        <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm flex flex-col justify-center md:col-span-2 lg:col-span-1">
          <div className="flex items-center gap-2 mb-3">
            <MapPin size={18} className="text-emerald-700" />
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Location</span>
          </div>
          <p className="text-sm md:text-base font-bold text-gray-900 leading-tight">{formData.locationName ?? '—'}</p>
          <p className="text-xs text-gray-400 font-mono mt-2 bg-gray-50 inline-block px-2 py-1 rounded">
            {formData.gpsLat?.toFixed(6)}, {formData.gpsLng?.toFixed(6)}
          </p>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="mt-4 md:mt-6 bg-red-50 border border-red-200 rounded-xl p-4 text-sm font-medium text-red-700 flex items-center gap-3">
          <AlertTriangle size={18} className="text-red-600 flex-shrink-0" />
          {error}
        </div>
      )}

      {/* Navigation */}
      <div className="fixed md:relative bottom-0 left-0 right-0 p-4 md:p-0 bg-white md:bg-transparent border-t border-gray-100 md:border-none md:mt-8 z-10 shadow-[0_-10px_15px_-3px_rgba(0,0,0,0.05)] md:shadow-none flex gap-3 max-w-3xl mx-auto w-full">
        <button
          onClick={onBack}
          disabled={submitting}
          className="flex-1 py-3.5 md:py-4 rounded-xl text-sm md:text-base font-bold border-2 border-gray-200 text-gray-600 flex items-center justify-center gap-2 hover:bg-gray-50 hover:border-gray-300 transition-colors disabled:opacity-50"
        >
          <ArrowLeft size={18} /> Back
        </button>
        <button
          onClick={handleSubmit}
          disabled={submitting}
          className="flex-[2] py-3.5 md:py-4 rounded-xl text-sm md:text-base font-bold bg-emerald-700 text-white flex items-center justify-center gap-2 hover:bg-emerald-800 shadow-md shadow-emerald-700/20 active:scale-[0.98] disabled:opacity-50 disabled:shadow-none transition-all"
        >
          {submitting ? (
            <><Loader2 size={18} className="animate-spin" /> Submitting...</>
          ) : (
            <><Send size={18} /> Submit Collection</>
          )}
        </button>
      </div>
    </div>
  );
}
