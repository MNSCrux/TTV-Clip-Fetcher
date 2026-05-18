'use client';

import { useEffect, useState } from 'react';
import { LoadingIndicator } from '@/components/loading-indicator';

interface SettingsData {
  configured: boolean;
  authStatus: string;
  authError: string | null;
  clientIdSet: boolean;
  clientSecretSet: boolean;
  settings: {
    DEFAULT_CLIP_PROVIDER: string;
  };
  providers: Array<{
    name: string;
    displayName: string;
    enabled: boolean;
  }>;
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<SettingsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const res = await fetch('/api/settings');
        const data = await res.json();
        setSettings(data);
      } catch (error) {
        console.error('Error fetching settings:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchSettings();
  }, []);

  if (loading) {
    return (
      <div className="py-8">
        <LoadingIndicator label="Loading settings" />
      </div>
    );
  }

  if (!settings) {
    return <div>Error loading settings</div>;
  }

  const updateSettings = async (next: Partial<SettingsData['settings']>) => {
    setSaving(true);
    try {
      const res = await fetch('/api/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...settings.settings, ...next }),
      });
      const data = await res.json();
      setSettings({ ...settings, settings: data.settings });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <h1 className="text-4xl font-bold mb-6">Settings</h1>

      <div className="max-w-2xl">
        <div className="card mb-6">
          <h2 className="text-2xl font-bold mb-4">Clip Provider</h2>
          <div className="space-y-4">
            <div>
              <label className="label">Provider</label>
              <select
                className="input"
                value={settings.settings.DEFAULT_CLIP_PROVIDER}
                disabled={saving}
                onChange={(e) =>
                  updateSettings({ DEFAULT_CLIP_PROVIDER: e.target.value })
                }
              >
                {settings.providers.map((provider) => (
                  <option key={provider.name} value={provider.name} disabled={!provider.enabled}>
                    {provider.displayName}
                    {!provider.enabled ? ' (disabled)' : ''}
                  </option>
                ))}
              </select>
            </div>

          </div>
        </div>

        <div className="card mb-6">
          <h2 className="text-2xl font-bold mb-4">Twitch API Configuration</h2>

          <div className="space-y-4">
            <div>
              <p className="text-slate-300 mb-2">Status</p>
              <div className="flex items-center gap-2">
                <div
                  className={`w-3 h-3 rounded-full ${
                    settings.configured && settings.authStatus === 'authenticated'
                      ? 'bg-green-500'
                      : 'bg-red-500'
                  }`}
                />
                <span>
                  {settings.configured && settings.authStatus === 'authenticated'
                    ? '✓ Configured and authenticated'
                    : settings.configured
                      ? '⚠ Configured but authentication failed'
                      : '✗ Not configured'}
                </span>
              </div>
              {settings.authError && (
                <p className="text-red-400 text-sm mt-2">{settings.authError}</p>
              )}
            </div>

            <div>
              <p className="text-slate-300 mb-2">Environment Variables</p>
              <div className="space-y-2 text-sm font-mono">
                <div className="flex justify-between bg-slate-700 p-2 rounded">
                  <span>TWITCH_CLIENT_ID</span>
                  <span>
                    {settings.clientIdSet ? (
                      <span className="text-green-400">✓ Set</span>
                    ) : (
                      <span className="text-red-400">✗ Not set</span>
                    )}
                  </span>
                </div>
                <div className="flex justify-between bg-slate-700 p-2 rounded">
                  <span>TWITCH_CLIENT_SECRET</span>
                  <span>
                    {settings.clientSecretSet ? (
                      <span className="text-green-400">✓ Set</span>
                    ) : (
                      <span className="text-red-400">✗ Not set</span>
                    )}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="card mb-6">
          <h2 className="text-2xl font-bold mb-4">Setup Instructions</h2>

          <ol className="space-y-4 text-sm">
            <li className="flex">
              <span className="font-bold text-yellow-400 mr-4 flex-shrink-0">1.</span>
              <span>
                Create a Twitch Application at{' '}
                <a
                  href="https://dev.twitch.tv/console/apps"
                  target="_blank"
                  rel="noreferrer"
                  className="text-yellow-400 hover:underline"
                >
                  dev.twitch.tv/console/apps
                </a>
              </span>
            </li>

            <li className="flex">
              <span className="font-bold text-yellow-400 mr-4 flex-shrink-0">2.</span>
              <span>
                Copy Client ID and Client Secret into local environment
              </span>
            </li>

            <li className="flex">
              <span className="font-bold text-yellow-400 mr-4 flex-shrink-0">3.</span>
              <span>
                Open <code className="bg-slate-700 px-2 py-1 rounded">.env.local</code> in the
                project root and paste your credentials:
              </span>
            </li>

            <li className="flex ml-8">
              <code className="bg-slate-700 p-3 rounded text-xs w-full">
                TWITCH_CLIENT_ID=your_client_id
                <br />
                TWITCH_CLIENT_SECRET=your_client_secret
              </code>
            </li>

            <li className="flex">
              <span className="font-bold text-yellow-400 mr-4 flex-shrink-0">4.</span>
              <span>Restart the development server for changes to take effect</span>
            </li>
          </ol>
        </div>

        <div className="card">
          <h2 className="text-2xl font-bold mb-4">Workflow</h2>

          <ol className="space-y-3 text-sm">
            <li className="flex">
              <span className="font-bold text-yellow-400 mr-4 flex-shrink-0">1.</span>
              <span>
                Import your CSV file on the{' '}
                <a href="/streamers" className="text-yellow-400 hover:underline">
                  Streamers
                </a>{' '}
                page
              </span>
            </li>

            <li className="flex">
              <span className="font-bold text-yellow-400 mr-4 flex-shrink-0">2.</span>
              <span>Resolve Twitch IDs for unresolved streamers</span>
            </li>

            <li className="flex">
              <span className="font-bold text-yellow-400 mr-4 flex-shrink-0">3.</span>
              <span>
                Go to{' '}
                <a href="/clips" className="text-yellow-400 hover:underline">
                  Clips
                </a>{' '}
                and fetch clips
              </span>
            </li>

            <li className="flex">
              <span className="font-bold text-yellow-400 mr-4 flex-shrink-0">4.</span>
              <span>Review clips, select links, export TXT list</span>
            </li>

          </ol>
        </div>
      </div>
    </div>
  );
}
