/**
 * Build the four service pages from Joe's design comps.
 *
 * Joe supplied complete full-page mockups and asked for the pages to *be* those
 * designs, full size — not artwork hidden behind a scrim. So each comp is
 * sliced into bands (scripts/slice-comps.py) and stacked here at full width,
 * with live HTML dropped in wherever the page has to actually do something:
 * sticky nav, real CTA buttons, video lightboxes, an FAQ accordion, real footer.
 *
 * Headings stay crawlable via per-band alt text, a visually-hidden H1, the real
 * FAQ copy, and JSON-LD — so the SEO these pages exist for still lands.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const contentDir = path.join(root, 'content', 'services');
const config = JSON.parse(fs.readFileSync(path.join(root, 'site-config.json'), 'utf8'));
const comps = JSON.parse(fs.readFileSync(path.join(root, 'content', 'comps.build.json'), 'utf8'));
const compsSource = JSON.parse(fs.readFileSync(path.join(root, 'content', 'comps.json'), 'utf8'));

// GPT-enhanced full comps (nav/FAQ cropped). Prefer these over sliced bands —
// slice seams no longer match after generative enhancement.
const ENHANCED_CROPS = {
  'superhuman-protocol-long-island': { top: 0.0, bottom: 0.10 },
  'whole-body-cryotherapy-long-island': { top: 0.055, bottom: 0.12 },
  'hyperbaric-oxygen-therapy-long-island': { top: 0.055, bottom: 0.26 },
  'red-light-therapy-long-island': { top: 0.055, bottom: 0.30 },
};

const serviceOrder = [
  'superhuman-protocol-long-island',
  'whole-body-cryotherapy-long-island',
  'hyperbaric-oxygen-therapy-long-island',
  'red-light-therapy-long-island',
];
const services = fs.readdirSync(contentDir)
  .filter(n => n.endsWith('.json'))
  .map(n => JSON.parse(fs.readFileSync(path.join(contentDir, n), 'utf8')))
  .sort((a, b) => serviceOrder.indexOf(a.slug) - serviceOrder.indexOf(b.slug));

const medWaveUrl = 'https://apexperformance.medwaveproviders.com/';

const e = v => String(v ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;')
  .replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
const stripTags = v => String(v ?? '').replace(/<[^>]+>/g, '');
const json = v => JSON.stringify(v).replace(/</g, '\\u003c');
const telHref = v => String(v).replace(/\D/g, '');
const pathParts = v => v.split('/').filter(Boolean);
const bookingUrl = (slug) => {
  const per = config.serviceBookingUrls?.[slug];
  if (per && String(per).trim()) return String(per).trim();
  if (config.defaultBookingUrl && String(config.defaultBookingUrl).trim()) {
    return String(config.defaultBookingUrl).trim();
  }
  return '';
};
const bookHrefAttrs = (url) => {
  if (!url) return 'href="#contact"';
  if (/^https?:\/\//i.test(url)) return `href="${e(url)}" target="_blank" rel="noopener"`;
  return `href="${e(url)}"`;
};

/* ---------------------------------------------------------------- chrome -- */

function nav(active) {
  const book = bookingUrl(active);
  const links = services.map((s, i) =>
    `<a href="${e(s.path)}"${s.slug === active ? ' aria-current="page"' : ''}>` +
    `<span class="drop-num">0${i + 1}</span><span><strong>${e(s.navLabel)}</strong>` +
    `<small>${s.path.startsWith('/protocols/') ? 'Protocol' : 'Recovery'} · Bohemia</small></span></a>`
  ).join('') +
    `<a href="${medWaveUrl}" target="_blank" rel="noopener"><span class="drop-num">05</span>` +
    `<span><strong>MedWave + HyperVibe ↗</strong><small>External provider</small></span></a>`;

  const mobile = services.map(s => `<a href="${e(s.path)}">${e(s.navLabel)}</a>`).join('') +
    `<a href="${medWaveUrl}" target="_blank" rel="noopener">MedWave + HyperVibe ↗</a>`;

  return `<div class="site-strip">Apex Performance &amp; Recovery · Bohemia, Long Island&nbsp;&nbsp;·&nbsp;&nbsp;<a href="https://kickfit.club/" target="_blank" rel="noopener">Visit Kickfit ↗</a></div>
<nav class="site-nav" aria-label="Primary"><div class="nav-inner">
<a class="site-logo" href="/" aria-label="Apex Performance &amp; Recovery home"><picture><source type="image/webp" srcset="/assets/logo_lockup-240.webp 1x, /assets/logo_lockup-480.webp 2x"><img src="/assets/logo_lockup-240.png" width="200" height="40" alt="Apex Performance &amp; Recovery"></picture></a>
<div class="desktop-links"><a href="/">Home</a><div class="nav-drop"><button type="button" aria-haspopup="true" aria-expanded="false">Protocols</button><div class="drop-menu">${links}</div></div><a href="/#equipment">Technology</a><a href="/blog">Blog</a></div>
<div class="nav-contact"><a href="tel:+1${telHref(config.landline)}">Call ${e(config.landline)}</a><a class="nav-cta" ${bookHrefAttrs(book)}>Book Now</a></div>
<button class="menu-toggle" type="button" data-menu-toggle aria-label="Open menu" aria-expanded="false" aria-controls="svc-menu"><span></span></button>
</div></nav>
<div class="mobile-menu" id="svc-menu" data-mobile-menu aria-hidden="true"><a href="/">Home</a><span class="mobile-label">Protocols &amp; Recovery</span>${mobile}<span class="mobile-label">More</span><a href="/blog">Blog</a><a ${bookHrefAttrs(book)}>Book Online</a><a href="#contact">Contact Apex</a></div>`;
}

