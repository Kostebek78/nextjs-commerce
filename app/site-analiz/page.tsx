import Link from 'next/link';
import { SiteAnalyzer } from 'components/site-audit/analyzer';

export default function SiteAnalizPage() {
  return (
    <main>
      <div className="mx-auto max-w-5xl px-4 pt-10 text-sm text-neutral-500">
        <Link href="/" className="hover:underline">
          ← Ana sayfaya dön
        </Link>
        <h1 className="mt-4 text-2xl font-bold text-neutral-900 dark:text-neutral-100 md:text-4xl">
          SEO, Tasarım ve Satış Checklist Analizi
        </h1>
        <p className="mt-3 max-w-3xl text-neutral-600 dark:text-neutral-300">
          Siteyi tarayıp web tasarımcı, SEO uzmanı, dijital pazarlamacı, ürün/kategori yöneticisi ve yapay zeka
          uzmanı bakışıyla yapılacakları önceliklendirir.
        </p>
      </div>
      <SiteAnalyzer mode="checklist" />
    </main>
  );
}
