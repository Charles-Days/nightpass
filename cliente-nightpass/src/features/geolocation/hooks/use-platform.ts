'use client';

import { useEffect, useState } from 'react';

export type OS = 'ios' | 'android' | 'other';
export type Browser = 'safari' | 'chrome' | 'firefox' | 'edge' | 'samsung' | 'other';

export interface PlatformInfo {
  os: OS;
  browser: Browser;
  standalone: boolean;
  isSafari: boolean;
  isInAppBrowser: boolean;
}

interface NavigatorStandalone extends Navigator {
  standalone?: boolean;
}

function detectPlatform(): PlatformInfo {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') {
    return {
      os: 'other',
      browser: 'other',
      standalone: false,
      isSafari: false,
      isInAppBrowser: false,
    };
  }

  const ua = navigator.userAgent || '';
  const nav = navigator as NavigatorStandalone;

  const isIPadOS =
    typeof navigator.maxTouchPoints === 'number' &&
    navigator.maxTouchPoints > 1 &&
    /MacIntel/.test(navigator.platform);

  const isIOS = /iPad|iPhone|iPod/.test(ua) || isIPadOS;
  const isAndroid = /Android/i.test(ua);
  const os: OS = isIOS ? 'ios' : isAndroid ? 'android' : 'other';

  const standalone =
    (typeof window.matchMedia === 'function' &&
      window.matchMedia('(display-mode: standalone)').matches) ||
    nav.standalone === true;

  const isSafari =
    /^((?!chrome|android|crios|fxios|edgios|edg).)*safari/i.test(ua) && isIOS;

  // Detectar browser explicito. Orden importa — Edge/Chrome contienen "Safari"
  // en su UA, asi que Edge se testea primero, despues Chrome, despues Safari.
  let browser: Browser = 'other';
  if (/EdgiOS|EdgA|Edg\//i.test(ua)) browser = 'edge';
  else if (/FxiOS|Firefox/i.test(ua)) browser = 'firefox';
  else if (/SamsungBrowser/i.test(ua)) browser = 'samsung';
  else if (/CriOS|Chrome/i.test(ua)) browser = 'chrome';
  else if (isSafari) browser = 'safari';

  // Heuristic for in-app browsers (Instagram, Facebook, Twitter, TikTok, WhatsApp, Line, etc.)
  const isInAppBrowser =
    /Instagram|FBAN|FBAV|FB_IAB|FBIOS|Twitter|Line\//i.test(ua) ||
    /; wv\)/i.test(ua) || // Android WebView
    /TikTok/i.test(ua);

  return { os, browser, standalone, isSafari, isInAppBrowser };
}

export function usePlatform(): PlatformInfo {
  const [info, setInfo] = useState<PlatformInfo>(() => detectPlatform());

  useEffect(() => {
    setInfo(detectPlatform());

    if (typeof window.matchMedia !== 'function') return;
    const mql = window.matchMedia('(display-mode: standalone)');
    const onChange = () => setInfo(detectPlatform());
    try {
      mql.addEventListener('change', onChange);
    } catch {
      mql.addListener?.(onChange);
    }
    return () => {
      try {
        mql.removeEventListener('change', onChange);
      } catch {
        mql.removeListener?.(onChange);
      }
    };
  }, []);

  return info;
}