function footer(data) {
  const book = bookingUrl(data.slug);
  const bookBtn = book
    ? `<a class="btn btn-red" ${bookHrefAttrs(book)}>Book Online</a>`
    : '';
  return `<footer class="site-footer" id="contact"><div class="footer-inner">
<div class="footer-cta"><h2>${e(data.ctaHeading)}</h2><p>${e(data.ctaText)}</p>
<div class="footer-actions">${bookBtn}<a class="btn btn-ghost" href="tel:+1${telHref(config.landline)}">Call ${e(config.landline)}</a><a class="btn btn-ghost" href="mailto:${e(config.email)}">Email Apex</a></div></div>
<div class="footer-cols">
<div><span>Protocols</span><a href="/protocols/superhuman-protocol-long-island">Superhuman Protocol</a><a href="/recovery/whole-body-cryotherapy-long-island">Whole-Body Cryotherapy</a><a href="/recovery/hyperbaric-oxygen-therapy-long-island">Hyperbaric Oxygen</a><a href="/recovery/red-light-therapy-long-island">Red Light Therapy</a><a href="${medWaveUrl}" target="_blank" rel="noopener">MedWave + HyperVibe ↗</a></div>
<div><span>Contact</span><a href="tel:+1${telHref(config.landline)}">${e(config.landline)}</a><a href="tel:+1${telHref(config.cell)}">${e(config.cell)}</a><a href="mailto:${e(config.email)}">${e(config.email)}</a><a href="https://maps.google.com/?q=${encodeURIComponent(config.address)}" target="_blank" rel="noopener">${e(config.address)}</a></div>
<div><span>More</span><a href="/">Home</a><a href="/blog">Blog</a><a href="https://kickfit.club/" target="_blank" rel="noopener">Kickfit ↗</a></div>
</div>
<div class="footer-base"><a class="footer-logo" href="/"><picture><source type="image/webp" srcset="/assets/logo_lockup-240.webp 1x, /assets/logo_lockup-480.webp 2x"><img src="/assets/logo_lockup-240.png" width="200" height="40" alt="Apex Performance &amp; Recovery" loading="lazy"></picture></a>
<div class="footer-legal">© <span data-year>2026</span> Apex Performance &amp; Recovery · ${e(config.address)} · Wellness services are not intended to diagnose, treat, cure, or prevent disease.</div></div>
</div></footer>`;
}

/* ----------------------------------------------------------------- bands -- */

// page-percentage -> percentage within this band
const rel = (band, pagePct) => ((pagePct - band.from) / (band.to - band.from)) * 100;
const relSize = (band, pageSize) => (pageSize / (band.to - band.from)) * 100;

function overlay(band, o) {
  const style = `left:${o.x}%;top:${rel(band, o.y).toFixed(3)}%;height:${relSize(band, o.h).toFixed(3)}%`;

  if (o.kind === 'phone') {
    return `<a class="ov ov-phone" style="${style}" href="tel:+1${telHref(config.landline)}">Or call ${e(config.landline)}</a>`;
  }
  if (o.kind === 'link') {
    const ext = o.external ? ' target="_blank" rel="noopener"' : '';
    return `<a class="ov ov-link" style="${style}" href="${e(o.href)}"${ext}>${e(o.label)} ↗</a>`;
  }
  const ext = /^https?:/.test(o.href) ? ' target="_blank" rel="noopener"' : '';
  return `<a class="ov ov-cta ov-${e(o.variant || 'red')}" style="${style}" href="${e(o.href)}"${ext}>${e(o.label)}</a>`;
}

