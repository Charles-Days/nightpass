'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { User } from '@/core/types/api';
import { isSnoozed } from '../lib/snooze';
import { EnableLocationOnboarding } from './enable-location-onboarding';

interface OnboardingGateProps {
  user: User | null;
}

type Step = 'idle' | 'location' | 'done';

export function OnboardingGate({ user }: OnboardingGateProps) {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [step, setStep] = useState<Step>('idle');

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    if (!user || user.role !== 'CUSTOMER' || user.locationOnboardedAt || isSnoozed()) {
      setStep('done');
      return;
    }
    // El prompt de instalación (con video) lo maneja InstallAppPrompt; aquí
    // solo gestionamos el onboarding de ubicación.
    setStep('location');
  }, [mounted, user]);

  const handleLocationComplete = () => {
    setStep('done');
    router.refresh();
  };

  if (!mounted || step === 'idle' || step === 'done') return null;

  return <EnableLocationOnboarding open onComplete={handleLocationComplete} />;
}
