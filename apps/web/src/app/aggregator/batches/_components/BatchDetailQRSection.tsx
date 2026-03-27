'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { Lock, Printer, Mail } from 'lucide-react';
import QRCode from 'qrcode';

interface BatchDetailQRSectionProps {
  batchId: string;
  batchStatus: string;
  qrTokenUrl: string | null;
  qrExpiresAt: string | null;
  pickedUpAt: string | null;
  carrierName: string | null;
  pickupGpsLat: number | null;
  pickupGpsLng: number | null;
}

export default function BatchDetailQRSection({
  batchId,
  batchStatus,
  qrTokenUrl,
  qrExpiresAt,
  pickedUpAt,
  carrierName,
  pickupGpsLat,
  pickupGpsLng,
}: BatchDetailQRSectionProps) {
  const [hasShared, setHasShared] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);

  // Is locked if awaiting acknowledgment or earlier
  const isLocked = ['PENDING_PICKUP', 'AWAITING_ACK', 'ASSIGNED', 'RESCHEDULED', 'RECYCLER_REJECTED', 'CREATED'].includes(batchStatus);
  const isPickedUp = ['IN_TRANSIT', 'ARRIVED', 'IN_PROCESSING', 'COMPLETE', 'CERT_ISSUED', 'ISSUED'].includes(batchStatus);
  const isUnlocked = batchStatus === 'ACKNOWLEDGED' || batchStatus === 'QR_SHARED' || qrTokenUrl !== null;

  useEffect(() => {
    if (qrTokenUrl && !isPickedUp) {
      // Generate standard 400x400 QR code
      QRCode.toDataURL(qrTokenUrl, {
        width: 400,
        margin: 2,
        errorCorrectionLevel: 'H',
        color: {
          dark: '#1B6B35', // Primary Green
          light: '#FFFFFF'
        }
      }).then(url => {
        setQrDataUrl(url);
      }).catch(err => {
        console.error('Failed to generate QR:', err);
      });
    }
  }, [qrTokenUrl, isPickedUp]);

  const handleShareClick = () => setHasShared(true);

  return (
    <div className="bg-white rounded-xl border border-gray-300 p-5 mt-6 shadow-sm font-sans">
      <div className="mb-6">
        <h2 className="text-base font-bold text-slate-900 leading-tight">Transport QR Code</h2>
        <p className="text-[13px] text-slate-500 mt-1">Share this QR with your carrier to enable GPS-verified pickup.</p>
      </div>

      {isPickedUp && (
        <div className="bg-green-50 rounded-xl p-5 border border-green-200">
          <div className="flex items-center gap-2 text-green-800 font-bold text-[15px] mb-2">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12"></polyline>
            </svg>
            Batch Picked Up
          </div>
          <p className="text-[13px] text-slate-600 mb-1">
            Carrier: <span className="font-semibold text-slate-800">{carrierName || 'Unknown'}</span> scanned at {pickedUpAt ? new Date(pickedUpAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false }) + ' IST' : ''}
          </p>
          {(pickupGpsLat && pickupGpsLng) && (
            <p className="text-[12px] text-slate-400 font-mono">
              GPS: [{pickupGpsLat.toFixed(6)}, {pickupGpsLng.toFixed(6)}]
            </p>
          )}
        </div>
      )}

      {!isPickedUp && isLocked && (
        <div className="flex flex-col items-center">
          <div className="w-[200px] h-[200px] bg-slate-50 border border-dashed border-slate-300 rounded-xl flex items-center justify-center mb-4">
            <Lock size={32} className="text-slate-400" />
          </div>
          <p className="text-[12px] text-slate-400 mb-6">Waiting for Recycler to acknowledge</p>
          
          <div className="w-full flex-col lg:flex-row flex gap-3 lg:justify-center">
            {['WhatsApp', 'Email', 'Print'].map((label) => (
              <button
                key={label}
                disabled
                title="QR unlocks once the recycler acknowledges this batch."
                className="h-[44px] px-6 rounded-lg border border-slate-300 bg-slate-50 text-slate-300 text-[13px] cursor-not-allowed flex items-center justify-center"
              >
                {label === 'Print' ? <Printer size={20} className="mr-2" /> : label === 'Email' ? <Mail size={20} className="mr-2" /> : null}
                {label === 'WhatsApp' ? (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" className="mr-2">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372C7.382 7.07 6.44 8.01 6.44 9.92c0 1.91 1.956 3.762 2.228 4.125.273.364 2.809 4.287 6.804 6.014.95.411 1.691.656 2.268.84.952.304 1.819.261 2.503.158.766-.115 2.352-.962 2.684-1.892.332-.93.332-1.727.233-1.892-.099-.165-.371-.264-.668-.413zM12 21.01h-.004c-1.574 0-3.116-.423-4.469-1.222l-.32-.19-3.324.872.888-3.24-.208-.33a9.05 9.05 0 0 1-1.385-4.786c0-4.99 4.062-9.053 9.053-9.053 2.417 0 4.69.941 6.398 2.65A8.995 8.995 0 0 1 21.053 12c0 4.99-4.06-9.052-9.053-9.01z" />
                  </svg>
                ) : ''}
                {label === 'WhatsApp' ? 'Share via WhatsApp' : label === 'Email' ? 'Send via Email' : 'Print QR'}
              </button>
            ))}
          </div>
        </div>
      )}

      {!isPickedUp && isUnlocked && qrDataUrl && (
        <div className="flex flex-col items-center">
          <div className="w-[160px] h-[160px] lg:w-[200px] lg:h-[200px] bg-white border-2 border-green-800 rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow">
            <Image src={qrDataUrl} alt="Transport QR Code" width={200} height={200} className="w-full h-full object-cover" unoptimized />
          </div>
          
          <div className="mt-3 flex flex-col items-center">
            {qrExpiresAt && (
              <p className="text-[12px] text-slate-400 mb-1">
                Expires: {new Date(qrExpiresAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
              </p>
            )}
            {qrExpiresAt && new Date(qrExpiresAt).getTime() - Date.now() < 7 * 24 * 60 * 60 * 1000 && (
              <span className="text-[11px] px-2 py-0.5 rounded bg-amber-50 text-amber-700 font-medium">
                Expiring soon — regenerate
              </span>
            )}
          </div>

          <div className="w-full flex-col lg:flex-row flex gap-3 lg:justify-center mt-6">
            <button
              onClick={() => {
                handleShareClick();
                // Setup WhatsApp share intent here for actual use
                const message = encodeURIComponent(`Please scan this QR code for RECCO batch pickup: ${qrTokenUrl}`);
                window.open(`https://wa.me/?text=${message}`, '_blank');
              }}
              className="h-[44px] lg:px-6 px-4 rounded-lg border border-slate-300 bg-white text-slate-900 text-[13px] font-medium flex items-center justify-center hover:bg-slate-50 active:bg-slate-100 transition-colors"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="#1B6B35" className="mr-2">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372C7.382 7.07 6.44 8.01 6.44 9.92c0 1.91 1.956 3.762 2.228 4.125.273.364 2.809 4.287 6.804 6.014.95.411 1.691.656 2.268.84.952.304 1.819.261 2.503.158.766-.115 2.352-.962 2.684-1.892.332-.93.332-1.727.233-1.892-.099-.165-.371-.264-.668-.413zM12 21.01h-.004c-1.574 0-3.116-.423-4.469-1.222l-.32-.19-3.324.872.888-3.24-.208-.33a9.05 9.05 0 0 1-1.385-4.786c0-4.99 4.062-9.053 9.053-9.053 2.417 0 4.69.941 6.398 2.65A8.995 8.995 0 0 1 21.053 12c0 4.99-4.06-9.052-9.053-9.01z" />
              </svg>
              Share via WhatsApp
            </button>
            <button
              onClick={handleShareClick}
              className="h-[44px] lg:px-6 px-4 rounded-lg border border-slate-300 bg-white text-slate-900 text-[13px] font-medium flex items-center justify-center hover:bg-slate-50 active:bg-slate-100 transition-colors"
            >
              <Mail size={20} className="mr-2 text-slate-700" />
              Send via Email
            </button>
            <button
              onClick={() => {
                 handleShareClick();
                 window.print();
              }}
              className="h-[44px] lg:px-6 px-4 rounded-lg border border-slate-300 bg-white text-slate-900 text-[13px] font-medium flex items-center justify-center hover:bg-slate-50 active:bg-slate-100 transition-colors"
            >
              <Printer size={20} className="mr-2 text-slate-700" />
              Print QR
            </button>
          </div>

          <div className="mt-4 flex justify-center">
            {hasShared ? (
              <span className="inline-flex items-center px-3 py-1 rounded-full text-[12px] font-bold bg-green-50 text-green-800">
                QR Shared ✓
              </span>
            ) : (
              <span className="inline-flex items-center px-3 py-1 rounded-full text-[12px] font-bold bg-slate-100 text-slate-600">
                Ready to Share
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
