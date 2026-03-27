'use client';

import React, { useRef, useState, useCallback } from 'react';
import type { CollectionFormData, PhotoSlot } from '../page';
import { computeAverageWeight, computeWeightDiffPct } from '@/lib/utils/weight-stats';
import { validateExif } from '@/lib/utils/exif-validator';
import { sha256FromDataUrl, isDuplicatePhoto } from '@/lib/utils/image-hash';
import { computePhash, isNearDuplicate } from '@/lib/utils/phash';
import { watermarkPhoto } from '@/lib/utils/watermark-photo';
import { MATERIAL_TYPES } from '@/lib/constants/material-types';
import { Camera, RotateCcw, AlertTriangle, CheckCircle2, XCircle, ArrowRight, ArrowLeft, Loader2, ShieldAlert, Package, Scale } from 'lucide-react';

interface Step2Props {
  formData: CollectionFormData;
  updateFormData: (updates: Partial<CollectionFormData> | ((prev: CollectionFormData) => Partial<CollectionFormData>)) => void;
  onNext: () => void;
  onBack: () => void;
}

// ── Photo compression utility (runs in browser) ─────────────────────
async function compressPhoto(file: File, maxWidth = 800): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const reader = new FileReader();
    reader.onload = (e) => {
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const scale = Math.min(1, maxWidth / img.width);
        canvas.width = img.width * scale;
        canvas.height = img.height * scale;
        const ctx = canvas.getContext('2d')!;
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', 0.6));
      };
      img.onerror = reject;
      img.src = e.target?.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// ── OCR Server Action call ──────────────────────────────────────────
async function callOCRServerAction(base64Image: string): Promise<{
  success: boolean;
  extractedWeight: number | null;
  confidence: number;
  rawText: string;
  error?: string;
}> {
  try {
    const res = await fetch('/api/ocr/extract-weight', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ image: base64Image }),
      signal: AbortSignal.timeout(20000),
    });
    if (!res.ok) {
      return { success: false, extractedWeight: null, confidence: 0, rawText: '', error: `Server error ${res.status}` };
    }
    return await res.json();
  } catch (err) {
    return { success: false, extractedWeight: null, confidence: 0, rawText: '', error: 'Network error' };
  }
}

// ── AI Material Identification call ─────────────────────────────────
async function callMaterialAI(base64Image: string, expectedMaterial?: string): Promise<{
  success: boolean;
  detectedMaterial: string | null;
  confidence: number;
  reasoning: string;
  error?: string;
}> {
  try {
    const res = await fetch('/api/ai/identify-material', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ image: base64Image, expectedMaterial }),
      signal: AbortSignal.timeout(30000),
    });
    if (!res.ok) {
      return { success: false, detectedMaterial: null, confidence: 0, reasoning: '', error: `Server error ${res.status}` };
    }
    return await res.json();
  } catch (err) {
    return { success: false, detectedMaterial: null, confidence: 0, reasoning: '', error: 'Network error' };
  }
}

