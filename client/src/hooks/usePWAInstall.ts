import { useState, useEffect, useCallback } from 'react';
import type { SystemInfo } from '@/types';

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export function usePWAInstall() {
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [systemInfo, setSystemInfo] = useState<SystemInfo>({
    os: 'unknown',
    browser: 'unknown',
    pwaInstallable: false,
    pwaInstalled: false,
    deviceType: 'desktop',
  });

  useEffect(() => {
    // Detect system info
    const ua = navigator.userAgent;
    let os = 'unknown';
    let browser = 'unknown';
    let deviceType: SystemInfo['deviceType'] = 'desktop';

    if (/Mac/i.test(ua)) os = 'macOS';
    else if (/Win/i.test(ua)) os = 'Windows';
    else if (/Linux/i.test(ua)) os = 'Linux';
    else if (/Android/i.test(ua)) { os = 'Android'; deviceType = 'mobile'; }
    else if (/iPhone|iPad|iPod/i.test(ua)) { os = 'iOS'; deviceType = /iPad/i.test(ua) ? 'tablet' : 'mobile'; }
    else if (/CrOS/i.test(ua)) os = 'ChromeOS';

    if (/Edg/i.test(ua)) browser = 'Edge';
    else if (/Chrome/i.test(ua)) browser = 'Chrome';
    else if (/Firefox/i.test(ua)) browser = 'Firefox';
    else if (/Safari/i.test(ua)) browser = 'Safari';

    // Check if already installed
    const mqStandalone = window.matchMedia('(display-mode: standalone)');
    const installed = mqStandalone.matches || (navigator as unknown as { standalone?: boolean }).standalone === true;

    setIsInstalled(installed);
    setSystemInfo({
      os,
      browser,
      pwaInstallable: false,
      pwaInstalled: installed,
      deviceType,
    });

    // Listen for install prompt
    const handler = (e: Event) => {
      e.preventDefault();
      setInstallPrompt(e as BeforeInstallPromptEvent);
      setSystemInfo((prev) => ({ ...prev, pwaInstallable: true }));
    };

    window.addEventListener('beforeinstallprompt', handler);

    // Listen for install success
    window.addEventListener('appinstalled', () => {
      setIsInstalled(true);
      setInstallPrompt(null);
      setSystemInfo((prev) => ({ ...prev, pwaInstalled: true, pwaInstallable: false }));
    });

    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const install = useCallback(async () => {
    if (!installPrompt) return false;
    await installPrompt.prompt();
    const { outcome } = await installPrompt.userChoice;
    if (outcome === 'accepted') {
      setIsInstalled(true);
      setInstallPrompt(null);
    }
    return outcome === 'accepted';
  }, [installPrompt]);

  return { install, isInstalled, installPrompt, systemInfo };
}