function videoPosterBase(v) {
  if (v.poster) return v.poster.replace(/\.(jpe?g|png|webp)$/i, '');
  if (v.youtube) {
    const safe = String(v.youtube).replace(/[^a-zA-Z0-9_-]/g, '_');
    return `/assets/video-thumbs/yt-${safe}`;
  }
  if (v.local) {
    return `/assets/video-thumbs/${path.basename(v.local, path.extname(v.local))}`;
  }
  return '';
}

function videoInset(band, v) {
  const style = `left:${v.x}%;top:${rel(band, v.y).toFixed(3)}%;width:${v.w}%;height:${relSize(band, v.h).toFixed(3)}%`;
  const src = v.youtube
    ? `https://www.youtube-nocookie.com/embed/${encodeURIComponent(v.youtube)}?autoplay=1&rel=0`
    : v.local;
  const posterBase = videoPosterBase(v);
  const thumb = posterBase
    ? `<picture class="ov-play-thumb"><source type="image/webp" srcset="${e(posterBase)}.webp"><img src="${e(posterBase)}.jpg" alt="" loading="lazy" decoding="async"></picture>`
    : '';
  const posterAttr = posterBase ? ` data-video-poster="${e(posterBase)}.jpg"` : '';
  return `<button class="ov ov-play" style="${style}" type="button" data-video="${e(src)}" data-video-kind="${v.youtube ? 'youtube' : 'file'}" data-video-title="${e(v.title)}"${posterAttr} aria-label="Play video: ${e(v.title)}">${thumb}<span class="ov-play-icon" aria-hidden="true"></span></button>`;
}

/** Remap page-% coords into a cropped full-page image's coordinate space. */
function mapCroppedY(pageY, top, bottom) {
  const span = 1 - top - bottom;
  if (span <= 0) return null;
  const t = pageY / 100;
  if (t < top - 0.005 || t > 1 - bottom + 0.005) return null;
  return ((t - top) / span) * 100;
}

function enhancedFullBand(data) {
  const crop = ENHANCED_CROPS[data.slug];
  if (!crop) return null;
  const png = path.join(root, 'assets', 'comp-enhanced-clean', `${data.slug}.png`);
  const jpg = path.join(root, 'assets', 'comp-enhanced-clean', `${data.slug}.jpg`);
  if (!fs.existsSync(png) && !fs.existsSync(jpg)) return null;

  // Read natural size from jpg (always written) via compsSource aspect + file presence
  // We store dimensions next to assets via a tiny sidecar written by the crop script if present.
  let w = 1152, h = 1800;
  const metaPath = path.join(root, 'assets', 'comp-enhanced-clean', `${data.slug}.json`);
  if (fs.existsSync(metaPath)) {
    const meta = JSON.parse(fs.readFileSync(metaPath, 'utf8'));
    w = meta.w; h = meta.h;
  }

  const srcSpec = compsSource[data.slug];
  const videos = [];
  // Remap original video frames into the cropped full-page image and show real
  // poster thumbnails (YouTube / local) inside the frame + play icon on top.
  // CTAs stay in sticky nav / book strip / footer — old CTA % no longer match.
  for (const band of (srcSpec?.bands || [])) {
    if (!band.videoInset) continue;
    const v = band.videoInset;
    const y = mapCroppedY(v.y, crop.top, crop.bottom);
    const yh = mapCroppedY(v.y + v.h, crop.top, crop.bottom);
    if (y == null || yh == null) continue;
    // Keep full frame size so the thumbnail fills the video slot, not a tiny pip
    const h = Math.max(4.5, yh - y);
    const w = Math.max(v.w, 18);
    const x = Math.min(Math.max(0, v.x), 100 - w);
    videos.push({ ...v, x, y, w, h });
  }

  const fullBand = { from: 0, to: 100, w, h };
  const vids = videos.map(v => videoInset(fullBand, v)).join('');
  const ovs = '';
  const base = `/assets/comp-enhanced-clean/${data.slug}`;
  const hasPng = fs.existsSync(png);

  const anchor = data.slug === 'hyperbaric-oxygen-therapy-long-island'
    ? ' id="dry-dive-training"'
    : '';
  return `<section class="cband cband-full"${anchor} style="aspect-ratio:${w} / ${h}">
<picture>
${hasPng ? `<source type="image/png" srcset="${base}.png">` : ''}
<img src="${base}.jpg" width="${w}" height="${h}" alt="${e(stripTags(data.h1))}" fetchpriority="high" decoding="async">
</picture>
${vids}${ovs}
</section>`;
}

