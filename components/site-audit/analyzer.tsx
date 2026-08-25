'use client';

import clsx from 'clsx';
import { useState } from 'react';
import type { SiteAuditResult } from 'lib/site-audit';

type Mode = 'checklist' | 'campaign';

export function SiteAnalyzer({ mode }: { mode: Mode }) {
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<SiteAuditResult | null>(null);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/site-audit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ websiteUrl })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Tarama tamamlanamadı.');
      }

      setResult(data);
    } catch (submissionError) {
      setResult(null);
      setError(submissionError instanceof Error ? submissionError.message : 'Bilinmeyen hata.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-12 text-neutral-900 dark:text-neutral-100">
      <form onSubmit={onSubmit} className="rounded-xl border border-neutral-200 p-5 dark:border-neutral-800">
        <label htmlFor="website" className="mb-2 block text-sm font-medium">
          Web sitesi adresi
        </label>
        <div className="flex flex-col gap-3 md:flex-row">
          <input
            id="website"
            type="text"
            required
            placeholder="https://ornek.com"
            value={websiteUrl}
            onChange={(event) => setWebsiteUrl(event.target.value)}
            className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm dark:border-neutral-700 dark:bg-black"
          />
          <button
            type="submit"
            disabled={loading}
            className="rounded-md bg-blue-600 px-5 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? 'Taranıyor...' : 'Siteyi Tara'}
          </button>
        </div>
      </form>

      {error ? <p className="mt-4 rounded-md bg-red-100 px-3 py-2 text-sm text-red-700">{error}</p> : null}

      {result ? (
        <section className="mt-6 space-y-4">
          <div className="rounded-xl border border-neutral-200 p-5 dark:border-neutral-800">
            <p className="text-xs uppercase tracking-wider text-neutral-500">Taranan adres</p>
            <p className="mt-1 text-sm font-medium">{result.scannedUrl}</p>
            <p className="mt-3 text-sm text-neutral-600 dark:text-neutral-300">{result.summary}</p>
          </div>

          {mode === 'checklist' ? (
            <ul className="space-y-3">
              {result.checklist.map((item) => (
                <li key={item.title} className="rounded-xl border border-neutral-200 p-4 dark:border-neutral-800">
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    <span
                      className={clsx(
                        'rounded-full px-2 py-1 text-xs font-bold uppercase',
                        item.priority === 'yüksek' && 'bg-red-100 text-red-700',
                        item.priority === 'orta' && 'bg-amber-100 text-amber-800',
                        item.priority === 'düşük' && 'bg-green-100 text-green-700'
                      )}
                    >
                      {item.priority}
                    </span>
                    <span className="text-xs text-neutral-500">{item.role}</span>
                  </div>
                  <h3 className="text-sm font-semibold">{item.title}</h3>
                  <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-300">{item.detail}</p>
                </li>
              ))}
            </ul>
          ) : (
            <ul className="space-y-3">
              {result.campaigns.map((campaign) => (
                <li
                  key={campaign.channel}
                  className="rounded-xl border border-neutral-200 p-4 text-sm dark:border-neutral-800"
                >
                  <h3 className="font-semibold">{campaign.channel}</h3>
                  <p className="mt-2 text-neutral-700 dark:text-neutral-200">
                    <strong>Neden:</strong> {campaign.why}
                  </p>
                  <p className="mt-1 text-neutral-700 dark:text-neutral-200">
                    <strong>En az bütçeyle aksiyon:</strong> {campaign.lowBudgetAction}
                  </p>
                  <p className="mt-1 text-neutral-700 dark:text-neutral-200">
                    <strong>Nasıl kurulur:</strong> {campaign.setup}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </section>
      ) : null}
    </div>
  );
}
