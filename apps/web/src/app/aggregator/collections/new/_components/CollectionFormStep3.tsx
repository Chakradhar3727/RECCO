'use client';

import React, { useEffect, useState, useCallback } from 'react';
import type { CollectionFormData } from '../page';
import { MapPin, Loader2, AlertTriangle, CheckCircle2, ArrowRight, ArrowLeft, XCircle } from 'lucide-react';

interface Step3Props {
  formData: CollectionFormData;
  updateFormData: (updates: Partial<CollectionFormData>) => void;
  onNext: () => void;
  onBack: () => void;
}

type GPSState = 'ACQUIRING' | 'ACQUIRED' | 'FAILED';

async function reverseGeocode(lat: number, lng: number): Promise<string> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`,
      {
        headers: {
          'User-Agent': 'RECCO-EPR-Platform/1.0 (contact@recco.in)',
          'Accept-Language': 'en',
        },
      }
    );
    if (!res.ok) return `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
    const data = await res.json();
    const addr = data.address || {};
    const parts = [addr.suburb || addr.neighbourhood, addr.city || addr.city_district, addr.state].filter(Boolean);
    return parts.join(', ') || data.display_name?.split(',').slice(0, 3).join(',') || `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
  } catch {
    return `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
  }
}

export default function CollectionFormStep3({ formData, updateFormData, onNext, onBack }: Step3Props) {
  const [gpsState, setGpsState] = useState<GPSState>(formData.gpsLat ? 'ACQUIRED' : 'ACQUIRING');
  const [error, setError] = useState<string>('');
  const [elapsed, setElapsed] = useState(0);

  const acquireGPS = useCallback(() => {
    setGpsState('ACQUIRING');
    setError('');
    setElapsed(0);

    const timer = setInterval(() => setElapsed(prev => prev + 1), 1000);
    const timeout = setTimeout(() => {
      clearInterval(timer);
      setGpsState('FAILED');
      setError('GPS acquisition timed out (15s). Move to an open area and retry.');
    }, 15000);

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        clearTimeout(timeout);
        clearInterval(timer);
        const { latitude, longitude, accuracy } = position.coords;
        const locationName = await reverseGeocode(latitude, longitude);
        updateFormData({
          gpsLat: latitude,
          gpsLng: longitude,
          gpsAccuracy: accuracy,
          locationName,
        });
        setGpsState('ACQUIRED');
      },
      (err) => {
        clearTimeout(timeout);
        clearInterval(timer);
        setGpsState('FAILED');
        if (err.code === 1) setError('Location permission denied. Enable GPS in browser settings.');
        else if (err.code === 2) setError('GPS unavailable on this device.');
        else setError('GPS acquisition failed. Move outdoors and retry.');
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  }, [updateFormData]);

  useEffect(() => {
    if (!formData.gpsLat) {
      acquireGPS();
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div>
      <h2 className="text-lg font-bold text-gray-900 mb-1">GPS Location Lock</h2>
      <p className="text-sm text-gray-500 mb-6">Your collection location is captured automatically</p>

      {/* ACQUIRING */}
      {gpsState === 'ACQUIRING' && (
        <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center">
          <div className="relative w-20 h-20 mx-auto mb-4">
            <div className="absolute inset-0 rounded-full border-4 border-emerald-200 animate-ping" />
            <div className="absolute inset-2 rounded-full border-4 border-emerald-300 animate-ping animation-delay-300" />
            <div className="absolute inset-4 rounded-full bg-emerald-100 flex items-center justify-center">
              <MapPin size={24} className="text-emerald-700" />
            </div>
          </div>
          <p className="text-sm font-medium text-gray-900">Acquiring GPS location...</p>
          <p className="text-xs text-gray-500 mt-1">This usually takes 5–10 seconds</p>
          {elapsed > 10 && (
            <p className="text-xs text-amber-600 mt-2 font-mono">{elapsed}s elapsed</p>
          )}
        </div>
      )}

      {/* ACQUIRED */}
      {gpsState === 'ACQUIRED' && formData.gpsLat && formData.gpsLng && (
        <div className="space-y-3">
          {/* Map tile placeholder */}
          <div className="bg-emerald-50 rounded-2xl h-44 flex items-center justify-center border border-emerald-200 overflow-hidden">
            <img
              src={`https://staticmap.openstreetmap.de/staticmap.php?center=${formData.gpsLat},${formData.gpsLng}&zoom=15&size=375x180&markers=${formData.gpsLat},${formData.gpsLng},ol-marker`}
              alt="Collection location map"
              className="w-full h-full object-cover"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = 'none';
              }}
            />
          </div>

          {/* Location Card */}
          <div className="bg-white rounded-xl border border-gray-100 p-4">
            <div className="flex items-center gap-2 mb-3">
              <CheckCircle2 size={18} className="text-emerald-600" />
              <span className="text-sm font-semibold text-emerald-700">GPS Locked ✓</span>
            </div>
            <p className="text-base font-bold text-gray-900">{formData.locationName}</p>
            <p className="text-xs text-gray-400 font-mono mt-1">
              {formData.gpsLat.toFixed(6)}, {formData.gpsLng.toFixed(6)}
            </p>
            {formData.gpsAccuracy && (
              <p className="text-xs text-gray-400 mt-0.5">Accuracy: ±{Math.round(formData.gpsAccuracy)}m</p>
            )}
            <p className="text-[10px] text-gray-400 mt-2 italic">
              Location captured automatically — cannot be edited
            </p>
          </div>
        </div>
      )}

      {/* FAILED */}
      {gpsState === 'FAILED' && (
        <div className="bg-red-50 rounded-2xl border border-red-200 p-6 text-center">
          <XCircle size={32} className="text-red-400 mx-auto mb-3" />
          <p className="text-sm font-semibold text-red-700">GPS Lock Failed</p>
          <p className="text-xs text-red-500 mt-1">{error}</p>
          <button
            onClick={acquireGPS}
            className="mt-4 px-6 py-2.5 bg-red-600 text-white rounded-xl text-sm font-semibold hover:bg-red-700 transition-colors"
          >
            Retry GPS Lock
          </button>
        </div>
      )}

      {/* Navigation */}
      <div className="sticky bottom-0 pt-4 pb-2 bg-gray-50 mt-6 flex gap-3">
        <button
          onClick={onBack}
          className="flex-1 py-3.5 rounded-xl text-sm font-semibold border-2 border-gray-200 text-gray-600 flex items-center justify-center gap-2"
        >
          <ArrowLeft size={16} /> Back
        </button>
        <button
          onClick={onNext}
          disabled={gpsState !== 'ACQUIRED'}
          className={`flex-[2] py-3.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-all ${
            gpsState === 'ACQUIRED'
              ? 'bg-emerald-700 text-white hover:bg-emerald-800'
              : 'bg-gray-200 text-gray-400 cursor-not-allowed'
          }`}
        >
          Continue to Review <ArrowRight size={16} />
        </button>
      </div>
    </div>
  );
}
