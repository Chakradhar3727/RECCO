'use client';

import React, { useState, useEffect, useCallback, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import CollectionFormStep1 from '@/app/aggregator/collections/new/_components/CollectionFormStep1';
import CollectionFormStep2 from '@/app/aggregator/collections/new/_components/CollectionFormStep2';
import CollectionFormStep3 from '@/app/aggregator/collections/new/_components/CollectionFormStep3';
import CollectionFormStep4 from '@/app/aggregator/collections/new/_components/CollectionFormStep4';
import StepProgressIndicator from '@/app/aggregator/collections/new/_components/StepProgressIndicator';

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
  materialTypes: string[];
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
  materialTypes: [],
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

function NewCollectionFormInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentStep = Number(searchParams.get('step')) || 1;

  const [formData, setFormData] = useState<CollectionFormData>(() => {
    // Restore from sessionStorage on mount
    if (typeof window !== 'undefined') {
      const saved = sessionStorage.getItem(SESSION_KEY);
      if (saved) {
        try { 
          const parsed = JSON.parse(saved);
          
          // Migration: if the old 'materialType' string exists and 'materialTypes' array is missing
          if (parsed.materialType !== undefined && parsed.materialTypes === undefined) {
            parsed.materialTypes = parsed.materialType ? [parsed.materialType] : [];
            delete parsed.materialType;
          }
          
          // Ensure all array fields are present by merging with initial data
          return { ...INITIAL_FORM_DATA, ...parsed, materialTypes: parsed.materialTypes || [] }; 
        } catch { /* ignore */ }
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

  const updateFormData = useCallback((updates: Partial<CollectionFormData> | ((prev: CollectionFormData) => Partial<CollectionFormData>)) => {
    setFormData(prev => ({ ...prev, ...(typeof updates === 'function' ? updates(prev) : updates) }));
  }, []);

  const resetForm = useCallback(() => {
    setFormData(INITIAL_FORM_DATA);
    sessionStorage.removeItem(SESSION_KEY);
    router.push('/aggregator/collections/new?step=1');
  }, [router]);

  // Step guards — prevent skipping ahead
  const canAccessStep = (step: number): boolean => {
    if (step <= 1) return true;
    if (step === 2) return formData.materialTypes.length > 0;
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
    formData.materialTypes.length > 0,
    formData.medianWeightKg !== null,
    formData.gpsLat !== null,
    formData.submissionId !== null,
  ];

  return (
    <div className="min-h-screen bg-gray-50 pb-6 md:pb-12">
      {/* Header */}
      <div className="bg-emerald-900 text-white px-4 md:px-8 pt-6 pb-4 md:pb-8 rounded-b-3xl md:rounded-b-none">
        <div className="flex items-center justify-between mb-3 md:mb-6 max-w-3xl mx-auto w-full">
          <h1 className="text-lg md:text-2xl font-bold">New Collection</h1>
          <button
            onClick={resetForm}
            className="text-emerald-200 text-xs md:text-sm hover:text-white transition-colors"
          >
            Reset
          </button>
        </div>
        <div className="max-w-3xl mx-auto w-full">
           <StepProgressIndicator currentStep={currentStep} completedSteps={completedSteps} />
        </div>
      </div>

      {/* Step Content */}
      <div className="px-4 md:px-8 pt-4 md:pt-8 w-full">
        <div className="max-w-3xl mx-auto">
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
    </div>
  );
}

// ── Exported Component ──────────────────────────────────────────────
export default function NewCollectionPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-50 flex items-center justify-center text-emerald-900 font-medium tracking-wide">Loading collection flow...</div>}>
      <NewCollectionFormInner />
    </Suspense>
  );
}
