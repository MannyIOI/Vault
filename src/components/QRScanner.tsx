'use client';

import { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { Icons } from '../types';

interface QRScannerProps {
  onScan: (decodedText: string) => void;
  onClose: () => void;
}

export const QRScanner = ({ onScan, onClose }: QRScannerProps) => {
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  // Keep latest callbacks in refs so we can safely use [] as the effect deps
  // (otherwise every parent re-render passes new closures, restarting the
  // camera mid-scan and making it impossible to scan again).
  const onScanRef = useRef(onScan);
  const onCloseRef = useRef(onClose);
  useEffect(() => { onScanRef.current = onScan; }, [onScan]);
  useEffect(() => { onCloseRef.current = onClose; }, [onClose]);

  // Persist a single AudioContext for the lifetime of the scanner so we can
  // prime it inside the user gesture that opened the modal — otherwise iOS
  // and recent Chrome leave new AudioContexts suspended until the next
  // user input, which silences the chime fired from the scan callback.
  const audioCtxRef = useRef<AudioContext | null>(null);
  useEffect(() => {
    try {
      const Ctx = (window as any).AudioContext || (window as any).webkitAudioContext;
      if (!Ctx) return;
      const ctx: AudioContext = new Ctx();
      audioCtxRef.current = ctx;
      // Play a zero-amplitude tick to "warm up" the context. This is
      // enough on Safari to keep it in the running state.
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      gain.gain.value = 0;
      osc.connect(gain).connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.01);
    } catch { /* audio unavailable; ignore */ }
    return () => {
      try { audioCtxRef.current?.close(); } catch { /* ignore */ }
      audioCtxRef.current = null;
    };
  }, []);

  // Quick "ka-ching" cash-register-style chime, synthesized on the fly so we
  // don't have to ship an audio asset.
  const playCashRegisterSound = () => {
    const ctx = audioCtxRef.current;
    if (!ctx) return;
    const start = () => {
      const playTone = (freq: number, offset: number, duration: number, peak = 0.5, type: OscillatorType = 'triangle') => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = type;
        osc.frequency.value = freq;
        const t0 = ctx.currentTime + offset;
        gain.gain.setValueAtTime(0.0001, t0);
        gain.gain.exponentialRampToValueAtTime(peak, t0 + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);
        osc.connect(gain).connect(ctx.destination);
        osc.start(t0);
        osc.stop(t0 + duration + 0.02);
      };
      // Bright "ka-ching": E6 then G6, a tiny bit of A6 sparkle on top.
      playTone(1318.5, 0,    0.18);
      playTone(1567.9, 0.09, 0.28);
      playTone(1760,   0.10, 0.22, 0.25, 'sine');
    };
    if (ctx.state === 'suspended') {
      ctx.resume().then(start).catch(() => {/* ignore */});
    } else {
      start();
    }
  };

  useEffect(() => {
    let cancelled = false;
    let didFire = false;

    const startScanner = async () => {
      try {
        const html5QrCode = new Html5Qrcode("qr-reader");
        scannerRef.current = html5QrCode;

        const config = {
          fps: 10,
          qrbox: { width: 250, height: 250 },
          aspectRatio: 1.0
        };

        await html5QrCode.start(
          { facingMode: "environment" },
          config,
          (decodedText) => {
            // Guard against rapid repeat detections after the modal already
            // requested close.
            if (didFire) return;
            didFire = true;
            playCashRegisterSound();
            onScanRef.current(decodedText);
            onCloseRef.current();
          },
          () => {} // Ignore per-frame scan errors
        );
        if (!cancelled) setIsReady(true);
      } catch (err: any) {
        console.error("Failed to start scanner:", err);
        if (!cancelled) setError("Camera access denied or not found. Please ensure you have granted camera permissions.");
      }
    };

    startScanner();

    return () => {
      cancelled = true;
      const s = scannerRef.current;
      if (s && s.isScanning) {
        // Fire-and-forget; await would block React's cleanup phase.
        s.stop().then(() => s.clear()).catch(err => console.error("Failed to stop scanner:", err));
      }
    };
  }, []);

  return (
    <div className="fixed inset-0 bg-black/90 z-[200] flex flex-col items-center justify-center p-6 backdrop-blur-md">
      <div className="w-full max-w-md bg-white rounded-3xl overflow-hidden shadow-2xl relative">
        <div className="p-4 bg-primary text-white flex justify-between items-center">
          <h3 className="font-headline font-bold">Scan IMEI / QR Code</h3>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-lg transition-colors">
            <Icons.Close size={24} />
          </button>
        </div>
        
        <div className="relative aspect-square bg-black flex items-center justify-center overflow-hidden">
          <div id="qr-reader" className="w-full h-full"></div>
          {!isReady && !error && (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-white">
              <div className="w-10 h-10 border-4 border-white/20 border-t-white rounded-full animate-spin mb-4"></div>
              <p className="text-xs font-bold uppercase tracking-widest">Initializing Camera...</p>
            </div>
          )}
          {error && (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-8 text-white bg-red-900/20">
              <Icons.Warning size={48} className="text-red-500 mb-4" />
              <p className="text-sm font-bold mb-4">{error}</p>
              <button 
                onClick={onClose}
                className="px-6 py-2 bg-white text-primary rounded-xl font-bold text-xs uppercase"
              >
                Go Back
              </button>
            </div>
          )}
          {isReady && (
            <div className="absolute inset-0 pointer-events-none border-[40px] border-black/40">
              <div className="w-full h-full border-2 border-primary/50 rounded-lg relative">
                <div className="absolute top-0 left-0 w-4 h-4 border-t-4 border-l-4 border-primary"></div>
                <div className="absolute top-0 right-0 w-4 h-4 border-t-4 border-r-4 border-primary"></div>
                <div className="absolute bottom-0 left-0 w-4 h-4 border-b-4 border-l-4 border-primary"></div>
                <div className="absolute bottom-0 right-0 w-4 h-4 border-b-4 border-r-4 border-primary"></div>
                <div className="absolute top-1/2 left-0 w-full h-0.5 bg-primary/30 animate-pulse"></div>
              </div>
            </div>
          )}
        </div>

        <div className="p-6 text-center bg-slate-50">
          <p className="text-slate-500 text-sm font-medium">
            {isReady ? "Position the code within the frame to scan automatically." : "Waiting for camera access..."}
          </p>
        </div>
      </div>
    </div>
  );
};
