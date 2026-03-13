'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import CollectionFormStep1 from './_components/CollectionFormStep1';
import CollectionFormStep2 from './_components/CollectionFormStep2';
import CollectionFormStep3 from './_components/CollectionFormStep3';
import CollectionFormStep4 from './_components/CollectionFormStep4';
import StepProgressIndicator from './_components/StepProgressIndicator';

// ── Form State Type ──────────────────────────────────────────────────
export interface PhotoSlot {
  state: 'EMPTY' | 'CAPTURING' | 'PROCESSING' | 'SUCCESS' | 'LOW_CONFIDENCE' | 'FAILED';
  imageBase64?: string;
  extractedWeight?: number;
  confidence?: number;
  rawText?: string;
  error?: string;
}

export interface CollectionFormData {
  // Step 1
  materialType: string | null;
  // Step 2
  photos: [PhotoSlot, PhotoSlot, PhotoSlot];
  medianWeightKg: number | null;
  weightVariancePct: number | null;
  // Step 3
  gpsLat: number | null;
  gpsLng: number | null;
  gpsAccuracy: number | null;
  locationName: string | null;
  gpsMismatch: boolean;
  // Step 4
  submissionId: string | null;
}

const EMPTY_PHOTO: PhotoSlot = { state: 'EMPTY' };

const INITIAL_FORM_DATA: CollectionFormData = {
  materialType: null,
  photos: [{ ...EMPTY_PHOTO }, { ...EMPTY_PHOTO }, { ...EMPTY_PHOTO }],
  medianWeightKg: null,
  weightVariancePct: null,
  gpsLat: null,
  gpsLng: null,
  gpsAccuracy: null,
  locationName: null,
  gpsMismatch: false,
  submissionId: null,
};

const SESSION_KEY = 'recco_collection_form';

// ── Main Form Component ──────────────────────────────────────────────
export default function NewCollectionPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentStep = Number(searchParams.get('step')) || 1;

  const [formData, setFormData] = useState<CollectionFormData>(() => {
    // Restore from sessionStorage on mount
    if (typeof window !== 'undefined') {
      const saved = sessionStorage.getItem(SESSION_KEY);
      if (saved) {
        try { return JSON.parse(saved); } catch { /* ignore */ }
      }
    }
    return INITIAL_FORM_DATA;
  });

  // Mirror state to sessionStorage on every change
  useEffect(() => {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(formData));
  }, [formData]);

  const goToStep = useCallback((step: number) => {
    router.push(`/aggregator/collections/new?step=${step}`);
  }, [router]);

  const updateFormData = useCallback((updates: Partial<CollectionFormData>) => {
    setFormData(prev => ({ ...prev, ...updates }));
  }, []);

  const resetForm = useCallback(() => {
    setFormData(INITIAL_FORM_DATA);
    sessionStorage.removeItem(SESSION_KEY);
    router.push('/aggregator/collections/new?step=1');
  }, [router]);

  // Step guards — prevent skipping ahead
  const canAccessStep = (step: number): boolean => {
    if (step <= 1) return true;
    if (step === 2) return formData.materialType !== null;
    if (step === 3) {
      return formData.medianWeightKg !== null && formData.photos.every(
        p => p.state === 'SUCCESS' || p.state === 'LOW_CONFIDENCE'
      );
    }
    if (step === 4) return formData.gpsLat !== null && formData.gpsLng !== null;
    return false;
  };

  // Redirect to step 1 if trying to access a step without completing previous
  useEffect(() => {
    if (currentStep > 1 && !canAccessStep(currentStep)) {
      router.replace('/aggregator/collections/new?step=1');
    }
  }, [currentStep]); // eslint-disable-line react-hooks/exhaustive-deps

  const completedSteps = [
    formData.materialType !== null,
    formData.medianWeightKg !== null,
    formData.gpsLat !== null,
    formData.submissionId !== null,
  ];

  return (
    <div className="min-h-screen bg-gray-50 pb-6">
      {/* Header */}
      <div className="bg-emerald-800 text-white px-4 pt-6 pb-4">
        <div className="flex items-center justify-between mb-3">
          <h1 className="text-lg font-bold">New Collection</h1>
          <button
            onClick={resetForm}
            className="text-emerald-200 text-xs hover:text-white transition-colors"
          >
            Reset
          </button>
        </div>
        <StepProgressIndicator currentStep={currentStep} completedSteps={completedSteps} />
      </div>

      {/* Step Content */}
      <div className="px-4 pt-4">
        {currentStep === 1 && (
          <CollectionFormStep1
            formData={formData}
            updateFormData={updateFormData}
            onNext={() => goToStep(2)}
          />
        )}
        {currentStep === 2 && (
          <CollectionFormStep2
            formData={formData}
            updateFormData={updateFormData}
            onNext={() => goToStep(3)}
            onBack={() => goToStep(1)}
          />
        )}
        {currentStep === 3 && (
          <CollectionFormStep3
            formData={formData}
            updateFormData={updateFormData}
            onNext={() => goToStep(4)}
            onBack={() => goToStep(2)}
          />
        )}
        {currentStep === 4 && (
          <CollectionFormStep4
            formData={formData}
            updateFormData={updateFormData}
            onBack={() => goToStep(3)}
            onComplete={() => {
              sessionStorage.removeItem(SESSION_KEY);
              router.push('/aggregator/dashboard');
            }}
          />
        )}
      </div>
    </div>
  );
}
