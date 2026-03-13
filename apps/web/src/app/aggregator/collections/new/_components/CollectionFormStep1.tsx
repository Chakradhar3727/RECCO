'use client';

import React from 'react';
import { MATERIAL_TYPES } from '@/lib/constants/material-types';
import type { CollectionFormData } from '../page';
import { ArrowRight } from 'lucide-react';

interface Step1Props {
  formData: CollectionFormData;
  updateFormData: (updates: Partial<CollectionFormData>) => void;
  onNext: () => void;
}

export default function CollectionFormStep1({ formData, updateFormData, onNext }: Step1Props) {
  const handleSelect = (value: string) => {
    updateFormData({ materialType: value });
  };

  return (
    <div>
      <h2 className="text-lg font-bold text-gray-900 mb-1">Select Material Type</h2>
      <p className="text-sm text-gray-500 mb-4">Choose the CPCB category of plastic you collected</p>

      <div className="space-y-2">
        {MATERIAL_TYPES.map((material) => {
          const isSelected = formData.materialType === material.value;
          return (
            <button
              key={material.value}
              onClick={() => handleSelect(material.value)}
              className={`w-full text-left p-4 rounded-xl border-2 transition-all ${
                isSelected
                  ? 'border-emerald-600 bg-emerald-50 shadow-sm'
                  : 'border-gray-100 bg-white hover:border-gray-200'
              }`}
            >
              <div className="flex items-start gap-3">
                <span className="text-2xl mt-0.5">{material.icon}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={`text-sm font-semibold ${isSelected ? 'text-emerald-800' : 'text-gray-900'}`}>
                      {material.label}
                    </span>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                      isSelected
                        ? 'bg-emerald-200 text-emerald-800'
                        : 'bg-gray-100 text-gray-500'
                    }`}>
                      {material.category}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">
                    {material.description}
                  </p>
                </div>
                {isSelected && (
                  <div className="w-5 h-5 bg-emerald-600 rounded-full flex items-center justify-center shrink-0 mt-1">
                    <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                      <path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* Continue CTA */}
      <div className="sticky bottom-0 pt-4 pb-2 bg-gray-50 mt-4">
        <button
          onClick={onNext}
          disabled={!formData.materialType}
          className={`w-full py-3.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-all ${
            formData.materialType
              ? 'bg-emerald-700 text-white hover:bg-emerald-800 active:scale-[0.98]'
              : 'bg-gray-200 text-gray-400 cursor-not-allowed'
          }`}
        >
          Continue to Photos
          <ArrowRight size={16} />
        </button>
      </div>
    </div>
  );
}