function artBand(band, data) {
  const alt = band.alt || `${stripTags(data.h1)} — ${String(band.id).replace(/-/g, ' ')}`;
  const id = band.anchor ? ` id="${e(band.anchor)}"` : '';
  const fx = band.effect ? `<i class="fx fx-${e(band.effect)}" aria-hidden="true"></i>` : '';
  const ovs = (band.overlays || []).map(o => overlay(band, o)).join('');
  const vid = band.videoInset ? videoInset(band, band.videoInset) : '';

  return `<section class="cband"${id} style="aspect-ratio:${band.w} / ${band.h}">
<picture><source type="image/webp" srcset="${band.src}.webp 1x, ${band.src}@2x.webp 2x"><img src="${band.src}.jpg" srcset="${band.src}.jpg 1x, ${band.src}@2x.jpg 2x" width="${band.w}" height="${band.h}" alt="${e(alt)}"${band.priority ? ' fetchpriority="high"' : ' loading="lazy"'} decoding="async"></picture>
${fx}${vid}${ovs}</section>`;
}

function faqBand(data) {
  const items = data.faqs.map((f, i) => `<div class="faq-item">
<button class="faq-q" type="button" aria-expanded="${i === 0 ? 'true' : 'false'}"><span>${e(f.question)}</span><i aria-hidden="true"></i></button>
<div class="faq-a"><div><p>${e(f.answer)}</p></div></div></div>`).join('');
  return `<section class="cband cband-faq" id="faq"><div class="faq-wrap"><h2 class="faq-title">Frequently Asked Questions</h2><div class="faq-list">${items}</div></div></section>`;
}

function embedBand(band) {
  const id = band.anchor || band.id ? ` id="${e(band.anchor || band.id)}"` : '';
  return `<section class="cband cband-embed"${id}>
<div class="embed-wrap">
<span class="embed-kicker">${e(band.kicker || 'Partner portal')}</span>
<h2 class="embed-heading">${e(band.heading || 'Open the live portal')}</h2>
<p class="embed-copy">${e(band.copy || '')}</p>
<div class="embed-frame">
<iframe src="${e(band.src)}" title="${e(band.title || 'External portal')}" loading="lazy" referrerpolicy="no-referrer-when-downgrade" allow="fullscreen"></iframe>
</div>
<div class="embed-actions">
<a class="btn btn-red" href="${e(band.src)}" target="_blank" rel="noopener">Open full portal ↗</a>
<a class="btn btn-ghost" href="#contact">Talk to Apex instead</a>
</div>
</div>
</section>`;
}

/* ---------------------------------------------------------------- schema -- */

function schema(data) {
  return json({
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'HealthAndBeautyBusiness',
        '@id': 'https://www.apex-performance.life/#business',
        name: config.businessName,
        url: 'https://www.apex-performance.life/',
        telephone: `+1-${config.landline}`,
        email: config.email,
        image: 'https://www.apex-performance.life/assets/joe-home-become-one-percent-1280.webp',
        logo: 'https://www.apex-performance.life/assets/logo_mark-640.webp',
        address: {
          '@type': 'PostalAddress',
          streetAddress: '1626 Locust Avenue, Unit 1A',
          addressLocality: 'Bohemia', addressRegion: 'NY',
          postalCode: '11716', addressCountry: 'US',
        },
        areaServed: ['Long Island', 'Suffolk County', 'Nassau County'],
      },
      {
        '@type': 'Service',
        '@id': `https://www.apex-performance.life${data.path}#service`,
        name: stripTags(data.h1),
        description: data.metaDescription,
        url: `https://www.apex-performance.life${data.path}`,
        provider: { '@id': 'https://www.apex-performance.life/#business' },
        areaServed: { '@type': 'AdministrativeArea', name: 'Long Island, NY' },
      },
      {
        '@type': 'FAQPage',
        mainEntity: data.faqs.map(f => ({
          '@type': 'Question', name: f.question,
          acceptedAnswer: { '@type': 'Answer', text: f.answer },
        })),
      },
    ],
  });
}

