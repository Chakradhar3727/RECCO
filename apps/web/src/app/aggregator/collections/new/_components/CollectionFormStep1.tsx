'use client';

import React from 'react';
import { MATERIAL_TYPES } from '@/lib/constants/material-types';
import type { CollectionFormData } from '../page';
import { ArrowRight, Check } from 'lucide-react';

interface Step1Props {
  formData: CollectionFormData;
  updateFormData: (updates: Partial<CollectionFormData>) => void;
  onNext: () => void;
}

export default function CollectionFormStep1({ formData, updateFormData, onNext }: Step1Props) {
  const toggleMaterial = (value: string) => {
    const current = formData.materialTypes;
    if (current.includes(value)) {
      updateFormData({ materialTypes: current.filter(v => v !== value) });
    } else {
      updateFormData({ materialTypes: [...current, value] });
    }
  };

  const selectedCount = formData.materialTypes.length;

  return (
    <div>
      <h2 className="text-lg md:text-xl font-bold text-gray-900 mb-1">Select Material Types</h2>
      <p className="text-sm text-gray-500 mb-4 md:mb-6">
        Choose one or more CPCB categories of plastic you collected
      </p>

      {/* Selected count badge */}
      {selectedCount > 0 && (
        <div className="mb-4 flex items-center gap-2">
          <span className="bg-emerald-100 text-emerald-800 text-xs font-bold px-3 py-1.5 rounded-full">
            {selectedCount} material{selectedCount > 1 ? 's' : ''} selected
          </span>
          {selectedCount > 1 && (
            <button
              onClick={() => updateFormData({ materialTypes: [] })}
              className="text-xs text-gray-400 hover:text-red-500 transition-colors"
            >
              Clear all
            </button>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4 mb-24 md:mb-8">
        {MATERIAL_TYPES.map((material) => {
          const isSelected = formData.materialTypes.includes(material.value);
          return (
            <button
              key={material.value}
              onClick={() => toggleMaterial(material.value)}
              className={`w-full text-left p-4 rounded-xl border-2 transition-all group ${
                isSelected
                  ? 'border-emerald-600 bg-emerald-50 shadow-sm'
                  : 'border-gray-100 bg-white hover:border-emerald-200 hover:shadow-sm'
              }`}
            >
              <div className="flex items-start gap-3">
                <span className="text-2xl mt-0.5 group-hover:scale-110 transition-transform">{material.icon}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-sm md:text-base font-semibold ${isSelected ? 'text-emerald-800' : 'text-gray-900'}`}>
                      {material.label}
                    </span>
                  </div>
                  <span className={`inline-block text-[10px] md:text-xs px-2 py-0.5 rounded-full font-medium mb-1.5 ${
                      isSelected
                        ? 'bg-emerald-200 text-emerald-800'
                        : 'bg-gray-100 text-gray-500'
                    }`}>
                      {material.category}
                  </span>
                  <p className="text-xs md:text-sm text-gray-500 leading-relaxed md:leading-snug">
                    {material.description}
                  </p>
                </div>
                {/* Checkbox-style indicator */}
                <div className={`w-6 h-6 rounded-md border-2 flex items-center justify-center shrink-0 mt-1 transition-all ${
                  isSelected
                    ? 'bg-emerald-600 border-emerald-600 shadow-sm'
                    : 'border-gray-300 bg-white group-hover:border-emerald-400'
                }`}>
                  {isSelected && (
                    <Check size={14} className="text-white" strokeWidth={3} />
                  )}
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Continue CTA */}
      <div className="fixed md:relative bottom-0 left-0 right-0 p-4 md:p-0 bg-white md:bg-transparent border-t border-gray-100 md:border-none md:mt-8 z-10 shadow-[0_-10px_15px_-3px_rgba(0,0,0,0.05)] md:shadow-none">
        <button
          onClick={onNext}
          disabled={selectedCount === 0}
          className={`w-full md:max-w-md md:mx-auto py-3.5 md:py-4 rounded-xl text-sm md:text-base font-bold flex items-center justify-center gap-2 transition-all ${
            selectedCount > 0
              ? 'bg-emerald-700 text-white hover:bg-emerald-800 shadow-md shadow-emerald-700/20 active:scale-[0.98]'
              : 'bg-gray-200 text-gray-400 cursor-not-allowed'
          }`}
        >
          Continue to Photos {selectedCount > 0 && `(${selectedCount} selected)`}
          <ArrowRight size={18} />
        </button>
      </div>
    </div>
  );
}
