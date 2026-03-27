'use client';

import React from 'react';
import { Check } from 'lucide-react';

interface StepProgressIndicatorProps {
  currentStep: number;
  completedSteps: boolean[];
}

const STEP_LABELS = ['Material', 'Photos', 'GPS', 'Review'];

export default function StepProgressIndicator({ currentStep, completedSteps }: StepProgressIndicatorProps) {
  return (
    <div className="flex items-center justify-between">
      {STEP_LABELS.map((label, index) => {
        const stepNum = index + 1;
        const isCompleted = completedSteps[index];
        const isCurrent = stepNum === currentStep;
        const isPast = stepNum < currentStep;

        return (
          <React.Fragment key={stepNum}>
            <div className="flex flex-col items-center gap-1">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                  isCompleted || isPast
                    ? 'bg-white text-emerald-800'
                    : isCurrent
                      ? 'bg-emerald-600 text-white ring-2 ring-white/50'
                      : 'bg-emerald-700/50 text-emerald-200'
                }`}
              >
                {isCompleted || isPast ? <Check size={14} strokeWidth={3} /> : stepNum}
              </div>
              <span className={`text-[10px] font-medium ${
                isCurrent ? 'text-white' : 'text-emerald-300'
              }`}>
                {label}
              </span>
            </div>
            {index < STEP_LABELS.length - 1 && (
              <div className={`flex-1 h-0.5 mx-2 rounded-full transition-colors ${
                isPast || isCompleted ? 'bg-white/80' : 'bg-emerald-700/40'
              }`} />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}