/* ------------------------------------------------------------------ page -- */

function page(data) {
  const enhanced = enhancedFullBand(data);
  let body;
  let preload = '';

  if (enhanced) {
    // Single full-page enhanced image + live FAQ (+ MedWave embed if any)
    const embed = (compsSource[data.slug]?.bands || []).find(b => b.type === 'embed');
    const book = bookingUrl(data.slug);
    const bookStrip = data.primaryCta
      ? `<section class="cband cband-book"><div class="book-strip"><a class="btn btn-red" ${bookHrefAttrs(book || '#contact')}>${e(data.primaryCta)}</a><a class="btn btn-ghost" href="tel:+1${telHref(config.landline)}">Call ${e(config.landline)}</a></div></section>`
      : '';
    body = [
      enhanced,
      bookStrip,
      embed ? embedBand(embed) : '',
      faqBand(data),
    ].filter(Boolean).join('\n');
    preload = `<link rel="preload" as="image" href="/assets/comp-enhanced-clean/${data.slug}.jpg" fetchpriority="high">`;
  } else {
    const comp = comps[data.slug];
    if (!comp) throw new Error(`No sliced comp for ${data.slug} — run scripts/slice-comps.py`);
    const hero = comp.bands.find(b => b.priority);
    body = comp.bands.map(band => {
      if (band.type === 'nav' || band.type === 'footer') return '';
      if (band.type === 'faq') return faqBand(data);
      if (band.type === 'embed') return embedBand(band);
      if (band.type !== 'art') return '';
      return artBand(band, data);
    }).filter(Boolean).join('\n');
    preload = hero
      ? `<link rel="preload" as="image" href="${hero.src}.webp" imagesrcset="${hero.src}.webp 1x, ${hero.src}@2x.webp 2x" fetchpriority="high">`
      : '';
  }

  return `<!doctype html>
<html lang="en"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>${e(data.title)}</title>
<meta name="description" content="${e(data.metaDescription)}">
<link rel="canonical" href="https://www.apex-performance.life${e(data.path)}">
<meta property="og:type" content="website"><meta property="og:title" content="${e(data.title)}"><meta property="og:description" content="${e(data.metaDescription)}"><meta property="og:url" content="https://www.apex-performance.life${e(data.path)}"><meta property="og:image" content="https://www.apex-performance.life${e(data.heroImage)}">
<meta name="twitter:card" content="summary_large_image"><meta name="theme-color" content="#05070a">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&amp;display=swap" rel="stylesheet">
<link rel="stylesheet" href="/comp-pages.css">${preload}
<script type="application/ld+json">${schema(data)}</script></head>
<body class="comp-page page-${e(data.pageClass)}" data-service="${e(data.slug)}">
<a class="skip-link" href="#main">Skip to content</a>
${nav(data.slug)}
<main id="main">
<h1 class="sr-only">${e(stripTags(data.h1))}</h1>
<p class="sr-only">${e(data.heroCopy)}</p>
<div class="comp-stack">
${body}
</div>
</main>
${footer(data)}
<div class="mobile-callbar"><a class="primary" href="tel:+1${telHref(config.landline)}">Call Apex</a><a href="mailto:${e(config.email)}">Email</a></div>
<div class="lightbox" data-lightbox hidden><button class="lightbox-close" type="button" data-lightbox-close aria-label="Close video">✕</button><div class="lightbox-stage" data-lightbox-stage></div></div>
<script src="/comp-pages.js" defer></script>
</body></html>`;
}

const dbg = process.env.APEX_DEBUG ? m => process.stderr.write(m + '\n') : () => {};

let count = 0;
for (const service of services) {
  dbg('page: ' + service.slug);
  const html = page(service);
  dbg('  rendered ' + html.length + 'b');
  const outDir = path.join(root, ...pathParts(service.path));
  fs.mkdirSync(outDir, { recursive: true });
  dbg('  mkdir ' + outDir);
  // This repo lives under ~/Documents (iCloud Drive). Evicted files are
  // "dataless" placeholders and writing to one blocks while macOS downloads it.
  // Unlinking first never touches the cloud copy, so the write stays local.
  const outFile = path.join(outDir, 'index.html');
  fs.rmSync(outFile, { force: true });
  fs.writeFileSync(outFile, html);
  dbg('  wrote');
  count++;
}
console.log(`Built ${count} comp-driven service pages.`);
