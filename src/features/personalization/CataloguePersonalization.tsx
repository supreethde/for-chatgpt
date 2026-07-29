import React, { useEffect, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Loader2,
  Settings2,
  Sparkles,
  X,
} from 'lucide-react';
import {
  BUSINESS_TYPES,
  CataloguePreferences,
  CataloguePreferencesInput,
  CUISINE_BUSINESS_TYPES,
  CUISINES,
  PERSONALIZATION_CATEGORIES,
} from './types';

interface CataloguePersonalizationProps {
  preferences: CataloguePreferences | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isSaving: boolean;
  error?: string | null;
  onSignIn: () => void;
  onSave: (preferences: CataloguePreferencesInput) => Promise<void>;
  onDisable: () => Promise<void>;
}

const EMPTY_PREFERENCES: CataloguePreferencesInput = {
  businessType: 'Restaurant',
  cuisine: undefined,
  averageDailyCovers: undefined,
  interestedCategories: [],
};

export function CataloguePersonalization({
  preferences,
  isAuthenticated,
  isLoading,
  isSaving,
  error,
  onSignIn,
  onSave,
  onDisable,
}: CataloguePersonalizationProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [step, setStep] = useState<'business' | 'cuisine' | 'details'>('business');
  const [draft, setDraft] = useState<CataloguePreferencesInput>(EMPTY_PREFERENCES);

  const requiresCuisine = CUISINE_BUSINESS_TYPES.includes(draft.businessType);

  useEffect(() => {
    if (!isOpen) return;

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !isSaving) setIsOpen(false);
    };

    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isOpen, isSaving]);

  const openFlow = () => {
    if (!isAuthenticated) {
      onSignIn();
      return;
    }

    setDraft(
      preferences
        ? {
            businessType: preferences.businessType,
            cuisine: preferences.cuisine,
            averageDailyCovers: preferences.averageDailyCovers,
            interestedCategories: [...preferences.interestedCategories],
          }
        : EMPTY_PREFERENCES
    );
    setStep('business');
    setIsOpen(true);
  };

  const goForward = () => {
    if (step === 'business') {
      setStep(requiresCuisine ? 'cuisine' : 'details');
    } else if (step === 'cuisine') {
      setStep('details');
    }
  };

  const goBack = () => {
    if (step === 'details') {
      setStep(requiresCuisine ? 'cuisine' : 'business');
    } else if (step === 'cuisine') {
      setStep('business');
    }
  };

  const toggleCategory = (category: (typeof PERSONALIZATION_CATEGORIES)[number]) => {
    setDraft((current) => ({
      ...current,
      interestedCategories: current.interestedCategories.includes(category)
        ? current.interestedCategories.filter((item) => item !== category)
        : [...current.interestedCategories, category],
    }));
  };

  const savePreferences = async () => {
    try {
      await onSave({
        ...draft,
        cuisine: requiresCuisine ? draft.cuisine : undefined,
      });
      setIsOpen(false);
    } catch {
      // The parent surfaces the persistence error without discarding the user's draft.
    }
  };

  const stepNumber = step === 'business' ? 1 : requiresCuisine && step === 'cuisine' ? 2 : requiresCuisine ? 3 : 2;
  const stepCount = requiresCuisine ? 3 : 2;

  return (
    <>
      <section
        aria-labelledby="personalise-catalogue-heading"
        className="mb-8 overflow-hidden border border-[#183b2b]/20 bg-[#183b2b] text-[#f4f0e7] shadow-sm"
      >
        <div className="grid gap-6 p-5 sm:p-7 lg:grid-cols-[1fr_auto] lg:items-center">
          <div className="max-w-2xl">
            <div className="mb-2 flex items-center gap-2 text-[10px] font-mono font-bold uppercase tracking-[0.18em] text-[#c9dc74]">
              <Sparkles className="h-4 w-4" aria-hidden="true" />
              Optional intelligent catalogue
            </div>
            <h2 id="personalise-catalogue-heading" className="font-serif text-2xl font-bold sm:text-3xl">
              Personalise Your Catalogue
            </h2>
            <p className="mt-2 max-w-xl text-sm leading-relaxed text-[#e9e3d5]">
              Tell us about your kitchen and we will automatically bring the most relevant produce
              forward. Every product remains available and the standard catalogue always stays intact.
            </p>

            {preferences?.enabled && (
              <div className="mt-4 flex flex-wrap items-center gap-2 text-xs">
                <span className="bg-[#c9dc74] px-2.5 py-1 font-bold text-[#183b2b]">
                  Personalised
                </span>
                <span className="text-[#f4f0e7]">
                  {preferences.businessType}
                  {preferences.cuisine ? ` · ${preferences.cuisine}` : ''}
                </span>
              </div>
            )}

            {error && (
              <p className="mt-3 text-xs font-semibold text-[#ffd1bf]" role="alert">
                {error}
              </p>
            )}
          </div>

          <div className="flex flex-wrap gap-2 lg:justify-end">
            <button
              type="button"
              onClick={openFlow}
              disabled={isLoading}
              className="inline-flex min-h-11 items-center justify-center gap-2 bg-[#c9dc74] px-5 py-3 text-xs font-bold text-[#183b2b] transition-colors hover:bg-white disabled:cursor-wait disabled:opacity-70"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              ) : preferences?.enabled ? (
                <Settings2 className="h-4 w-4" aria-hidden="true" />
              ) : (
                <Sparkles className="h-4 w-4" aria-hidden="true" />
              )}
              {preferences?.enabled ? 'Edit preferences' : isAuthenticated ? 'Personalise catalogue' : 'Sign in to personalise'}
            </button>

            {preferences?.enabled && (
              <button
                type="button"
                onClick={onDisable}
                disabled={isSaving}
                className="min-h-11 border border-[#f4f0e7]/40 px-4 py-3 text-xs font-bold text-[#f4f0e7] transition-colors hover:bg-white/10 disabled:opacity-60"
              >
                Use standard order
              </button>
            )}
          </div>
        </div>
      </section>

      {isOpen && (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center bg-black/65 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="personalization-dialog-title"
        >
          <div className="max-h-[92vh] w-full max-w-2xl overflow-y-auto bg-[#f4f0e7] shadow-2xl">
            <div className="sticky top-0 z-10 flex items-start justify-between border-b border-[#183b2b]/15 bg-[#f4f0e7] px-5 py-4 sm:px-7">
              <div>
                <p className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#f48b4d]">
                  Step {stepNumber} of {stepCount}
                </p>
                <h3 id="personalization-dialog-title" className="mt-1 font-serif text-2xl font-bold text-[#183b2b]">
                  {step === 'business'
                    ? 'What kind of business are you?'
                    : step === 'cuisine'
                      ? 'What cuisine leads your menu?'
                      : 'A little more context'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                disabled={isSaving}
                className="p-2 text-[#55705c] transition-colors hover:bg-[#183b2b]/10 hover:text-[#183b2b]"
                aria-label="Close catalogue personalization"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-5 sm:p-7">
              {step === 'business' && (
                <fieldset>
                  <legend className="sr-only">Select your business type</legend>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    {BUSINESS_TYPES.map((businessType) => {
                      const selected = draft.businessType === businessType;
                      return (
                        <button
                          key={businessType}
                          type="button"
                          onClick={() =>
                            setDraft((current) => ({
                              ...current,
                              businessType,
                              cuisine: CUISINE_BUSINESS_TYPES.includes(businessType)
                                ? current.cuisine
                                : undefined,
                            }))
                          }
                          aria-pressed={selected}
                          className={`flex min-h-12 items-center justify-between border px-4 py-3 text-left text-sm font-semibold transition-colors ${
                            selected
                              ? 'border-[#183b2b] bg-[#183b2b] text-[#c9dc74]'
                              : 'border-[#183b2b]/20 bg-white text-[#183b2b] hover:border-[#183b2b]/60'
                          }`}
                        >
                          {businessType}
                          {selected && <Check className="h-4 w-4" aria-hidden="true" />}
                        </button>
                      );
                    })}
                  </div>
                </fieldset>
              )}

              {step === 'cuisine' && (
                <fieldset>
                  <legend className="mb-4 text-sm text-[#55705c]">
                    Select the closest match. You can update this whenever your menu changes.
                  </legend>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    {CUISINES.map((cuisine) => {
                      const selected = draft.cuisine === cuisine;
                      return (
                        <button
                          key={cuisine}
                          type="button"
                          onClick={() => setDraft((current) => ({ ...current, cuisine }))}
                          aria-pressed={selected}
                          className={`flex min-h-11 items-center justify-between border px-4 py-2.5 text-left text-sm font-semibold transition-colors ${
                            selected
                              ? 'border-[#183b2b] bg-[#183b2b] text-[#c9dc74]'
                              : 'border-[#183b2b]/20 bg-white text-[#183b2b] hover:border-[#183b2b]/60'
                          }`}
                        >
                          {cuisine}
                          {selected && <Check className="h-4 w-4" aria-hidden="true" />}
                        </button>
                      );
                    })}
                  </div>
                </fieldset>
              )}

              {step === 'details' && (
                <div className="space-y-7">
                  <div>
                    <label htmlFor="average-daily-covers" className="block text-sm font-bold text-[#183b2b]">
                      Average daily covers or orders
                      <span className="ml-2 font-normal text-[#79966e]">(optional)</span>
                    </label>
                    <input
                      id="average-daily-covers"
                      type="number"
                      min="1"
                      max="100000"
                      inputMode="numeric"
                      value={draft.averageDailyCovers ?? ''}
                      onChange={(event) =>
                        setDraft((current) => ({
                          ...current,
                          averageDailyCovers: event.target.value
                            ? Math.max(1, Number(event.target.value))
                            : undefined,
                        }))
                      }
                      placeholder="e.g. 120"
                      className="mt-2 w-full border border-[#183b2b]/25 bg-white px-4 py-3 text-sm text-[#183b2b] outline-none transition-colors focus:border-[#183b2b]"
                    />
                  </div>

                  <fieldset>
                    <legend className="text-sm font-bold text-[#183b2b]">
                      Interested categories
                      <span className="ml-2 font-normal text-[#79966e]">(optional)</span>
                    </legend>
                    <p className="mt-1 text-xs text-[#55705c]">
                      These categories move forward in your catalogue; nothing is hidden.
                    </p>
                    <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
                      {PERSONALIZATION_CATEGORIES.map((category) => {
                        const selected = draft.interestedCategories.includes(category);
                        return (
                          <button
                            key={category}
                            type="button"
                            onClick={() => toggleCategory(category)}
                            aria-pressed={selected}
                            className={`min-h-11 border px-3 py-2 text-xs font-bold transition-colors ${
                              selected
                                ? 'border-[#183b2b] bg-[#c9dc74] text-[#183b2b]'
                                : 'border-[#183b2b]/20 bg-white text-[#183b2b] hover:border-[#183b2b]/60'
                            }`}
                          >
                            {category}
                          </button>
                        );
                      })}
                    </div>
                  </fieldset>
                </div>
              )}
            </div>

            <div className="sticky bottom-0 flex items-center justify-between gap-3 border-t border-[#183b2b]/15 bg-[#f4f0e7] px-5 py-4 sm:px-7">
              {step !== 'business' ? (
                <button
                  type="button"
                  onClick={goBack}
                  disabled={isSaving}
                  className="inline-flex min-h-11 items-center gap-2 px-3 text-xs font-bold text-[#183b2b] hover:bg-[#183b2b]/10"
                >
                  <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                  Back
                </button>
              ) : (
                <span />
              )}

              {step === 'details' ? (
                <button
                  type="button"
                  onClick={savePreferences}
                  disabled={isSaving}
                  className="inline-flex min-h-11 items-center gap-2 bg-[#183b2b] px-5 py-3 text-xs font-bold text-[#c9dc74] transition-colors hover:bg-[#25543e] disabled:cursor-wait disabled:opacity-70"
                >
                  {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                  Save preferences
                </button>
              ) : (
                <button
                  type="button"
                  onClick={goForward}
                  disabled={step === 'cuisine' && !draft.cuisine}
                  className="inline-flex min-h-11 items-center gap-2 bg-[#183b2b] px-5 py-3 text-xs font-bold text-[#c9dc74] transition-colors hover:bg-[#25543e] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Continue
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
