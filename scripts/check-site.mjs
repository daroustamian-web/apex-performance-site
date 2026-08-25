import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const expected = [
  '/protocols/superhuman-protocol-long-island',
  '/recovery/whole-body-cryotherapy-long-island',
  '/recovery/hyperbaric-oxygen-therapy-long-island',
  '/recovery/red-light-therapy-long-island',
];
const medWaveUrl = 'https://apexperformance.medwaveproviders.com/';
const failures = [];
const titles = new Set();
const descriptions = new Set();
const fail = message => failures.push(message);
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const exists = rel => fs.existsSync(path.join(root, rel));

for (const route of expected) {
  const file = path.join(...route.split('/').filter(Boolean), 'index.html');
  const full = path.join(root, file);
  if (!fs.existsSync(full)) { fail(`Missing route: ${route}`); continue; }
  const html = fs.readFileSync(full, 'utf8');
  const title = html.match(/<title>([^<]+)<\/title>/)?.[1];
  const description = html.match(/<meta name="description" content="([^"]+)"/)?.[1];
  if (!title) fail(`${route}: missing title`);
  else if (titles.has(title)) fail(`${route}: duplicate title`);
  else titles.add(title);
  if (!description) fail(`${route}: missing description`);
  else if (descriptions.has(description)) fail(`${route}: duplicate description`);
  else descriptions.add(description);
  if (!html.includes(`<link rel="canonical" href="https://www.apex-performance.life${route}">`)) {
    fail(`${route}: canonical mismatch`);
  }
  if (!/<h1 class="sr-only">.+<\/h1>/.test(html)) fail(`${route}: missing crawlable H1`);
  if (!html.includes('class="comp-stack"') || !html.includes('cband')) {
    fail(`${route}: comp-stack bands missing`);
  }
  if (!html.includes('comp-pages.css') || !html.includes('comp-pages.js')) {
    fail(`${route}: comp page chrome missing`);
  }
  if (html.includes('door-pop') || html.includes('td-pop')) {
    fail(`${route}: homepage popup leaked into service page`);
  }
  if (!html.includes(`href="${medWaveUrl}" target="_blank" rel="noopener"`)) {
    fail(`${route}: MedWave external link missing or unsafe`);
  }
  if (!html.includes('logo_lockup-240')) fail(`${route}: transparent nav lockup missing`);
  if (!html.includes('logo_mark-640.webp')) fail(`${route}: schema logo mark missing`);
  for (const block of html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)) {
    try { JSON.parse(block[1]); }
    catch (error) { fail(`${route}: invalid JSON-LD (${error.message})`); }
  }
  for (const match of html.matchAll(/(?:src|href|srcset)="(\/(?:assets\/[^"\s,?#]+|comp-pages\.(?:css|js)))"/g)) {
    const local = path.join(root, match[1].slice(1));
    if (!fs.existsSync(local)) fail(`${route}: missing local resource ${match[1]}`);
  }
}

const allText = [
  'index.html', 'site-config.json', 'admin/config.yml', 'comp-pages.js', 'comp-pages.css',
  ...expected.map(route => path.join(...route.split('/').filter(Boolean), 'index.html')),
].map(read).join('\n');

const retiredPhone = new RegExp(['631', '562', '5233'].join('[- ()]*'));
const dummyPhone = new RegExp(['631', '555'].join('[- ()]*'));
const dummyEmail = ['hello', 'apexperformancerecovery.com'].join('@');
if (retiredPhone.test(allText)) fail('Retired contact number remains');
if (dummyPhone.test(allText) || allText.includes(dummyEmail)) fail('Dummy contact information remains');
for (const value of ['631-319-1786', '631-730-0456', 'kickfitbohemia@gmail.com']) {
  if (!allText.includes(value)) fail(`Missing confirmed contact: ${value}`);
}

const home = read('index.html');
for (const route of expected) {
  if (!home.includes(route)) fail(`Homepage navigation missing ${route}`);
}
if (!home.includes(`href="${medWaveUrl}" target="_blank" rel="noopener"`)) {
  fail('Homepage MedWave external link missing or unsafe');
}
if (home.includes('/recovery/medwave-pemf-therapy-long-island')) {
  fail('Homepage still links to retired internal MedWave page');
}
if (!home.includes('joe-home-become-one-percent-1600.webp')) {
  fail('Homepage supplied hero artwork missing');
}
if (!home.includes('logo_lockup-240')) fail('Homepage transparent nav lockup missing');

const sitemap = read('sitemap.xml');
for (const route of expected) {
  if (!sitemap.includes(`https://www.apex-performance.life${route}`)) {
    fail(`Sitemap missing ${route}`);
  }
}
if (sitemap.includes('medwave-pemf-therapy-long-island')) {
  fail('Sitemap still contains retired MedWave route');
}
if (exists('recovery/medwave-pemf-therapy-long-island/index.html')) {
  fail('Native MedWave page still exists');
}

const superhuman = read('protocols/superhuman-protocol-long-island/index.html');
const cryo = read('recovery/whole-body-cryotherapy-long-island/index.html');
const hbot = read('recovery/hyperbaric-oxygen-therapy-long-island/index.html');
const redLight = read('recovery/red-light-therapy-long-island/index.html');

