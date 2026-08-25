import Link from 'next/link';

export const metadata = {
  description:
    'Web sitesini tarayıp SEO, tasarım, pazarlama ve satış geliştirmeleri için önceliklendirilmiş aksiyon listesi üreten analiz uygulaması.',
  openGraph: {
    type: 'website'
  }
};

export default function HomePage() {
  return (
    <main className="mx-auto max-w-5xl px-4 py-16 text-neutral-900 dark:text-neutral-100">
      <p className="text-sm font-semibold uppercase tracking-widest text-blue-600">Growth Scanner</p>
      <h1 className="mt-3 text-3xl font-bold tracking-tight md:text-5xl">
        Web siteni tara, Google&apos;da öne çıkmak için net checklist al.
      </h1>
      <p className="mt-4 max-w-3xl text-sm text-neutral-600 dark:text-neutral-300 md:text-base">
        Site adresini gir; sistem web tasarım, SEO, dijital pazarlama, ürün/kategori yönetimi ve yapay
        zeka görünürlüğü perspektiflerinden analiz etsin. Sonuçta yüksek / orta / düşük öncelikli yapılacaklar
        listesi ve düşük bütçeli kampanya planı üret.
      </p>

      <div className="mt-8 grid gap-4 md:grid-cols-2">
        <Link
          href="/site-analiz"
          className="rounded-xl border border-neutral-200 p-6 transition hover:border-blue-500 dark:border-neutral-800"
        >
          <h2 className="text-xl font-semibold">SEO & Büyüme Checklist</h2>
          <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-300">
            Siteyi baştan sona analiz edip yüksek/orta/düşük önceliklendirilmiş geliştirme listesi üretir.
          </p>
        </Link>

        <Link
          href="/kampanya-plani"
          className="rounded-xl border border-neutral-200 p-6 transition hover:border-blue-500 dark:border-neutral-800"
        >
          <h2 className="text-xl font-semibold">Düşük Bütçeli Kampanya Planı</h2>
          <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-300">
            Google Ads, Merchant Center ve ek platform üyelikleri dahil en az maliyetli reklam önerilerini listeler.
          </p>
        </Link>
      </div>
    </main>
  );
}
