'use client';

import { usePWAInstall } from '@/hooks/usePWAInstall';
import {
  Download, Monitor, Smartphone, Tablet, Chrome,
  CheckCircle2, Globe, WifiOff, HardDrive,
  Cpu,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export default function InstallPage() {
  const { install, isInstalled, installPrompt, systemInfo } = usePWAInstall();

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-8">
      <div>
        <div className="flex items-center gap-2">
          <Download className="w-6 h-6 text-brand-500" />
          <h1 className="text-2xl font-bold">Install App</h1>
        </div>
        <p className="text-[var(--text-secondary)] text-sm mt-1">
          Install AI Hub on your device for the best experience
        </p>
      </div>

      {/* System Detection */}
      <div className="bg-[var(--surface-1)] border border-[var(--border)] rounded-xl p-5">
        <h2 className="font-semibold mb-3 flex items-center gap-2">
          <Cpu className="w-4 h-4 text-brand-500" />
          Your System
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <SystemBadge icon={Monitor} label="OS" value={systemInfo.os} />
          <SystemBadge icon={Chrome} label="Browser" value={systemInfo.browser} />
          <SystemBadge
            icon={systemInfo.deviceType === 'mobile' ? Smartphone : systemInfo.deviceType === 'tablet' ? Tablet : Monitor}
            label="Device"
            value={systemInfo.deviceType}
          />
          <SystemBadge
            icon={isInstalled ? CheckCircle2 : Globe}
            label="Status"
            value={isInstalled ? 'Installed' : 'Not installed'}
            highlight={isInstalled}
          />
        </div>
      </div>

      {/* Install Options */}
      <div className="space-y-4">
        {/* PWA Install */}
        {isInstalled ? (
          <div className="bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-xl p-5 text-center">
            <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto mb-3" />
            <h2 className="text-lg font-bold text-green-700 dark:text-green-400">
              AI Hub is installed!
            </h2>
            <p className="text-sm text-green-600 dark:text-green-500 mt-1">
              You&apos;re running the app in standalone mode. It works offline too!
            </p>
          </div>
        ) : installPrompt ? (
          <div className="bg-brand-50 dark:bg-brand-950/20 border border-brand-200 dark:border-brand-800 rounded-xl p-5">
            <div className="text-center space-y-4">
              <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center">
                <Download className="w-8 h-8 text-white" />
              </div>
              <div>
                <h2 className="text-lg font-bold">Install as Desktop App</h2>
                <p className="text-sm text-[var(--text-secondary)] mt-1">
                  Get a native-like experience with its own window, icon, and offline support
                </p>
              </div>
              <button
                onClick={install}
                className="px-6 py-3 bg-brand-600 hover:bg-brand-700 text-white rounded-xl font-medium text-lg transition shadow-lg shadow-brand-500/20"
              >
                Install Now
              </button>
            </div>
          </div>
        ) : (
          <div className="bg-[var(--surface-1)] border border-[var(--border)] rounded-xl p-5">
            <h2 className="font-semibold mb-3">Install Instructions</h2>
            <InstallInstructions os={systemInfo.os} browser={systemInfo.browser} />
          </div>
        )}

        {/* Features */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <FeatureCard
            icon={Download}
            title="No App Store"
            desc="Install directly from your browser — no store approval needed"
          />
          <FeatureCard
            icon={WifiOff}
            title="Works Offline"
            desc="The app shell loads even without internet. Use local models offline."
          />
          <FeatureCard
            icon={HardDrive}
            title="Lightweight"
            desc="Under 5MB — much smaller than traditional apps"
          />
        </div>
      </div>
    </div>
  );
}

function SystemBadge({
  icon: Icon, label, value, highlight,
}: {
  icon: React.ElementType; label: string; value: string; highlight?: boolean;
}) {
  return (
    <div className="text-center">
      <Icon className={cn('w-5 h-5 mx-auto mb-1', highlight ? 'text-green-500' : 'text-[var(--text-muted)]')} />
      <p className="text-xs text-[var(--text-muted)]">{label}</p>
      <p className={cn('text-sm font-medium capitalize', highlight && 'text-green-600 dark:text-green-400')}>
        {value}
      </p>
    </div>
  );
}

function FeatureCard({ icon: Icon, title, desc }: { icon: React.ElementType; title: string; desc: string }) {
  return (
    <div className="bg-[var(--surface-1)] border border-[var(--border)] rounded-xl p-4 text-center">
      <Icon className="w-6 h-6 text-brand-500 mx-auto mb-2" />
      <h3 className="text-sm font-semibold">{title}</h3>
      <p className="text-xs text-[var(--text-muted)] mt-1">{desc}</p>
    </div>
  );
}

function InstallInstructions({ os, browser }: { os: string; browser: string }) {
  if (os === 'iOS') {
    return (
      <ol className="space-y-2 text-sm text-[var(--text-secondary)]">
        <li>1. Tap the <strong>Share</strong> button (square with arrow) in Safari</li>
        <li>2. Scroll down and tap <strong>&quot;Add to Home Screen&quot;</strong></li>
        <li>3. Tap <strong>&quot;Add&quot;</strong> in the top right</li>
        <li>4. AI Hub will appear as an app on your home screen!</li>
      </ol>
    );
  }

  if (browser === 'Chrome' || browser === 'Edge') {
    return (
      <ol className="space-y-2 text-sm text-[var(--text-secondary)]">
        <li>1. Click the <strong>install icon</strong> (⊕) in the address bar</li>
        <li>2. Or click the <strong>three dots menu (⋮)</strong> → <strong>&quot;Install AI Hub&quot;</strong></li>
        <li>3. The app will open in its own window with a desktop/dock icon</li>
      </ol>
    );
  }

  if (browser === 'Safari' && os === 'macOS') {
    return (
      <ol className="space-y-2 text-sm text-[var(--text-secondary)]">
        <li>1. Click <strong>File</strong> → <strong>&quot;Add to Dock&quot;</strong></li>
        <li>2. The app will appear in your Dock as a standalone app</li>
      </ol>
    );
  }

  return (
    <ol className="space-y-2 text-sm text-[var(--text-secondary)]">
      <li>1. Look for an <strong>install button</strong> in your browser&apos;s address bar or menu</li>
      <li>2. The app works best in <strong>Chrome, Edge, or Safari</strong></li>
      <li>3. Once installed, it runs in its own window like a native app</li>
    </ol>
  );
}
