export type Priority = 'yüksek' | 'orta' | 'düşük';

export type ChecklistItem = {
  title: string;
  detail: string;
  priority: Priority;
  role: string;
};

export type CampaignItem = {
  channel: string;
  why: string;
  lowBudgetAction: string;
  setup: string;
};

export type SiteAuditResult = {
  scannedUrl: string;
  summary: string;
  checklist: ChecklistItem[];
  campaigns: CampaignItem[];
};

const PRIORITY_ORDER: Record<Priority, number> = {
  yüksek: 0,
  orta: 1,
  düşük: 2
};

const getMatchCount = (html: string, regex: RegExp) =>
  (html.match(regex) || []).length;

const has = (html: string, regex: RegExp) => regex.test(html);

export async function auditWebsite(rawUrl: string): Promise<SiteAuditResult> {
  const normalizedUrl = normalizeUrl(rawUrl);
  const response = await fetch(normalizedUrl, {
    headers: {
      'User-Agent':
        'Mozilla/5.0 (compatible; GrowthAuditBot/1.0; +https://example.com/bot)'
    },
    signal: AbortSignal.timeout(12000),
    cache: 'no-store'
  });

  if (!response.ok) {
    throw new Error(`Siteye erişilemedi (HTTP ${response.status}).`);
  }

  const html = await response.text();
  const checklist = buildChecklist(html, normalizedUrl);
  const campaigns = buildCampaignPlan(html, normalizedUrl);
  checklist.sort((a, b) => PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority]);

  const highCount = checklist.filter((item) => item.priority === 'yüksek').length;
  const mediumCount = checklist.filter((item) => item.priority === 'orta').length;

  return {
    scannedUrl: normalizedUrl,
    summary: `Tarama tamamlandı. ${highCount} yüksek ve ${mediumCount} orta öncelikli geliştirme bulundu.`,
    checklist,
    campaigns
  };
}

