import Link from 'next/link';
import { SiteAnalyzer } from 'components/site-audit/analyzer';

export default function CampaignPage() {
  return (
    <main>
      <div className="mx-auto max-w-5xl px-4 pt-10 text-sm text-neutral-500">
        <Link href="/" className="hover:underline">
          ← Ana sayfaya dön
        </Link>
        <h1 className="mt-4 text-2xl font-bold text-neutral-900 dark:text-neutral-100 md:text-4xl">
          Ürünler için düşük bütçeli kampanya ve üyelik planı
        </h1>
        <p className="mt-3 max-w-3xl text-neutral-600 dark:text-neutral-300">
          Tarama sonrası 5 kanallık reklam/kampanya planı üretir: Google Ads, Merchant Center ve ek platformlara
          nasıl üye olup nasıl kurulum yapmanız gerektiğini listeler.
        </p>
      </div>
      <SiteAnalyzer mode="campaign" />
    </main>
  );
}
