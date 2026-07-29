import React, { FormEvent, useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  AlertCircle,
  CheckCircle2,
  Loader2,
  LocateFixed,
  MapPin,
  X,
} from 'lucide-react';
import {
  DeliveryServiceStatus,
  DetectedDeliveryLocation,
  isApprovedBengaluruPincode,
  normalizeBengaluruPincode,
  reverseGeocodeLocation,
} from './serviceArea';

export interface SavedDeliveryLocation {
  label: string;
  address: string;
  landmark?: string;
  pincode: string;
}

interface DeliveryLocationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (location: SavedDeliveryLocation) => void;
  onServiceStatusChange: (status: DeliveryServiceStatus) => void;
}

type LocationStep = 'detecting' | 'detected' | 'manual';

export function DeliveryLocationModal({
  isOpen,
  onClose,
  onSave,
  onServiceStatusChange,
}: DeliveryLocationModalProps) {
  const [step, setStep] = useState<LocationStep>('detecting');
  const [detectedLocation, setDetectedLocation] =
    useState<DetectedDeliveryLocation | null>(null);
  const [locationMessage, setLocationMessage] = useState('');
  const [address, setAddress] = useState('');
  const [landmark, setLandmark] = useState('');
  const [pincode, setPincode] = useState('');
  const dialogRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    let cancelled = false;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    setStep('detecting');
    setDetectedLocation(null);
    setLocationMessage('');
    setAddress('');
    setLandmark('');
    setPincode('');
    titleRef.current?.focus();

    const moveToManualEntry = (message: string) => {
      if (cancelled) return;
      setLocationMessage(message);
      setStep('manual');
    };

    if (!navigator.geolocation) {
      moveToManualEntry('Location detection is not available in this browser. Enter your address below.');
    } else {
      navigator.geolocation.getCurrentPosition(
        async ({ coords }) => {
          try {
            const location = await reverseGeocodeLocation(
              coords.latitude,
              coords.longitude
            );
            if (cancelled) return;
            setDetectedLocation(location);
            setStep('detected');
            onServiceStatusChange(
              isApprovedBengaluruPincode(location.pincode)
                ? 'supported'
                : 'unsupported'
            );
          } catch {
            moveToManualEntry(
              'We could not determine your locality. Enter your Bengaluru address below.'
            );
          }
        },
        (error) => {
          moveToManualEntry(
            error.code === error.PERMISSION_DENIED
              ? 'Location access was declined. Enter your Bengaluru address below.'
              : 'We could not detect your location. Enter your Bengaluru address below.'
          );
        },
        {
          enableHighAccuracy: false,
          timeout: 10000,
          maximumAge: 300000,
        }
      );
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
        return;
      }

      if (event.key !== 'Tab' || !dialogRef.current) return;

      const focusableElements = Array.from(
        dialogRef.current.querySelectorAll<HTMLElement>(
          'button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])'
        )
      ) as HTMLElement[];
      if (focusableElements.length === 0) return;

      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];
      const activeElement = document.activeElement as HTMLElement | null;
      if (!activeElement || !focusableElements.includes(activeElement)) {
        event.preventDefault();
        (event.shiftKey ? lastElement : firstElement).focus();
      } else if (event.shiftKey && activeElement === firstElement) {
        event.preventDefault();
        lastElement.focus();
      } else if (!event.shiftKey && activeElement === lastElement) {
        event.preventDefault();
        firstElement.focus();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      cancelled = true;
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen]);

  const detectedIsSupported = detectedLocation
    ? isApprovedBengaluruPincode(detectedLocation.pincode)
    : false;
  const manualIsComplete = pincode.length === 6;
  const manualIsSupported =
    manualIsComplete && isApprovedBengaluruPincode(pincode);

  const showManualEntry = (message = '') => {
    setLocationMessage(message);
    setStep('manual');
  };

  const handlePincodeChange = (value: string) => {
    const nextPincode = normalizeBengaluruPincode(value);
    setPincode(nextPincode);
    if (nextPincode.length === 6) {
      onServiceStatusChange(
        isApprovedBengaluruPincode(nextPincode)
          ? 'supported'
          : 'unsupported'
      );
    }
  };

  const saveDetectedLocation = () => {
    if (!detectedLocation || !detectedIsSupported) return;
    onSave({
      label: `${detectedLocation.locality} · ${detectedLocation.pincode}`,
      address: detectedLocation.locality,
      pincode: detectedLocation.pincode,
    });
  };

  const saveManualLocation = (event: FormEvent) => {
    event.preventDefault();
    if (!address.trim() || !manualIsSupported) return;
    onSave({
      label: `${address.trim()} · ${pincode}`,
      address: address.trim(),
      landmark: landmark.trim() || undefined,
      pincode,
    });
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs"
          role="dialog"
          aria-modal="true"
          aria-labelledby="delivery-location-title"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) onClose();
          }}
        >
          <motion.div
            ref={dialogRef}
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            className="relative max-h-[92vh] w-full max-w-md overflow-y-auto rounded-2xl border border-stone-200 bg-white p-6 text-stone-800 shadow-xl"
          >
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 rounded-lg p-1 text-stone-400 transition-colors hover:bg-stone-100 hover:text-stone-600"
          aria-label="Close delivery location"
        >
          <X className="h-5 w-5" aria-hidden="true" />
        </button>

        <div className="flex items-center gap-3 pr-8">
          <div className="rounded-xl border border-[#183b2b]/20 bg-[#183b2b]/10 p-2.5 text-[#183b2b]">
            <MapPin className="h-5 w-5" aria-hidden="true" />
          </div>
          <div>
            <p className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#f48b4d]">
              Delivery location
            </p>
            <h3
              ref={titleRef}
              id="delivery-location-title"
              tabIndex={-1}
              className="font-serif text-lg font-bold text-[#183b2b] outline-none"
            >
              Check Bengaluru availability
            </h3>
          </div>
        </div>

        {step === 'detecting' && (
          <div className="py-10 text-center" role="status">
            <Loader2 className="mx-auto h-7 w-7 animate-spin text-[#183b2b]" aria-hidden="true" />
            <p className="mt-3 text-sm font-semibold text-[#183b2b]">
              Detecting your current location…
            </p>
            <p className="mt-1 text-xs text-stone-500">
              Allow location access when your browser asks.
            </p>
          </div>
        )}

        {step === 'detected' && detectedLocation && (
          <div className="mt-6 space-y-4">
            <div className="border border-stone-200 bg-[#f4f0e7]/50 p-4">
              <div className="flex items-start gap-3">
                <LocateFixed className="mt-0.5 h-5 w-5 shrink-0 text-[#183b2b]" aria-hidden="true" />
                <div>
                  <p className="text-xs font-mono font-bold uppercase text-[#55705c]">
                    Detected locality
                  </p>
                  <p className="mt-1 font-serif text-lg font-bold text-[#183b2b]">
                    {detectedLocation.locality}
                  </p>
                  <p className="text-xs text-stone-500">{detectedLocation.pincode}</p>
                </div>
              </div>
            </div>

            {detectedIsSupported ? (
              <div className="flex items-center gap-2 text-sm font-bold text-emerald-700" role="status">
                <CheckCircle2 className="h-5 w-5" aria-hidden="true" />
                Delivery Available
              </div>
            ) : (
              <div className="flex items-start gap-2 text-sm font-semibold text-[#9a4d2f]" role="status">
                <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
                We're expanding to your area soon.
              </div>
            )}

            <div className="flex flex-col gap-2 sm:flex-row">
              {detectedIsSupported && (
                <button
                  type="button"
                  onClick={saveDetectedLocation}
                  className="min-h-11 flex-1 rounded-xl bg-[#183b2b] px-4 py-2 text-xs font-semibold text-[#f4f0e7] transition-colors hover:bg-[#25543e]"
                >
                  Use this location
                </button>
              )}
              <button
                type="button"
                onClick={() => showManualEntry()}
                className="min-h-11 flex-1 rounded-xl border border-[#183b2b]/25 px-4 py-2 text-xs font-semibold text-[#183b2b] transition-colors hover:bg-[#183b2b]/5"
              >
                Enter address manually
              </button>
            </div>
          </div>
        )}

        {step === 'manual' && (
          <form onSubmit={saveManualLocation} className="mt-6 space-y-4">
            {locationMessage && (
              <p className="border border-[#e9e3d5] bg-[#f4f0e7] px-3 py-2 text-xs text-[#55705c]" role="status">
                {locationMessage}
              </p>
            )}

            <div>
              <label htmlFor="delivery-address" className="block text-xs font-bold text-[#183b2b]">
                Address
              </label>
              <input
                id="delivery-address"
                type="text"
                required
                autoComplete="street-address"
                value={address}
                onChange={(event) => setAddress(event.target.value)}
                className="mt-1 w-full rounded-xl border border-stone-300 px-3 py-2.5 text-sm outline-none transition-colors focus:border-[#183b2b]"
              />
            </div>

            <div>
              <label htmlFor="delivery-landmark" className="block text-xs font-bold text-[#183b2b]">
                Landmark <span className="font-normal text-stone-500">(optional)</span>
              </label>
              <input
                id="delivery-landmark"
                type="text"
                value={landmark}
                onChange={(event) => setLandmark(event.target.value)}
                className="mt-1 w-full rounded-xl border border-stone-300 px-3 py-2.5 text-sm outline-none transition-colors focus:border-[#183b2b]"
              />
            </div>

            <div>
              <label htmlFor="delivery-pincode" className="block text-xs font-bold text-[#183b2b]">
                Bengaluru PIN code
              </label>
              <input
                id="delivery-pincode"
                type="text"
                required
                inputMode="numeric"
                autoComplete="postal-code"
                pattern="[0-9]{6}"
                maxLength={6}
                value={pincode}
                onChange={(event) => handlePincodeChange(event.target.value)}
                className="mt-1 w-full rounded-xl border border-stone-300 px-3 py-2.5 text-sm outline-none transition-colors focus:border-[#183b2b]"
              />
            </div>

            {manualIsComplete &&
              (manualIsSupported ? (
                <div className="flex items-center gap-2 text-sm font-bold text-emerald-700" role="status">
                  <CheckCircle2 className="h-5 w-5" aria-hidden="true" />
                  Delivery Available
                </div>
              ) : (
                <div className="flex items-start gap-2 text-sm font-semibold text-[#9a4d2f]" role="status">
                  <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
                  We're expanding to your area soon.
                </div>
              ))}

            <button
              type="submit"
              disabled={!address.trim() || !manualIsSupported}
              className="min-h-11 w-full rounded-xl bg-[#183b2b] px-4 py-2.5 text-xs font-semibold text-[#f4f0e7] transition-colors hover:bg-[#25543e] disabled:cursor-not-allowed disabled:opacity-45"
            >
              Save delivery location
            </button>
          </form>
        )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