function buildChecklist(html: string, url: string): ChecklistItem[] {
  const items: ChecklistItem[] = [];
  const title = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]?.trim() || '';
  const metaDescription =
    html
      .match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']*)["']/i)?.[1]
      ?.trim() || '';

  if (!title || title.length < 30 || title.length > 60) {
    items.push({
      title: 'Title etiketi optimize edilmeli',
      detail:
        'Her sayfada 30-60 karakter aralığında, ürün/kategori odaklı ve ana anahtar kelimeyi içeren benzersiz title kullanılmalı.',
      priority: 'yüksek',
      role: 'SEO Uzmanı'
    });
  } else {
    items.push({
      title: 'Title etiketi uzunluğu uygun',
      detail: 'Title uzunluğu SEO için ideal aralıkta görünüyor.',
      priority: 'düşük',
      role: 'SEO Uzmanı'
    });
  }

  if (!metaDescription || metaDescription.length < 70) {
    items.push({
      title: 'Meta açıklama güçlendirilmeli',
      detail:
        'Meta description en az 140 karakter olacak şekilde fayda, fiyat avantajı ve çağrı ifadeleri ile güncellenmeli.',
      priority: 'orta',
      role: 'SEO + Pazarlama'
    });
  }

  const h1Count = getMatchCount(html, /<h1[^>]*>/gi);
  if (h1Count !== 1) {
    items.push({
      title: 'H1 yapısı düzenlenmeli',
      detail: `Sayfada ${h1Count} adet H1 bulundu. Her URL'de yalnızca 1 adet, ana anahtar kelimeyi taşıyan H1 olmalı.`,
      priority: 'yüksek',
      role: 'Web Tasarımcı + SEO Uzmanı'
    });
  }

  const totalImages = getMatchCount(html, /<img\b[^>]*>/gi);
  const imagesWithoutAlt = getMatchCount(html, /<img\b(?![^>]*\balt=)[^>]*>/gi);
  if (totalImages > 0 && imagesWithoutAlt / totalImages > 0.2) {
    items.push({
      title: 'Görsellerde alt metin eksik',
      detail: `${totalImages} görselin ${imagesWithoutAlt} adedinde alt metin yok. Ürün adı + kategori + niyet odaklı alt etiketler eklenmeli.`,
      priority: 'orta',
      role: 'SEO Uzmanı + Kategori Uzmanı'
    });
  }

  if (!has(html, /rel=["']canonical["']/i)) {
    items.push({
      title: 'Canonical etiketi eklenmeli',
      detail:
        'Kopya içerik riskini azaltmak için tüm ürün, kategori ve filtrelenmiş URLlerde canonical URL tanımlanmalı.',
      priority: 'yüksek',
      role: 'SEO Uzmanı'
    });
  }

  if (!has(html, /application\/ld\+json/i)) {
    items.push({
      title: 'Yapısal veri (Schema) yok',
      detail:
        'Product, Breadcrumb, Organization ve FAQ schema işaretlemeleri eklenerek Google sonuçlarında daha görünür olunmalı.',
      priority: 'yüksek',
      role: 'SEO + Yapay Zeka Uzmanı'
    });
  }

  if (has(html, /noindex/i)) {
    items.push({
      title: 'Noindex sinyali tespit edildi',
      detail:
        'Sayfanın indekslenmesini engelleyen noindex etiketi var. Üretim ortamı için kaldırılmalı veya doğru sayfalara sınırlandırılmalı.',
      priority: 'yüksek',
      role: 'Teknik SEO'
    });
  }

  const hasAnalytics = has(html, /gtag\(|googletagmanager\.com|analytics/i);
  if (!hasAnalytics) {
    items.push({
      title: 'Analytics kurulumu eksik olabilir',
      detail:
        'Google Analytics 4 ve Search Console entegrasyonu görünmüyor. Dönüşüm ve organik performans takibi için kurulmalı.',
      priority: 'orta',
      role: 'Dijital Pazarlama Uzmanı'
    });
  }

  const hasCampaignTracking = has(html, /utm_|meta pixel|facebook\.com\/tr|tiktok/i);
  if (!hasCampaignTracking) {
    items.push({
      title: 'Kampanya izleme altyapısı zayıf',
      detail:
        'UTM standardı, reklam pikseli ve dönüşüm API setupları güçlendirilerek düşük bütçeyle daha iyi optimizasyon yapılmalı.',
      priority: 'orta',
      role: 'Dijital Pazarlama ve Satış'
    });
  }

  if (!has(html, /yorum|değerlendirme|rating|review/i)) {
    items.push({
      title: 'Sosyal kanıt alanı güçlendirilmeli',
      detail:
        'Ürün sayfalarında puan/yorum ve kullanıcı deneyimi blokları eklemek dönüşüm oranını artırır.',
      priority: 'orta',
      role: 'Ürün Uzmanı + Pazarlama'
    });
  }

  if (!has(html, /sorulan sorular|faq/i)) {
    items.push({
      title: 'FAQ içeriği eksik',
      detail:
        'Kategori ve ürün sayfalarına kullanıcı niyetine göre SSS bölümü ekleyerek hem AI sonuçlarında hem organikte görünürlük artırılmalı.',
      priority: 'düşük',
      role: 'Yapay Zeka Uzmanı + SEO'
    });
  }

  if (html.length > 1_500_000) {
    items.push({
      title: 'Sayfa boyutu yüksek',
      detail:
        'HTML boyutu çok büyük. Core Web Vitals için JS/CSS azaltımı, görsel sıkıştırma ve lazy loading optimizasyonu önerilir.',
      priority: 'orta',
      role: 'Web Tasarımcı + Performans Uzmanı'
    });
  }

  items.push({
    title: 'Kategori ve ürün hiyerarşisini netleştir',
    detail: `URL yapısı (${new URL(url).hostname}) ürün > alt kategori > ana kategori mantığında sadeleştirilmeli; filtre URLleri indeks politikasına göre yönetilmeli.`,
    priority: 'orta',
    role: 'Kategori Uzmanı'
  });

  return items;
}

function buildCampaignPlan(html: string, url: string): CampaignItem[] {
  const domain = new URL(url).hostname;
  const hasMerchantCenterSignals = has(html, /product|price|availability|sku/i);

  return [
    {
      channel: 'Google Merchant Center + Ücretsiz Ürün Listelemeleri',
      why: 'E-ticaret ürünlerini Google Alışveriş ve organik ürün kartlarında göstermek için en hızlı yoldur.',
      lowBudgetAction:
        'İlk etapta en çok satan 20 ürün için optimize feed hazırlayın, başlıkları "Marka + Ürün + Ana Özellik" formatında düzenleyin.',
      setup: `merchant.google.com üzerinden hesap açın, ${domain} alan adını doğrulayın ve günlük feed güncellemesi yapın.`
    },
    {
      channel: 'Google Ads - Arama Ağı (Marka + Yüksek Niyet Kelimeler)',
      why: 'Düşük bütçede en yüksek dönüşüm niyetine sahip kullanıcıları yakalar.',
      lowBudgetAction:
        'Önce marka adı + 10 satın alma odaklı long-tail kelimeyle tam eşleme kampanyası açın, günlük bütçeyi küçük tutup dönüşüm başına maliyet izleyin.',
      setup:
        'ads.google.com hesabında dönüşüm izleme (satın alma, sepete ekleme) kurup negatif anahtar kelime listesi ekleyin.'
    },
    {
      channel: 'Meta Reklamları (Instagram/Facebook Yeniden Pazarlama)',
      why: 'Siteyi ziyaret eden ama satın almayan kullanıcıyı düşük maliyetle geri kazanır.',
      lowBudgetAction:
        'Son 30 gün ziyaretçi kitlesine dinamik ürün reklamı yayınlayın; ilk kampanyayı sadece en çok marjlı ürünlerle başlatın.',
      setup:
        'business.facebook.com üzerinden Pixel + Conversions API kurun, katalogu bağlayın ve remarketing kitlesi oluşturun.'
    },
    {
      channel: 'Google Search Console + Bing Webmaster + Yandex Webmaster',
      why: 'Arama motorlarında teknik görünürlüğü artırır ve indeks sorunlarını erken tespit eder.',
      lowBudgetAction:
        'Sitemap gönderin, düşük performanslı sorguları çıkarın, ilk 15 sayfada title/description revizyonu yapın.',
      setup:
        'search.google.com/search-console, bing.com/webmasters ve webmaster.yandex.com üyeliklerini tamamlayın.'
    },
    {
      channel: 'AI Görünürlük İçeriği (SSS + Karşılaştırma + Rehber)',
      why: 'AI tabanlı aramalarda görünmek için içerik otoritesi ve yapılandırılmış veri gerekir.',
      lowBudgetAction:
        'Haftada 1 rehber içerik + 3 ürün karşılaştırması yayınlayın; her içeriğe FAQ schema ve net satın alma CTA ekleyin.',
      setup:
        hasMerchantCenterSignals
          ? 'Mevcut ürün veri yapısını kullanarak kategori bazlı içerik takvimi oluşturun ve blog/yardım merkeziyle bağlayın.'
          : 'Önce temel ürün veri modeli (isim, fiyat, stok, özellik) standartlaştırın; ardından içerik planına geçin.'
    }
  ];
}

function normalizeUrl(rawUrl: string) {
  const trimmed = rawUrl.trim();
  if (!trimmed) {
    throw new Error('Lütfen geçerli bir web sitesi adresi girin.');
  }

  const withProtocol = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;

  try {
    return new URL(withProtocol).toString();
  } catch {
    throw new Error('URL formatı geçerli değil. Örn: https://ornek.com');
  }
}
