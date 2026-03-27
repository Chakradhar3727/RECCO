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
      <h2 className="text-lg md:text-xl font-bold text-gray-900 mb-1">GPS Location Lock</h2>
      <p className="text-sm text-gray-500 mb-6 md:mb-8">Your collection location is captured automatically</p>

      {/* ACQUIRING */}
      {gpsState === 'ACQUIRING' && (
        <div className="bg-white rounded-2xl border border-gray-100 p-8 md:p-12 text-center shadow-sm">
          <div className="relative w-20 h-20 md:w-24 md:h-24 mx-auto mb-4 md:mb-6">
            <div className="absolute inset-0 rounded-full border-4 border-emerald-200 animate-ping" />
            <div className="absolute inset-2 md:inset-3 rounded-full border-4 border-emerald-300 animate-ping animation-delay-300" />
            <div className="absolute inset-4 md:inset-6 rounded-full bg-emerald-100 flex items-center justify-center">
              <MapPin size={28} className="text-emerald-700" />
            </div>
          </div>
          <p className="text-sm md:text-base font-medium text-gray-900">Acquiring GPS location...</p>
          <p className="text-xs md:text-sm text-gray-500 mt-1.5 md:mt-2">This usually takes 5–10 seconds</p>
          {elapsed > 10 && (
            <p className="text-xs md:text-sm text-amber-600 mt-3 md:mt-4 font-mono">{elapsed}s elapsed</p>
          )}
        </div>
      )}

      {/* ACQUIRED */}
      {gpsState === 'ACQUIRED' && formData.gpsLat && formData.gpsLng && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
          {/* Map tile placeholder */}
          <div className="bg-emerald-50 rounded-2xl h-44 md:h-full min-h-[176px] flex items-center justify-center border border-emerald-200 overflow-hidden shadow-sm">
            <iframe
              title="Collection Location Map"
              width="100%"
              height="100%"
              frameBorder="0"
              scrolling="no"
              marginHeight={0}
              marginWidth={0}
              src={`https://www.openstreetmap.org/export/embed.html?bbox=${formData.gpsLng! - 0.005},${formData.gpsLat! - 0.005},${formData.gpsLng! + 0.005},${formData.gpsLat! + 0.005}&layer=mapnik&marker=${formData.gpsLat},${formData.gpsLng}`}
              className="w-full h-full border-0"
            />
          </div>

          {/* Location Card */}
          <div className="bg-white rounded-xl border border-gray-100 p-5 md:p-6 shadow-sm flex flex-col justify-center">
            <div className="flex items-center gap-2 mb-3 md:mb-4">
              <CheckCircle2 size={20} className="text-emerald-600" />
              <span className="text-sm md:text-base font-bold text-emerald-700">GPS Locked ✓</span>
            </div>
            <p className="text-base md:text-lg font-bold text-gray-900 leading-tight md:leading-snug">{formData.locationName}</p>
            <p className="text-xs md:text-sm text-gray-400 font-mono mt-2 md:mt-3 bg-gray-50 inline-block px-2 py-1 rounded">
              {formData.gpsLat.toFixed(6)}, {formData.gpsLng.toFixed(6)}
            </p>
            {formData.gpsAccuracy && (
              <p className="text-xs md:text-sm text-gray-500 mt-2">Accuracy: ±{Math.round(formData.gpsAccuracy)}m</p>
            )}
            <div className="mt-4 md:mt-6 pt-3 md:pt-4 border-t border-gray-100">
               <p className="text-xs md:text-sm text-gray-400 italic">
                 Location captured automatically — cannot be edited
               </p>
            </div>
          </div>
        </div>
      )}

      {/* FAILED */}
      {gpsState === 'FAILED' && (
        <div className="bg-red-50 rounded-2xl border border-red-200 p-6 md:p-8 text-center shadow-sm max-w-lg mx-auto">
          <XCircle size={36} className="text-red-400 mx-auto mb-3 md:mb-4" />
          <p className="text-base md:text-lg font-bold text-red-700 mb-1 md:mb-2">GPS Lock Failed</p>
          <p className="text-sm text-red-600 mb-4 md:mb-6">{error}</p>
          <button
            onClick={acquireGPS}
            className="px-6 py-3 bg-red-600 text-white rounded-xl text-sm md:text-base font-bold hover:bg-red-700 transition-colors shadow-md shadow-red-600/20 active:scale-[0.98]"
          >
            Retry GPS Lock
          </button>
        </div>
      )}

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
          disabled={gpsState !== 'ACQUIRED'}
          className={`flex-[2] py-3.5 md:py-4 rounded-xl text-sm md:text-base font-bold flex items-center justify-center gap-2 transition-all ${
            gpsState === 'ACQUIRED'
              ? 'bg-emerald-700 text-white hover:bg-emerald-800 shadow-md shadow-emerald-700/20 active:scale-[0.98]'
              : 'bg-gray-200 text-gray-400 cursor-not-allowed'
          }`}
        >
          Continue to Review <ArrowRight size={18} />
        </button>
      </div>
    </div>
  );
}