export default function CollectionFormStep2({ formData, updateFormData, onNext, onBack }: Step2Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [activeSlot, setActiveSlot] = useState<number | null>(null);

  const updatePhotoSlot = useCallback((index: number, updates: Partial<PhotoSlot>) => {
    updateFormData((prevForm) => {
      const newPhotos = [...prevForm.photos] as [PhotoSlot, PhotoSlot, PhotoSlot];
      newPhotos[index] = { ...newPhotos[index], ...updates };
      const updateObj: Partial<CollectionFormData> = { photos: newPhotos };

      // Check if weight photos (slot 0 & 1) are both done — compute average & variance
      const weightSlots = [newPhotos[0], newPhotos[1]];
      const weightsDone = weightSlots.every(p => p.state === 'SUCCESS' || p.state === 'LOW_CONFIDENCE');
      if (weightsDone) {
        const weights: [number, number] = [
          weightSlots[0].extractedWeight ?? 0,
          weightSlots[1].extractedWeight ?? 0,
        ];
        updateObj.medianWeightKg = computeAverageWeight(weights);
        updateObj.weightVariancePct = computeWeightDiffPct(weights);
      }

      // Check if material photo (slot 2) is done — store AI detection
      if (index === 2 && (updates.state === 'SUCCESS' || updates.state === 'LOW_CONFIDENCE')) {
        updateObj.aiDetectedMaterial = updates.detectedMaterial ?? null;
        updateObj.aiMaterialConfidence = updates.materialConfidence ?? null;
      }

      return updateObj;
    });
  }, [updateFormData]);

  const handleSlotTap = (index: number) => {
    setActiveSlot(index);
    fileInputRef.current?.click();
  };

  const handleFileCapture = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || activeSlot === null) return;

    // Reset the file input for re-use
    e.target.value = '';

    const slotIndex = activeSlot;
    const isMaterialSlot = slotIndex === 2;

    updatePhotoSlot(slotIndex, { state: 'PROCESSING' });

    try {
      // ── DEV BYPASS: Disable EXIF and camera requirements for local testing ─
      // NOTE: Set this to `true` when testing production locks, or `false` for gallery tests.
      const REQUIRE_CAMERA_AND_EXIF = false;

      // ── G54: EXIF Validation ──────────────────────────────────
      if (REQUIRE_CAMERA_AND_EXIF) {
        const exifResult = await validateExif(file);
        if (!exifResult.valid) {
          updatePhotoSlot(slotIndex, {
            state: 'FAILED',
            error: exifResult.reason || 'Photo rejected by EXIF check',
          });
          return;
        }
      }

      const compressed = await compressPhoto(file);
      updatePhotoSlot(slotIndex, { state: 'PROCESSING', imageBase64: compressed });

      // ── G53: SHA-256 Exact Duplicate Check ─────────────────────
      const hash = await sha256FromDataUrl(compressed);
      const existingHashes = formData.photos.map(p => p.sha256);
      if (isDuplicatePhoto(hash, existingHashes)) {
        updatePhotoSlot(slotIndex, {
          state: 'FAILED',
          error: 'Duplicate photo detected. Please take a new photo.',
        });
        return;
      }

      // ── G57: pHash Near-Duplicate Check ─────────────────────────
      const pHashValue = await computePhash(compressed);
      const existingPHashes = formData.photos.map(p => p.phash);
      if (isNearDuplicate(pHashValue, existingPHashes)) {
        updatePhotoSlot(slotIndex, {
          state: 'FAILED',
          error: 'Photo too similar to another slot. Please retake from a different angle.',
        });
        return;
      }

      // ── G56: Watermark the photo ───────────────────────────────
      const sessionId = sessionStorage.getItem('recco_session_id') || crypto.randomUUID();
      if (!sessionStorage.getItem('recco_session_id')) {
        sessionStorage.setItem('recco_session_id', sessionId);
      }
      const watermarked = await watermarkPhoto(compressed, { sessionId });

      if (isMaterialSlot) {
        // ── Photo 3: AI Material Identification ─────────────────
        const result = await callMaterialAI(watermarked, formData.materialTypes?.[0] || undefined);

        if (result.success && result.detectedMaterial) {
          const confidence = result.confidence;
          const isHighConfidence = confidence >= 60;
          updatePhotoSlot(slotIndex, {
            state: isHighConfidence ? 'SUCCESS' : 'LOW_CONFIDENCE',
            detectedMaterial: result.detectedMaterial,
            materialConfidence: confidence,
            confidence,
            rawText: result.reasoning,
            imageBase64: watermarked,
            sha256: hash,
            phash: pHashValue,
          });
        } else {
          updatePhotoSlot(slotIndex, {
            state: 'FAILED',
            error: result.error || 'Could not identify material',
            rawText: result.reasoning,
          });
        }
      } else {
        // ── Photo 1 & 2: OCR Weight Extraction ──────────────────
        const result = await callOCRServerAction(watermarked);

        if (result.success && result.extractedWeight !== null) {
          const confidence = result.confidence;
          const isHighConfidence = confidence >= 60;
          updatePhotoSlot(slotIndex, {
            state: isHighConfidence ? 'SUCCESS' : 'LOW_CONFIDENCE',
            extractedWeight: result.extractedWeight,
            confidence,
            rawText: result.rawText,
            imageBase64: watermarked,
            sha256: hash,
            phash: pHashValue,
          });
        } else {
          updatePhotoSlot(slotIndex, {
            state: 'FAILED',
            error: result.error || 'Could not extract weight',
            rawText: result.rawText,
          });
        }
      }
    } catch {
      updatePhotoSlot(slotIndex, { state: 'FAILED', error: 'Processing failed' });
    }
  };

  const handleRetake = (index: number) => {
    const purpose = formData.photos[index].purpose;
    updatePhotoSlot(index, {
      state: 'EMPTY', purpose, imageBase64: undefined, extractedWeight: undefined,
      confidence: undefined, rawText: undefined, error: undefined,
      detectedMaterial: undefined, materialConfidence: undefined,
    });
    if (index < 2) {
      updateFormData({ medianWeightKg: null, weightVariancePct: null });
    } else {
      updateFormData({ aiDetectedMaterial: null, aiMaterialConfidence: null });
    }
    setTimeout(() => handleSlotTap(index), 100);
  };

  // Check completion
  const weightSlots = formData.photos.slice(0, 2);
  const materialSlot = formData.photos[2];
  const weightSlotsComplete = weightSlots.every(p => p.state === 'SUCCESS' || p.state === 'LOW_CONFIDENCE');
  const materialSlotComplete = materialSlot.state === 'SUCCESS' || materialSlot.state === 'LOW_CONFIDENCE';
  const allSlotsComplete = weightSlotsComplete && materialSlotComplete;
  const varianceTooHigh = (formData.weightVariancePct ?? 0) > 30;
  const canContinue = allSlotsComplete && !varianceTooHigh;

  // Material info for display
  const materialInfo = materialSlot.detectedMaterial
    ? MATERIAL_TYPES.find(m => m.value === materialSlot.detectedMaterial) ?? null
    : null;

  return (
    <div>
      {/* Hidden file input for camera capture */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment" // G53: Enforce rear camera capture on mobile
        className="hidden"
        onChange={handleFileCapture}
      />

      {/* ─── SECTION 1: Weight Photos ─────────────────────────────── */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-1">
          <Scale size={20} className="text-emerald-700" />
          <h2 className="text-lg md:text-xl font-bold text-gray-900">Photograph Weighing Scale</h2>
        </div>
        <p className="text-sm text-gray-500 mb-4">Take 2 photos of the scale display for OCR weight extraction</p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
          {formData.photos.slice(0, 2).map((photo, index) => (
            <WeightPhotoSlotCard
              key={index}
              index={index}
              photo={photo}
              onTap={() => handleSlotTap(index)}
              onRetake={() => handleRetake(index)}
            />
          ))}
        </div>
      </div>

      {/* OCR Summary Bar */}
      {weightSlotsComplete && formData.medianWeightKg !== null && (
        <div className="mb-6 bg-white rounded-xl border border-gray-100 p-4 md:p-6 shadow-sm">
          <div className="text-center mb-2 md:mb-4">
            <p className="text-xs md:text-sm text-gray-500 uppercase tracking-wider font-medium">Average Weight</p>
            <p className="text-3xl md:text-5xl font-bold text-emerald-800 font-mono mt-1 md:mt-2">
              {formData.medianWeightKg.toFixed(2)} <span className="text-lg md:text-2xl">kg</span>
            </p>
          </div>
          <div className="flex items-center justify-center gap-4 text-xs md:text-sm text-gray-500 font-mono">
            {formData.photos.slice(0, 2).map((p, i) => (
              <span key={i} className="bg-gray-50 px-2.5 py-1 rounded-md">#{i + 1}: {p.extractedWeight?.toFixed(1)}</span>
            ))}
          </div>
          {/* Variance Chip */}
          <div className="flex justify-center mt-4">
            <VarianceChip variancePct={formData.weightVariancePct ?? 0} />
          </div>
        </div>
      )}

      {/* ─── SECTION 2: Material Photo ────────────────────────────── */}
      <div className="mb-24 md:mb-8">
        <div className="flex items-center gap-2 mb-1">
          <Package size={20} className="text-blue-700" />
          <h2 className="text-lg md:text-xl font-bold text-gray-900">Photograph Material</h2>
        </div>
        <p className="text-sm text-gray-500 mb-4">Take a photo of the collected plastic — AI will identify the material type</p>

        <MaterialPhotoSlotCard
          photo={materialSlot}
          materialInfo={materialInfo}
          onTap={() => handleSlotTap(2)}
          onRetake={() => handleRetake(2)}
        />

        {/* AI Material Detection Result */}
        {materialSlotComplete && materialInfo && (
          <div className="mt-4 bg-blue-50 rounded-xl border border-blue-200 p-4 shadow-sm">
            <div className="flex items-center gap-3">
              <span className="text-3xl">{materialInfo.icon}</span>
              <div>
                <p className="text-lg font-bold text-blue-800">{materialInfo.label}</p>
                <p className="text-xs text-blue-600">{materialInfo.category} • {materialSlot.materialConfidence}% confidence</p>
              </div>
            </div>
            {materialSlot.rawText && (
              <p className="text-xs text-blue-500 mt-2 leading-relaxed">{materialSlot.rawText}</p>
            )}
            {/* Mismatch warning with Step 1 selection */}
            {formData.materialTypes.length > 0 && materialSlot.detectedMaterial &&
              !formData.materialTypes.includes(materialSlot.detectedMaterial) && (
              <div className="mt-3 bg-amber-50 border border-amber-300 rounded-lg p-3 flex items-start gap-2">
                <AlertTriangle size={16} className="text-amber-600 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-amber-700">
                  <strong>Mismatch:</strong> AI detected <strong>{materialInfo.label}</strong> but you selected{' '}
                  <strong>{formData.materialTypes.join(', ')}</strong> in Step 1. Please verify the material type.
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Navigation */}
      <div className="fixed md:relative bottom-0 left-0 right-0 p-4 md:p-0 bg-white md:bg-transparent border-t border-gray-100 md:border-none md:mt-8 z-10 shadow-[0_-10px_15px_-3px_rgba(0,0,0,0.05)] md:shadow-none flex gap-3 max-w-3xl mx-auto w-full">
        <button
          onClick={onBack}
          className="flex-1 py-3.5 md:py-4 rounded-xl text-sm md:text-base font-bold border-2 border-gray-200 text-gray-600 flex items-center justify-center gap-2 hover:bg-gray-50 hover:border-gray-300 transition-colors"
        >
          <ArrowLeft size={18} /> Back
        </button>
        <button
          onClick={onNext}
          disabled={!canContinue}
          className={`flex-[2] py-3.5 md:py-4 rounded-xl text-sm md:text-base font-bold flex items-center justify-center gap-2 transition-all ${
            canContinue
              ? 'bg-emerald-700 text-white hover:bg-emerald-800 shadow-md shadow-emerald-700/20 active:scale-[0.98]'
              : 'bg-gray-200 text-gray-400 cursor-not-allowed'
          }`}
        >
          {varianceTooHigh ? 'Retake — variance too high' : 'Continue to GPS Lock'}
          {!varianceTooHigh && <ArrowRight size={18} />}
        </button>
      </div>
    </div>
  );
}

// ── Weight Photo Slot Card ──────────────────────────────────────────
function WeightPhotoSlotCard({ index, photo, onTap, onRetake }: {
  index: number; photo: PhotoSlot; onTap: () => void; onRetake: () => void;
}) {
  if (photo.state === 'EMPTY') {
    return (
      <button onClick={onTap} className="w-full h-28 border-2 border-dashed border-gray-300 rounded-xl flex flex-col items-center justify-center gap-2 hover:border-emerald-400 hover:bg-emerald-50/30 transition-all">
        <Camera size={24} className="text-gray-400" />
        <span className="text-xs text-gray-500 font-medium">Photo {index + 1} — Tap to photograph scale</span>
      </button>
    );
  }

  if (photo.state === 'PROCESSING') {
    return (
      <div className="w-full h-28 bg-gray-100 rounded-xl flex items-center justify-center gap-3 border-2 border-gray-200">
        <Loader2 size={20} className="text-emerald-600 animate-spin" />
        <span className="text-sm text-gray-600">Reading weight...</span>
      </div>
    );
  }

  if (photo.state === 'SUCCESS') {
    return (
      <div className="bg-white rounded-xl border-2 border-emerald-500 p-3 relative" style={{ borderLeftWidth: '6px', borderLeftColor: '#16A34A' }}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 size={18} className="text-emerald-600" />
            <span className="text-lg font-bold text-emerald-700 font-mono">{photo.extractedWeight?.toFixed(2)} kg</span>
            <span className="text-xs text-emerald-600">{photo.confidence}%</span>
          </div>
          <button onClick={onRetake} className="text-xs text-gray-400 hover:text-gray-600 flex items-center gap-1">
            <RotateCcw size={12} /> Retake
          </button>
        </div>
      </div>
    );
  }

  if (photo.state === 'LOW_CONFIDENCE') {
    return (
      <div className="bg-white rounded-xl border-2 border-amber-400 p-3" style={{ borderLeftWidth: '6px', borderLeftColor: '#B45309' }}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle size={18} className="text-amber-600" />
            <span className="text-lg font-bold text-amber-700 font-mono">{photo.extractedWeight?.toFixed(2)} kg</span>
            <span className="text-xs text-amber-600">{photo.confidence}%</span>
          </div>
          <button onClick={onRetake} className="text-xs text-amber-600 hover:text-amber-800 flex items-center gap-1">
            <RotateCcw size={12} /> Retake
          </button>
        </div>
        <p className="text-xs text-amber-600 mt-1">Low confidence — retake for clearer photo</p>
      </div>
    );
  }

  // FAILED
  return (
    <div className="bg-red-50 rounded-xl border-2 border-red-300 p-3" style={{ borderLeftWidth: '6px', borderLeftColor: '#B91C1C' }}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <XCircle size={18} className="text-red-600" />
          <span className="text-sm font-semibold text-red-700">Unreadable</span>
        </div>
        <button onClick={onRetake} className="text-xs text-red-600 hover:text-red-800 flex items-center gap-1 font-medium">
          <RotateCcw size={12} /> Retake
        </button>
      </div>
      <p className="text-xs text-red-500 mt-1">Photo unreadable — retake required</p>
    </div>
  );
}

// ── Material Photo Slot Card ────────────────────────────────────────
interface MaterialPhotoSlotProps {
  photo: PhotoSlot;
  materialInfo: { icon: string; label: string; category: string } | null;
  onTap: () => void;
  onRetake: () => void;
}

function MaterialPhotoSlotCard({ photo, materialInfo, onTap, onRetake }: MaterialPhotoSlotProps) {
  if (photo.state === 'EMPTY') {
    return (
      <button onClick={onTap} className="w-full h-28 border-2 border-dashed border-blue-300 rounded-xl flex flex-col items-center justify-center gap-2 hover:border-blue-400 hover:bg-blue-50/30 transition-all bg-blue-50/10">
        <Package size={24} className="text-blue-400" />
        <span className="text-xs text-blue-500 font-medium">Photo 3 — Tap to photograph material</span>
      </button>
    );
  }

  if (photo.state === 'PROCESSING') {
    return (
      <div className="w-full h-28 bg-blue-50 rounded-xl flex items-center justify-center gap-3 border-2 border-blue-200">
        <Loader2 size={20} className="text-blue-600 animate-spin" />
        <span className="text-sm text-blue-600">Identifying material...</span>
      </div>
    );
  }

  if (photo.state === 'SUCCESS' && materialInfo) {
    return (
      <div className="bg-white rounded-xl border-2 border-blue-500 p-3 relative" style={{ borderLeftWidth: '6px', borderLeftColor: '#2563EB' }}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 size={18} className="text-blue-600" />
            <span className="text-xl">{materialInfo.icon}</span>
            <span className="text-lg font-bold text-blue-700">{materialInfo.label}</span>
            <span className="text-xs text-blue-600">{photo.materialConfidence}%</span>
          </div>
          <button onClick={onRetake} className="text-xs text-gray-400 hover:text-gray-600 flex items-center gap-1">
            <RotateCcw size={12} /> Retake
          </button>
        </div>
      </div>
    );
  }

  if (photo.state === 'LOW_CONFIDENCE') {
    return (
      <div className="bg-white rounded-xl border-2 border-amber-400 p-3" style={{ borderLeftWidth: '6px', borderLeftColor: '#B45309' }}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle size={18} className="text-amber-600" />
            <span className="text-lg font-bold text-amber-700">{materialInfo?.label ?? photo.detectedMaterial ?? 'Unknown'}</span>
            <span className="text-xs text-amber-600">{photo.materialConfidence}%</span>
          </div>
          <button onClick={onRetake} className="text-xs text-amber-600 hover:text-amber-800 flex items-center gap-1">
            <RotateCcw size={12} /> Retake
          </button>
        </div>
        <p className="text-xs text-amber-600 mt-1">Low confidence — retake for a clearer photo of the material</p>
      </div>
    );
  }

  if (photo.state === 'SUCCESS' && !materialInfo) {
    // Detected material but couldn't map to a known type
    return (
      <div className="bg-white rounded-xl border-2 border-blue-500 p-3" style={{ borderLeftWidth: '6px', borderLeftColor: '#2563EB' }}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 size={18} className="text-blue-600" />
            <span className="text-lg font-bold text-blue-700">{photo.detectedMaterial}</span>
            <span className="text-xs text-blue-600">{photo.materialConfidence}%</span>
          </div>
          <button onClick={onRetake} className="text-xs text-gray-400 hover:text-gray-600 flex items-center gap-1">
            <RotateCcw size={12} /> Retake
          </button>
        </div>
      </div>
    );
  }

  // FAILED
  return (
    <div className="bg-red-50 rounded-xl border-2 border-red-300 p-3" style={{ borderLeftWidth: '6px', borderLeftColor: '#B91C1C' }}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <XCircle size={18} className="text-red-600" />
          <span className="text-sm font-semibold text-red-700">Identification failed</span>
        </div>
        <button onClick={onRetake} className="text-xs text-red-600 hover:text-red-800 flex items-center gap-1 font-medium">
          <RotateCcw size={12} /> Retake
        </button>
      </div>
      <p className="text-xs text-red-500 mt-1">{photo.error || 'Could not identify material — retake required'}</p>
    </div>
  );
}

// ── Variance Chip ────────────────────────────────────────────────────
function VarianceChip({ variancePct }: { variancePct: number }) {
  if (variancePct > 30) {
    return (
      <span className="px-3 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700">
        Very high variance ({variancePct.toFixed(1)}%) — retake photos
      </span>
    );
  }
  if (variancePct > 15) {
    return (
      <span className="px-3 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-700">
        High variance ({variancePct.toFixed(1)}%) — verify scale
      </span>
    );
  }
  return (
    <span className="px-3 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700">
      Consistent ✓ ({variancePct.toFixed(1)}%)
    </span>
  );
}