if (!superhuman.includes('youtube-nocookie.com/embed/0fil3jbGjcU')) fail('Superhuman top YouTube missing');
if (!superhuman.includes('Book Your Discovery Session')) fail('Superhuman discovery CTA missing');
if (!superhuman.includes('comp-enhanced-clean/superhuman')) fail('Superhuman enhanced full image missing');
if (!hbot.includes('youtube-nocookie.com/embed/snjXiL2P9h8')) fail('HBOT YouTube embed missing');
if (!hbot.includes('id="dry-dive-training"')) fail('HBOT Dry Dive anchor missing');
if (!cryo.includes('data-video') || !cryo.includes('cryoniq')) fail('Cryo video trigger missing');
if (!cryo.includes('Book Your First Freeze')) fail('Cryo freeze CTA missing');
if (!redLight.includes('youtube-nocookie.com/embed/')) fail('Red-light YouTube play missing');
if (!redLight.includes(medWaveUrl)) fail('Red-light MedWave provider link missing');
if (!redLight.includes('cband-embed') || !redLight.includes(`src="${medWaveUrl}"`)) {
  fail('Red-light MedWave portal embed missing');
}
if (!exists('assets/cryoniq-experience.mp4')) fail('Cryoniq hero video missing');

// Video posters on every play slot
const posterAssets = [
  'video-thumbs/yt-0fil3jbGjcU.jpg',
  'video-thumbs/yt-0fil3jbGjcU.webp',
  'video-thumbs/yt--GBbwmlmNdE.jpg',
  'video-thumbs/yt--GBbwmlmNdE.webp',
  'video-thumbs/yt-snjXiL2P9h8.jpg',
  'video-thumbs/yt-snjXiL2P9h8.webp',
  'video-thumbs/yt-_b4CiVcoxa4.jpg',
  'video-thumbs/yt-_b4CiVcoxa4.webp',
  'video-thumbs/yt-KCQ40_C_Diw.jpg',
  'video-thumbs/yt-KCQ40_C_Diw.webp',
  'video-thumbs/cryoniq-experience.jpg',
  'video-thumbs/cryoniq-experience.webp',
];
for (const asset of posterAssets) {
  if (!exists(path.join('assets', asset))) fail(`Video poster missing: ${asset}`);
}
// Video play frames with poster thumbs
if (!superhuman.includes('ov-play-thumb') || !superhuman.includes('/assets/video-thumbs/yt-0fil3jbGjcU')) fail('Superhuman video thumbnail missing');
if (!cryo.includes('ov-play-thumb') || !cryo.includes('/assets/video-thumbs/cryoniq-experience')) fail('Cryo video thumbnail missing');
if (!hbot.includes('ov-play-thumb') || !hbot.includes('/assets/video-thumbs/yt-snjXiL2P9h8')) fail('HBOT video thumbnail missing');
if (!redLight.includes('ov-play-thumb')) fail('Red-light video thumbnail missing');
if (!superhuman.includes('comp-enhanced-clean')) fail('Superhuman should use enhanced full image');

for (const asset of [
  'logo_lockup-240.png', 'logo_lockup-240.webp',
  'logo_lockup-480.png', 'logo_lockup-480.webp',
  'logo_mark-320.png', 'logo_mark-320.webp',
  'logo_mark-640.png', 'logo_mark-640.webp',
  'joe-home-become-one-percent-800.webp',
  'joe-home-become-one-percent-1280.webp',
  'joe-home-become-one-percent-1600.webp',
]) {
  if (!exists(path.join('assets', asset))) fail(`Supplied artwork missing: ${asset}`);
}

const vercel = JSON.parse(read('vercel.json'));
const medWaveRedirect = vercel.redirects?.find(item => item.source === '/recovery/medwave-pemf-therapy-long-island');
if (!medWaveRedirect || medWaveRedirect.destination !== medWaveUrl || medWaveRedirect.permanent !== false) {
  fail('Temporary MedWave external redirect missing');
}

const config = JSON.parse(read('site-config.json'));
const bookingUrl = 'https://link.careconnectinc.com/widget/booking/JNKhk4AgtMk5LJVNSMMi';
if (config.defaultBookingUrl !== bookingUrl) {
  fail(`Default booking URL must be ${bookingUrl}`);
}
for (const key of Object.keys(config.serviceBookingUrls || {})) {
  if (config.serviceBookingUrls[key] !== bookingUrl) {
    fail(`Booking URL for ${key} must be ${bookingUrl}`);
  }
}
for (const route of expected) {
  const file = path.join(...route.split('/').filter(Boolean), 'index.html');
  const html = read(file);
  if (!html.includes(bookingUrl)) fail(`${route}: booking calendar URL missing from page`);
  if (!html.includes('Book Now') && !html.includes('Book Online') && !html.includes('Book Your')) {
    fail(`${route}: no Book CTA text found`);
  }
}
const homeHtml = read('index.html');
if (!homeHtml.includes(bookingUrl)) fail('Homepage missing booking calendar URL');
if ((homeHtml.match(new RegExp(bookingUrl.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')) || []).length < 3) {
  fail('Homepage should wire multiple Book CTAs to the calendar');
}

if (failures.length) {
  console.error(failures.map(item => `FAIL: ${item}`).join('\n'));
  process.exit(1);
}
console.log(
  `Site checks passed: ${expected.length} comp-driven service pages, transparent logos, unique metadata, valid schema, MedWave handoff, navigation, sitemap, contact data, and booking placeholders.`,
);
