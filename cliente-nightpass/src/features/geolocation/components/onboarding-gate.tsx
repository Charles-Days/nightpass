'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { User } from '@/core/types/api';
import { isSnoozed } from '../lib/snooze';
import { usePlatform } from '../hooks/use-platform';
import { useInstallPrompt } from '../hooks/use-install-prompt';
import { EnableLocationOnboarding } from './enable-location-onboarding';
import { InstallTutorial } from './install-tutorial';

interface OnboardingGateProps {
  user: User | null;
}

type Step = 'idle' | 'install' | 'location' | 'done';

const INSTALL_SEEN_KEY = 'np_install_tutorial_seen';

function isInstallSeen() {
  if (typeof window === 'undefined') return false;
  return window.localStorage.getItem(INSTALL_SEEN_KEY) === '1';
}

function markInstallSeen() {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(INSTALL_SEEN_KEY, '1');
}

export function OnboardingGate({ user }: OnboardingGateProps) {
  const router = useRouter();
  const platform = usePlatform();
  const { installed } = useInstallPrompt();
  const [mounted, setMounted] = useState(false);
  const [step, setStep] = useState<Step>('idle');

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    if (!user) {
      setStep('done');
      return;
    }
    if (user.role !== 'CUSTOMER') {
      setStep('done');
      return;
    }
    if (user.locationOnboardedAt) {
      setStep('done');
      return;
    }
    if (isSnoozed()) {
      setStep('done');
      return;
    }
    // Show install tutorial first if not installed and not seen yet.
    const alreadyInstalled = platform.standalone || installed;
    if (!alreadyInstalled && !isInstallSeen()) {
      setStep('install');
      return;
    }
    setStep('location');
  }, [mounted, user, platform.standalone, installed]);

  const handleInstallClose = (open: boolean) => {
    if (open) return;
    markInstallSeen();
    setStep('location');
  };

  // If the user actually installs the PWA while the tutorial is open,
  // auto-advance to the location onboarding step.
  useEffect(() => {
    if (step !== 'install') return;
    if (platform.standalone || installed) {
      markInstallSeen();
      setStep('location');
    }
  }, [step, platform.standalone, installed]);

  const handleLocationComplete = () => {
    setStep('done');
    router.refresh();
  };

  if (!mounted || step === 'idle' || step === 'done') return null;

  if (step === 'install') {
    return <InstallTutorial open onOpenChange={handleInstallClose} />;
  }

  return <EnableLocationOnboarding open onComplete={handleLocationComplete} />;
}
