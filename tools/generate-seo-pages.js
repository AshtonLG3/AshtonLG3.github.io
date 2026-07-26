const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const SITE_URL = "https://bridgeangelscakes.co.za";
const VERSION = "2026.07.26.1";
const LASTMOD = "2026-07-26";

const galleryItems = [
  {
    category: "wedding",
    categoryLabel: "Wedding Cakes",
    categoryUrl: "/wedding-cakes/",
    slug: "limpopo-white-gold-wedding-cake",
    image: "wedding-limpopo-white-gold-50-cake.jpg",
    webp: "wedding-limpopo-white-gold-50-cake.webp",
    title: "Limpopo White and Gold Wedding Cake",
    alt: "Three-tier white and gold Limpopo wedding cake by Bridge Angels Treats near Lichtenburg",
    description: "A three-tier white and gold wedding cake Bridget was invited to create in Limpopo, featuring vertical wave detailing and gold accents.",
  },
  {
    category: "wedding",
    categoryLabel: "Wedding Cakes",
    categoryUrl: "/wedding-cakes/",
    slug: "traditional-red-gold-three-tier-wedding-cake",
    image: "wedding-traditional-red-gold-three-tier-cake.jpg",
    webp: "wedding-traditional-red-gold-three-tier-cake.webp",
    title: "Traditional Red and Gold Three-Tier Wedding Cake",
    alt: "Traditional red and gold three-tier wedding cake by Bridge Angels Treats in Lichtenburg",
    description: "A traditional three-tier wedding cake with red patterned detail, gold accents, and white floral decoration.",
  },
  {
    category: "wedding",
    categoryLabel: "Wedding Cakes",
    categoryUrl: "/wedding-cakes/",
    slug: "modern-black-gold-stripe-wedding-cake",
    image: "wedding-modern-black-gold-stripes.jpg",
    webp: "wedding-modern-black-gold-stripes.webp",
    title: "Modern Black and Gold Stripe Wedding Cake",
    alt: "Modern black and gold striped wedding cake in Lichtenburg by Bridge Angels Treats",
    description: "A modern wedding cake with black and gold striped styling for an elegant celebration.",
  },
  {
    category: "wedding",
    categoryLabel: "Wedding Cakes",
    categoryUrl: "/wedding-cakes/",
    slug: "black-white-marble-gold-wedding-cake",
    image: "wedding-black-white-marble-gold.jpg",
    webp: "wedding-black-white-marble-gold.webp",
    title: "Black, White and Gold Marble Wedding Cake",
    alt: "Black white marble and gold wedding cake in Lichtenburg by Bridge Angels Treats",
    description: "A black, white, marble and gold wedding cake designed for a polished celebration table.",
  },
  {
    category: "wedding",
    categoryLabel: "Wedding Cakes",
    categoryUrl: "/wedding-cakes/",
    slug: "white-green-gold-confirmation-cake",
    image: "confirmation-white-green-leaves-gold.jpg",
    webp: "confirmation-white-green-leaves-gold.webp",
    title: "White, Green and Gold Confirmation Cake",
    alt: "White green and gold confirmation cake in Lichtenburg by Bridge Angels Treats",
    description: "A white confirmation cake with green leaf detail and gold finishing.",
  },
  {
    category: "kids",
    categoryLabel: "Kids Cakes",
    categoryUrl: "/kids-cakes/",
    slug: "spiderman-birthday-cake",
    image: "kids-spiderman-birthday-3-year.jpg",
    webp: "kids-spiderman-birthday-3-year.webp",
    title: "Spiderman Birthday Cake",
    alt: "Spiderman birthday cake for kids in Lichtenburg by Bridge Angels Treats",
    description: "A themed Spiderman birthday cake for a child celebration.",
  },
  {
    category: "kids",
    categoryLabel: "Kids Cakes",
    categoryUrl: "/kids-cakes/",
    slug: "blue-spiderman-city-birthday-cake",
    image: "kids-spiderman-blue-birthday-cake.jpg",
    webp: "kids-spiderman-blue-birthday-cake.webp",
    title: "Blue Spiderman City Birthday Cake",
    alt: "Blue Spiderman birthday cake with city skyline in Lichtenburg by Bridge Angels Treats",
    description: "A blue Spiderman birthday cake with city skyline details and red decorations.",
  },
  {
    category: "kids",
    categoryLabel: "Kids Cakes",
    categoryUrl: "/kids-cakes/",
    slug: "princess-castle-pink-birthday-cake",
    image: "kids-princess-castle-pink-zoey.jpg",
    webp: "kids-princess-castle-pink-zoey.webp",
    title: "Princess Castle Pink Birthday Cake",
    alt: "Pink princess castle birthday cake for kids in Lichtenburg by Bridge Angels Treats",
    description: "A pink princess castle themed cake for a kids birthday celebration.",
  },
  {
    category: "kids",
    categoryLabel: "Kids Cakes",
    categoryUrl: "/kids-cakes/",
    slug: "barbie-two-tier-pink-birthday-cake",
    image: "kids-barbie-two-tier-pink-retshegofadi.jpg",
    webp: "kids-barbie-two-tier-pink-retshegofadi.webp",
    title: "Barbie Two-Tier Pink Birthday Cake",
    alt: "Two-tier pink Barbie birthday cake in Lichtenburg by Bridge Angels Treats",
    description: "A two-tier pink Barbie cake for a themed birthday party.",
  },
  {
    category: "kids",
    categoryLabel: "Kids Cakes",
    categoryUrl: "/kids-cakes/",
    slug: "ronaldo-soccer-birthday-cake",
    image: "kids-ronaldo-soccer-birthday-akani.jpg",
    webp: "kids-ronaldo-soccer-birthday-akani.webp",
    title: "Ronaldo Soccer Birthday Cake",
    alt: "Ronaldo soccer birthday cake for kids in Lichtenburg by Bridge Angels Treats",
    description: "A Ronaldo soccer themed birthday cake for a football fan.",
  },
  {
    category: "kids",
    categoryLabel: "Kids Cakes",
    categoryUrl: "/kids-cakes/",
    slug: "blue-baby-shower-cloud-cake",
    image: "kids-baby-shower-boy-blue-clouds.jpg",
    webp: "kids-baby-shower-boy-blue-clouds.webp",
    title: "Blue Baby Shower Cloud Cake",
    alt: "Blue baby shower cake with clouds in Lichtenburg by Bridge Angels Treats",
    description: "A blue baby shower cake with cloud decorations for a boy celebration.",
  },
  {
    category: "kids",
    categoryLabel: "Kids Cakes",
    categoryUrl: "/kids-cakes/",
    slug: "rainbow-first-birthday-cake",
    image: "kids-rainbow-first-birthday-cake.jpg",
    webp: "kids-rainbow-first-birthday-cake.webp",
    title: "Rainbow First Birthday Cake",
    alt: "Rainbow first birthday cake with butterflies in Lichtenburg by Bridge Angels Treats",
    description: "A pastel rainbow first birthday cake with butterflies and gold accents.",
  },
  {
    category: "kids",
    categoryLabel: "Kids Cakes",
    categoryUrl: "/kids-cakes/",
    slug: "pink-two-tier-roses-butterflies-birthday-cake",
    image: "kids-pink-two-tier-roses-butterflies-zoey.jpg",
    webp: "kids-pink-two-tier-roses-butterflies-zoey.webp",
    title: "Pink Two-Tier Roses and Butterflies Birthday Cake",
    alt: "Pink two-tier birthday cake with roses and butterflies in Lichtenburg by Bridge Angels Treats",
    description: "A pink two-tier birthday cake with white roses, butterflies, and a soft celebration finish.",
  },
  {
    category: "celebration",
    categoryLabel: "Birthday and Celebration Cakes",
    categoryUrl: "/birthday-cakes/",
    slug: "gold-drip-white-50th-birthday-cake",
    image: "birthday-gold-drip-white-sinah-50.jpg",
    webp: "birthday-gold-drip-white-sinah-50.webp",
    title: "Gold Drip White 50th Birthday Cake",
    alt: "White and gold drip 50th birthday cake in Lichtenburg by Bridge Angels Treats",
    description: "A white and gold drip cake for a 50th birthday celebration.",
  },
  {
    category: "celebration",
    categoryLabel: "Birthday and Celebration Cakes",
    categoryUrl: "/birthday-cakes/",
    slug: "pink-ombre-roses-birthday-cake",
    image: "birthday-pink-ombre-roses-tracy.jpg",
    webp: "birthday-pink-ombre-roses-tracy.webp",
    title: "Pink Ombre Roses Birthday Cake",
    alt: "Pink ombre roses birthday cake in Lichtenburg by Bridge Angels Treats",
    description: "A pink ombre birthday cake decorated with roses.",
  },
  {
    category: "celebration",
    categoryLabel: "Birthday and Celebration Cakes",
    categoryUrl: "/birthday-cakes/",
    slug: "rose-gold-textured-birthday-cake",
    image: "birthday-wife-rose-gold-textured.jpg",
    webp: "birthday-wife-rose-gold-textured.webp",
    title: "Rose Gold Textured Birthday Cake",
    alt: "Rose gold textured birthday cake in Lichtenburg by Bridge Angels Treats",
    description: "A rose gold textured birthday cake for a refined celebration.",
  },
  {
    category: "celebration",
    categoryLabel: "Birthday and Celebration Cakes",
    categoryUrl: "/birthday-cakes/",
    slug: "white-gold-mens-birthday-cake",
    image: "birthday-husband-father-white-gold.jpg",
    webp: "birthday-husband-father-white-gold.webp",
    title: "White and Gold Men's Birthday Cake",
    alt: "White and gold men's birthday cake in Lichtenburg by Bridge Angels Treats",
    description: "A white and gold men's birthday cake for husband and father celebrations.",
  },
  {
    category: "celebration",
    categoryLabel: "Birthday and Celebration Cakes",
    categoryUrl: "/birthday-cakes/",
    slug: "mothers-day-floral-cake",
    image: "celebration-mothers-day-floral-cake.jpg",
    webp: "celebration-mothers-day-floral-cake.webp",
    title: "Mother's Day Floral Cake",
    alt: "Mother's Day floral cake with ribbon in Lichtenburg by Bridge Angels Treats",
    description: "A floral Mother's Day cake with ribbon detail and pink lettering.",
  },
  {
    category: "celebration",
    categoryLabel: "Birthday and Celebration Cakes",
    categoryUrl: "/birthday-cakes/",
    slug: "naked-24th-birthday-cake-single-rose",
    image: "birthday-naked-cake-single-rose-24th.jpg",
    webp: "birthday-naked-cake-single-rose-24th.webp",
    title: "Naked 24th Birthday Cake with Single Rose",
    alt: "Naked 24th birthday cake with a single pink rose in Lichtenburg by Bridge Angels Treats",
    description: "A simple naked birthday cake with a single pink rose and 24th birthday topper.",
  },
  {
    category: "celebration",
    categoryLabel: "Birthday and Celebration Cakes",
    categoryUrl: "/birthday-cakes/",
    slug: "black-gold-60th-birthday-balloon-cake",
    image: "birthday-black-gold-balloons-60th.jpg",
    webp: "birthday-black-gold-balloons-60th.webp",
    title: "Black and Gold 60th Birthday Balloon Cake",
    alt: "White black and gold 60th birthday cake with balloon cluster in Lichtenburg by Bridge Angels Treats",
    description: "A white 60th birthday cake with black and gold balloon cluster and gold leaf.",
  },
  {
    category: "celebration",
    categoryLabel: "Birthday and Celebration Cakes",
    categoryUrl: "/birthday-cakes/",
    slug: "purple-gold-anniversary-two-tier-cake",
    image: "celebration-anniversary-purple-gold-leaf-two-tier.jpg",
    webp: "celebration-anniversary-purple-gold-leaf-two-tier.webp",
    title: "Purple and Gold Anniversary Two-Tier Cake",
    alt: "Purple black and gold two-tier anniversary cake in Lichtenburg by Bridge Angels Treats",
    description: "A two-tier anniversary cake with purple, black and gold leaf detailing.",
  },
  {
    category: "bakes",
    categoryLabel: "Cupcakes and Bakes",
    categoryUrl: "/cupcakes-scones/",
    slug: "gender-reveal-cupcakes",
    image: "kids-gender-reveal-pink-blue-cupcakes.jpg",
    webp: "kids-gender-reveal-pink-blue-cupcakes.webp",
    title: "Gender Reveal Cupcakes",
    alt: "Pink and blue gender reveal cupcakes in Lichtenburg by Bridge Angels Treats",
    description: "Pink and blue gender reveal cupcakes for a family celebration.",
  },
  {
    category: "bakes",
    categoryLabel: "Cupcakes and Bakes",
    categoryUrl: "/cupcakes-scones/",
    slug: "chocolate-muffins",
    image: "treats-chocolate-muffins.jpg",
    webp: "treats-chocolate-muffins.webp",
    title: "Chocolate Muffins",
    alt: "Fresh chocolate muffins in Lichtenburg by Bridge Angels Treats",
    description: "Fresh chocolate muffins baked by Bridge Angels Treats.",
  },
  {
    category: "bakes",
    categoryLabel: "Cupcakes and Bakes",
    categoryUrl: "/cupcakes-scones/",
    slug: "peanut-butter-cookies",
    image: "treats-peanut-butter-cookies.jpg",
    webp: "treats-peanut-butter-cookies.webp",
    title: "Peanut Butter Cookies",
    alt: "Peanut butter cookies in Lichtenburg by Bridge Angels Treats",
    description: "Peanut butter cookies for events, office functions, and family treats.",
  },
];

const videos = [
  {
    slug: "cake-stacking-rainbow-decoration-process",
    title: "Cake Stacking and Rainbow Decoration Process",
    file: "Cake-Stacking-And-Rainbow-Decoration.mp4",
    poster: "cake-stacking-rainbow-decoration-poster.webp",
    duration: "PT1M2S",
    description: "Behind-the-scenes video of Bridget stacking a custom cake and adding rainbow-themed decoration in Lichtenburg.",
  },
  {
    slug: "pink-rainbow-birthday-cake-decorating-process",
    title: "Pink Rainbow Birthday Cake Decorating Process",
    file: "Pink-Rainbow-Birthday-Cake-Decorating-Process.mp4",
    poster: "pink-rainbow-birthday-cake-decorating-poster.webp",
    duration: "PT23S",
    description: "Behind-the-scenes video showing a pink rainbow birthday cake decorating process by Bridge Angels Treats.",
  },
];

const servicePages = [
  {
    slug: "custom-cakes",
    title: "Custom Cakes in Lichtenburg",
    heading: "Custom Cakes in Lichtenburg",
    description: "Order custom cakes in Lichtenburg from Bridge Angels Treats. Bridget makes wedding cakes, birthday cakes, kids themed cakes, cupcakes and celebration bakes.",
    keywords: ["custom cakes", "Lichtenburg", "wedding cakes", "birthday cakes", "kids cakes"],
    categories: ["wedding", "kids", "celebration", "bakes"],
  },
  {
    slug: "wedding-cakes",
    title: "Wedding Cakes in Lichtenburg",
    heading: "Wedding Cakes in Lichtenburg",
    description: "Elegant wedding cakes for Lichtenburg, North West and nearby events, including traditional, modern, multi-tier and gold-accent designs.",
    keywords: ["wedding cakes", "Lichtenburg", "custom wedding cake"],
    categories: ["wedding"],
  },
  {
    slug: "birthday-cakes",
    title: "Birthday Cakes in Lichtenburg",
    heading: "Birthday Cakes in Lichtenburg",
    description: "Custom birthday and celebration cakes in Lichtenburg, including 50th, 60th, Mother's Day, anniversary and rose-gold designs.",
    keywords: ["birthday cakes", "Lichtenburg", "celebration cakes"],
    categories: ["celebration"],
  },
  {
    slug: "kids-cakes",
    title: "Kids Cakes in Lichtenburg",
    heading: "Kids Cakes in Lichtenburg",
    description: "Kids themed birthday cakes in Lichtenburg, including Spiderman, Barbie, princess, soccer, rainbow and baby shower cake designs.",
    keywords: ["kids cakes", "Lichtenburg", "themed birthday cakes"],
    categories: ["kids"],
  },
  {
    slug: "cupcakes-scones",
    title: "Cupcakes, Scones and Bakes in Lichtenburg",
    heading: "Cupcakes, Scones and Bakes in Lichtenburg",
    description: "Cupcakes, muffins, cookies and scones in Lichtenburg for parties, office functions and family events.",
    keywords: ["cupcakes", "scones", "muffins", "Lichtenburg"],
    categories: ["bakes"],
  },
];

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function ensureDir(dir) {
  fs.mkdirSync(path.join(ROOT, dir), { recursive: true });
}

function writeRoute(route, html) {
  ensureDir(route);
  fs.writeFileSync(path.join(ROOT, route, "index.html"), html, "utf8");
}

function pageShell({ title, description, canonical, body, image = "wedding-modern-black-gold-stripes.webp", structuredData = "" }) {
  return `<!DOCTYPE html>
<html lang="en" data-theme="light">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${escapeHtml(title)} | Bridge Angels Treats</title>
<meta name="description" content="${escapeHtml(description)}">
<meta name="author" content="Bridge Angels Treats">
<meta name="site-version" content="${VERSION}">
<link rel="canonical" href="${canonical}">
<meta property="og:title" content="${escapeHtml(title)}">
<meta property="og:description" content="${escapeHtml(description)}">
<meta property="og:image" content="${SITE_URL}/${image}">
<meta property="og:url" content="${canonical}">
<meta property="og:type" content="website">
<link rel="icon" type="image/x-icon" href="/favicon.ico">
<script src="https://cdn.tailwindcss.com"></script>
<link href="https://fonts.googleapis.com/css2?family=Lato:wght@400;700&family=Playfair+Display:wght@400;700&display=swap" rel="stylesheet">
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css">
${structuredData}
<script>
  const savedTheme = localStorage.getItem('bridgeAngelsTheme') || 'light';
  document.documentElement.dataset.theme = savedTheme;
</script>
<style>
  body{font-family:Lato,sans-serif;color:#374151;background:#fff8f0}
  .font-serif{font-family:"Playfair Display",serif}
  .theme-toggle{border:1px solid rgba(236,72,153,.35);color:#92400e;background:#fff8f0}
  html[data-theme="dark"] body,html[data-theme="dark"] nav,html[data-theme="dark"] main,html[data-theme="dark"] footer{background:#16100d!important;color:#f5efe7!important}
  html[data-theme="dark"] .bg-white{background:#211812!important;color:#f5efe7!important}
  html[data-theme="dark"] .text-gray-600,html[data-theme="dark"] .text-gray-700,html[data-theme="dark"] .text-orange-900{color:#f1e5d6!important}
  html[data-theme="dark"] .theme-toggle{background:#352219;color:#fff8f0}
</style>
</head>
<body>
<nav class="bg-white shadow-md">
  <div class="max-w-6xl mx-auto px-4 py-4 flex flex-wrap gap-4 items-center justify-between">
    <a href="/" class="font-serif text-2xl font-bold text-pink-600">Bridge Angels Treats</a>
    <div class="flex flex-wrap gap-4 items-center text-sm font-bold">
      <a href="/custom-cakes/">Custom Cakes</a>
      <a href="/wedding-cakes/">Wedding Cakes</a>
      <a href="/birthday-cakes/">Birthday Cakes</a>
      <a href="/kids-cakes/">Kids Cakes</a>
      <a href="/gallery/">Gallery</a>
      <a href="/quote/">Get Your Quote</a>
      <button type="button" class="theme-toggle rounded-full px-3 py-2 text-xs font-bold" onclick="toggleTheme()"><i class="fas fa-adjust mr-1"></i><span data-theme-label>Light</span></button>
      <span class="text-xs text-gray-500" data-site-version>v${VERSION}</span>
    </div>
  </div>
</nav>
<main>${body}</main>
<footer class="bg-white mt-12 py-8 text-center text-sm text-gray-600">
  <p class="font-serif text-xl font-bold text-pink-600 mb-2">Bridge Angels Treats (Pty) Ltd</p>
  <p><a href="tel:+27737095975">+27 73 709 5975</a> · <a href="/quote/">Get Your Quote</a> · Lichtenburg, North West</p>
</footer>
<script>
  const siteVersion = document.querySelector('meta[name="site-version"]')?.content || '${VERSION}';
  document.querySelectorAll('[data-site-version]').forEach((item) => item.textContent = 'v' + siteVersion);
  function applyTheme(theme) {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem('bridgeAngelsTheme', theme);
    document.querySelectorAll('[data-theme-label]').forEach((item) => item.textContent = theme === 'dark' ? 'Dark' : 'Light');
  }
  function toggleTheme() {
    applyTheme(document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark');
  }
  applyTheme(document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light');
</script>
</body>
</html>`;
}

function galleryCard(item) {
  return `<a href="/gallery/${item.slug}/" class="block bg-white rounded-lg shadow overflow-hidden">
    <picture>
      <source srcset="/${item.webp}" type="image/webp">
      <img src="/${item.image}" alt="${escapeHtml(item.alt)}" loading="lazy" class="w-full h-72 object-cover">
    </picture>
    <div class="p-4">
      <h2 class="font-serif text-xl font-bold text-orange-900">${escapeHtml(item.title)}</h2>
      <p class="mt-2 text-sm text-gray-600">${escapeHtml(item.description)}</p>
      <span class="inline-block mt-3 text-pink-600 font-bold text-sm">View details</span>
    </div>
  </a>`;
}

function generateGalleryGrid(items) {
  return items.map((item) => `  <div class="gallery-item" data-category="${item.category}">
    <a href="/gallery/${item.slug}/" class="gallery-link block" data-image="${item.webp}" data-alt="${escapeHtml(item.alt)}">
      <picture>
          <source srcset="${item.webp}" type="image/webp">
          <img loading="lazy" src="${item.image}" alt="${escapeHtml(item.alt)}" class="cursor-zoom-in rounded-lg h-80 w-full object-cover shadow-md transition duration-300" />
      </picture>
    </a>
  </div>`).join("\n");
}

function updateIndex() {
  const indexPath = path.join(ROOT, "index.html");
  let html = fs.readFileSync(indexPath, "utf8");
  html = html.replace(/\r\n/g, "\n");
  html = html.replace(/2026\.\d{2}\.\d{2}\.\d+/g, VERSION);
  html = html.replace(
    /<title>.*?<\/title>/,
    "<title>Custom Cakes in Lichtenburg | Bridge Angels Treats Bakery</title>"
  );
  html = html.replace(
    /<meta name="description" content="[^"]+">/,
    '<meta name="description" content="Order custom cakes in Lichtenburg from Bridge Angels Treats. Bridget makes wedding cakes, birthday cakes, kids themed cakes, cupcakes, scones and celebration bakes.">'
  );
  html = html.replace(
    /<meta name="keywords" content="[^"]+">/,
    '<meta name="keywords" content="custom cakes Lichtenburg, bakery Lichtenburg, wedding cakes Lichtenburg, birthday cakes Lichtenburg, kids cakes Lichtenburg, cupcakes Lichtenburg, scones Lichtenburg, Bridge Angels Treats">'
  );
  html = html.replace(
    /<link rel="canonical" href="https:\/\/bridgeangelscakes\.co\.za\/?">/,
    `<link rel="canonical" href="${SITE_URL}/">`
  );
  html = html.replace(
    /<meta property="og:title" content="[^"]+">/,
    '<meta property="og:title" content="Custom Cakes in Lichtenburg - Bridge Angels Treats">'
  );
  html = html.replace(
    /<meta property="og:description" content="[^"]+">/,
    '<meta property="og:description" content="Custom cakes, wedding cakes, birthday cakes, kids cakes and bakes in Lichtenburg by Bridget.">'
  );
  html = html.replace(
    /<meta property="og:url" content="[^"]+">/,
    `<meta property="og:url" content="${SITE_URL}/">`
  );
  html = html.replace(
    /"description": "Custom cakes for weddings, birthdays, kids, and special events in Lichtenburg\.",/,
    '"description": "Custom cakes, wedding cakes, birthday cakes, kids cakes, cupcakes and bakes in Lichtenburg.",'
  );
  html = html.replace(
    /"url": "https:\/\/bridgeangelscakes\.co\.za\/?"/,
    `"url": "${SITE_URL}/"`
  );
  html = html.replace(
    /<h1 class="font-serif text-5xl text-white font-bold mb-4 drop-shadow-lg leading-tight">[\s\S]*?<\/h1>/,
    '<h1 class="font-serif text-5xl text-white font-bold mb-4 drop-shadow-lg leading-tight">Custom Cakes in Lichtenburg</h1>'
  );
  html = html.replace(
    /<p class="text-white mb-8 text-lg font-light">[^<]+<\/p>/,
    '<p class="text-white mb-8 text-lg font-light">Wedding cakes, birthday cakes, kids themed cakes, cupcakes and celebration bakes handcrafted by Bridget.</p>'
  );
  html = html.replace(
    /<img src="logo\.png" class="h-16 w-auto object-contain" alt="[^"]+">/,
    '<img src="logo.png" class="h-16 w-auto object-contain" alt="Bridge Angels Treats custom cakes Lichtenburg logo">'
  );
  html = html.replace(
    /<img src="wedding-modern-black-gold-stripes\.jpg" alt="[^"]+"/,
    '<img src="wedding-modern-black-gold-stripes.jpg" alt="Modern black and gold custom wedding cake in Lichtenburg"'
  );
  html = html.replace(
    /<img loading="lazy" src="about-bridget-roses-cake-midrand\.jpg" alt="[^"]+"/,
    '<img loading="lazy" src="about-bridget-roses-cake-midrand.jpg" alt="Bridget from Bridge Angels Treats holding a custom cake in Lichtenburg"'
  );
  html = html.replace(
    /<p class="text-gray-700 mb-4 text-lg">[\s\S]*?<\/p>\s*<p class="text-gray-700 mb-6">[\s\S]*?<\/p>/,
    '<p class="text-gray-700 mb-4 text-lg">Bridge Angels Treats is a Lichtenburg bakery specialising in <strong>custom cakes in Lichtenburg</strong>, including wedding cakes, birthday cakes, kids themed cakes, cupcakes and scones.</p>\n   <p class="text-gray-700 mb-6">Based in Lichtenburg, Bridget turns your cake ideas into detailed celebration centrepieces for families, weddings, birthdays and events across the area.</p>'
  );

  html = html.replace(
    /<a href="#about" class="hover:text-strawberry transition font-bold">About<\/a>\s*<a href="#services" class="hover:text-strawberry transition font-bold">Services<\/a>\s*<a href="#gallery" class="hover:text-strawberry transition font-bold">Gallery<\/a>\s*<a href="#contact" class="hover:text-strawberry transition font-bold">Contact<\/a>/,
    '<a href="#about" class="hover:text-strawberry transition font-bold">About</a>\n    <a href="/custom-cakes/" class="hover:text-strawberry transition font-bold">Custom Cakes</a>\n    <a href="/wedding-cakes/" class="hover:text-strawberry transition font-bold">Wedding Cakes</a>\n    <a href="/gallery/" class="hover:text-strawberry transition font-bold">Gallery</a>\n    <a href="/quote/" class="hover:text-strawberry transition font-bold">Quote</a>'
  );
  html = html.replace(
    /<a href="#about" class="block py-3 border-b text-chocolate font-bold">About<\/a>\s*<a href="#services" class="block py-3 border-b text-chocolate font-bold">Services<\/a>\s*<a href="#gallery" class="block py-3 border-b text-chocolate font-bold">Gallery<\/a>/,
    '<a href="#about" class="block py-3 border-b text-chocolate font-bold">About</a>\n  <a href="/custom-cakes/" class="block py-3 border-b text-chocolate font-bold">Custom Cakes</a>\n  <a href="/wedding-cakes/" class="block py-3 border-b text-chocolate font-bold">Wedding Cakes</a>\n  <a href="/gallery/" class="block py-3 border-b text-chocolate font-bold">Gallery</a>\n  <a href="/quote/" class="block py-3 border-b text-chocolate font-bold">Quote</a>'
  );
  html = html.replace(
    /<a href="#gallery" class="bg-white hover:bg-gray-100 text-gray-800 font-bold py-3 px-8 rounded-full shadow-lg transition transform hover:scale-105">View Gallery<\/a>/,
    '<a href="/gallery/" class="bg-white hover:bg-gray-100 text-gray-800 font-bold py-3 px-8 rounded-full shadow-lg transition transform hover:scale-105">View Gallery</a>'
  );
  html = html.replace(/<div onclick="filterGallery\('wedding'\)" class="/, '<a href="/wedding-cakes/" class="block ');
  html = html.replace(/<\/div>\s*<div onclick="filterGallery\('kids'\)" class="/, '</a>\n  <a href="/kids-cakes/" class="block ');
  html = html.replace(/<\/div>\s*<div onclick="filterGallery\('celebration'\)" class="/, '</a>\n  <a href="/birthday-cakes/" class="block ');
  html = html.replace(/<\/div>\s*<div onclick="filterGallery\('bakes'\)" class="/, '</a>\n  <a href="/cupcakes-scones/" class="block ');
  html = html.replace(
    /(<p class="text-sm text-gray-500">Scones, muffins & custom cupcakes\.<\/p>)\s*<\/div>/,
    '$1\n  </a>'
  );

  const start = '<div class="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-7xl mx-auto px-4" id="galleryGrid">';
  const beforeGrid = html.indexOf(start);
  const afterGrid = html.indexOf('\n </div>\n</section>\n\n<section class="py-20 bg-rose/30', beforeGrid);
  if (beforeGrid === -1 || afterGrid === -1) {
    throw new Error("Could not locate gallery grid in index.html");
  }
  html = html.slice(0, beforeGrid + start.length) + "\n" + generateGalleryGrid(galleryItems) + html.slice(afterGrid);

  html = html.replace(
    /<h2 class="font-serif text-4xl text-center font-bold mb-10 text-chocolate">Behind the Scenes<\/h2>/,
    '<h2 class="font-serif text-4xl text-center font-bold mb-10 text-chocolate">Cake Decorating Videos in Lichtenburg</h2>'
  );
  html = html.replace(
    /<h3 class="font-serif text-2xl font-bold mb-3 text-chocolate">Cake Stacking and Rainbow Decoration<\/h3>/,
    '<a href="/videos/cake-stacking-rainbow-decoration-process/" class="block font-serif text-2xl font-bold mb-3 text-chocolate">Cake Stacking and Rainbow Decoration</a>'
  );
  html = html.replace(
    /<h3 class="font-serif text-2xl font-bold mb-3 text-chocolate">Pink Rainbow Birthday Cake Decorating<\/h3>/,
    '<a href="/videos/pink-rainbow-birthday-cake-decorating-process/" class="block font-serif text-2xl font-bold mb-3 text-chocolate">Pink Rainbow Birthday Cake Decorating</a>'
  );

  html = html.replace(
    /function openModal\(imageSrc\) \{[\s\S]*?document\.body\.style\.overflow = 'hidden'; \/\/ Prevent scrolling background\s*\}/,
    `function openModal(imageSrc, imageAlt, itemUrl) {
        const modal = document.getElementById('imageModal');
        const modalImg = document.getElementById('modalImage');
        modal.classList.remove('hidden');
        modalImg.src = imageSrc;
        modalImg.alt = imageAlt || 'Enlarged cake gallery photo';
        document.body.style.overflow = 'hidden';
        if (itemUrl && window.location.pathname !== new URL(itemUrl).pathname) {
            history.pushState({ galleryModal: true }, '', itemUrl);
        }
    }`
  );
  html = html.replace(
    /function closeModal\(\) \{[\s\S]*?document\.body\.style\.overflow = 'auto'; \/\/ Re-enable scrolling\s*\}/,
    `function closeModal() {
        const modal = document.getElementById('imageModal');
        modal.classList.add('hidden');
        document.body.style.overflow = 'auto';
        if (window.location.pathname.startsWith('/gallery/')) {
            history.pushState({}, '', '/#gallery');
        }
    }`
  );
  html = html.replace(
    /    applyTheme\(document\.documentElement\.dataset\.theme === 'dark' \? 'dark' : 'light'\);\s*/,
    `    applyTheme(document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light');

    document.querySelectorAll('.gallery-link').forEach((link) => {
        link.addEventListener('click', (event) => {
            if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) {
                return;
            }
            event.preventDefault();
            openModal(link.dataset.image, link.dataset.alt, link.href);
        });
    });

    window.addEventListener('popstate', () => {
        if (!window.location.pathname.startsWith('/gallery/')) {
            const modal = document.getElementById('imageModal');
            modal.classList.add('hidden');
            document.body.style.overflow = 'auto';
        }
    });

`
  );

  fs.writeFileSync(indexPath, html, "utf8");
}

function serviceBody(page) {
  const items = galleryItems.filter((item) => page.categories.includes(item.category));
  return `<section class="py-16 px-4">
  <div class="max-w-6xl mx-auto">
    <p class="text-sm font-bold text-pink-600 mb-3">Bridge Angels Treats · Lichtenburg bakery</p>
    <h1 class="font-serif text-5xl font-bold text-orange-900 mb-6">${escapeHtml(page.heading)}</h1>
    <p class="text-lg text-gray-700 max-w-3xl mb-8">${escapeHtml(page.description)}</p>
    <div class="flex flex-wrap gap-3 mb-10">
      <a href="/quote/" class="bg-pink-600 text-white px-5 py-3 rounded-full font-bold">Get Your Quote</a>
      <a href="/gallery/" class="bg-white px-5 py-3 rounded-full font-bold shadow">View Full Gallery</a>
    </div>
    <div class="grid md:grid-cols-3 gap-6">
      ${items.map(galleryCard).join("\n")}
    </div>
  </div>
</section>`;
}

function generatePages() {
  for (const page of servicePages) {
    writeRoute(page.slug, pageShell({
      title: page.title,
      description: page.description,
      canonical: `${SITE_URL}/${page.slug}/`,
      body: serviceBody(page),
      image: galleryItems.find((item) => page.categories.includes(item.category))?.webp,
      structuredData: `<script type="application/ld+json">${JSON.stringify({
        "@context": "https://schema.org",
        "@type": "Service",
        name: page.title,
        description: page.description,
        provider: {
          "@type": "Bakery",
          name: "Bridge Angels Treats",
          address: {
            "@type": "PostalAddress",
            addressLocality: "Lichtenburg",
            addressRegion: "North West",
            addressCountry: "ZA",
          },
          telephone: "+27737095975",
        },
        areaServed: "Lichtenburg",
        url: `${SITE_URL}/${page.slug}/`,
      })}</script>`,
    }));
  }

  writeRoute("gallery", pageShell({
    title: "Cake Gallery in Lichtenburg",
    description: "Browse the Bridge Angels Treats cake gallery with wedding cakes, birthday cakes, kids cakes, cupcakes and bakes made in Lichtenburg.",
    canonical: `${SITE_URL}/gallery/`,
    image: galleryItems[0].webp,
    body: `<section class="py-16 px-4">
  <div class="max-w-6xl mx-auto">
    <h1 class="font-serif text-5xl font-bold text-orange-900 mb-6">Cake Gallery in Lichtenburg</h1>
    <p class="text-lg text-gray-700 max-w-3xl mb-8">Each portfolio item has its own crawlable page with descriptive alt text and a direct quote link.</p>
    <div class="grid md:grid-cols-3 gap-6">${galleryItems.map(galleryCard).join("\n")}</div>
  </div>
</section>`,
  }));

  writeRoute("quote", pageShell({
    title: "Get a Custom Cake Quote in Lichtenburg",
    description: "Request a quote from Bridge Angels Treats for custom cakes, wedding cakes, birthday cakes, kids cakes, cupcakes and scones in Lichtenburg.",
    canonical: `${SITE_URL}/quote/`,
    body: `<section class="py-16 px-4">
  <div class="max-w-3xl mx-auto bg-white rounded-lg shadow p-8">
    <h1 class="font-serif text-5xl font-bold text-orange-900 mb-6">Get a Custom Cake Quote in Lichtenburg</h1>
    <p class="text-lg text-gray-700 mb-6">Send Bridget your cake idea, event date, size, flavour and inspiration photo. Include whether you need a wedding cake, birthday cake, kids themed cake, cupcakes, scones or another bake.</p>
    <a href="https://wa.me/27737095975?text=Hi%20Bridget%2C%20I%20need%20a%20custom%20cake%20quote%20in%20Lichtenburg." class="inline-block bg-green-600 text-white px-6 py-4 rounded-full font-bold">Request Quote on WhatsApp</a>
    <p class="mt-6 text-gray-600">Phone: <a href="tel:+27737095975" class="font-bold">+27 73 709 5975</a></p>
  </div>
</section>`,
  }));

  for (const item of galleryItems) {
    writeRoute(path.join("gallery", item.slug), pageShell({
      title: `${item.title} in Lichtenburg`,
      description: `${item.description} View this ${item.categoryLabel.toLowerCase()} portfolio item from Bridge Angels Treats and request a custom cake quote in Lichtenburg.`,
      canonical: `${SITE_URL}/gallery/${item.slug}/`,
      image: item.webp,
      structuredData: `<script type="application/ld+json">${JSON.stringify({
        "@context": "https://schema.org",
        "@type": "ImageObject",
        name: item.title,
        description: item.description,
        contentUrl: `${SITE_URL}/${item.webp}`,
        thumbnailUrl: `${SITE_URL}/${item.webp}`,
        creator: {
          "@type": "Bakery",
          name: "Bridge Angels Treats",
          address: {
            "@type": "PostalAddress",
            addressLocality: "Lichtenburg",
            addressRegion: "North West",
            addressCountry: "ZA",
          },
        },
      })}</script>`,
      body: `<section class="py-16 px-4">
  <div class="max-w-5xl mx-auto grid md:grid-cols-2 gap-10 items-start">
    <picture>
      <source srcset="/${item.webp}" type="image/webp">
      <img src="/${item.image}" alt="${escapeHtml(item.alt)}" class="w-full rounded-lg shadow">
    </picture>
    <div>
      <p class="text-sm font-bold text-pink-600 mb-3">${escapeHtml(item.categoryLabel)} · Lichtenburg</p>
      <h1 class="font-serif text-5xl font-bold text-orange-900 mb-6">${escapeHtml(item.title)}</h1>
      <p class="text-lg text-gray-700 mb-6">${escapeHtml(item.description)}</p>
      <div class="flex flex-wrap gap-3">
        <a href="/quote/" class="bg-pink-600 text-white px-5 py-3 rounded-full font-bold">Get Your Quote</a>
        <a href="${item.categoryUrl}" class="bg-white px-5 py-3 rounded-full font-bold shadow">More ${escapeHtml(item.categoryLabel)}</a>
        <a href="/gallery/" class="bg-white px-5 py-3 rounded-full font-bold shadow">Back to Gallery</a>
      </div>
    </div>
  </div>
</section>`,
    }));
  }

  for (const video of videos) {
    writeRoute(path.join("videos", video.slug), pageShell({
      title: `${video.title} in Lichtenburg`,
      description: video.description,
      canonical: `${SITE_URL}/videos/${video.slug}/`,
      image: video.poster,
      structuredData: `<script type="application/ld+json">${JSON.stringify({
        "@context": "https://schema.org",
        "@type": "VideoObject",
        name: video.title,
        description: video.description,
        thumbnailUrl: `${SITE_URL}/${video.poster}`,
        uploadDate: "2025-11-27",
        duration: video.duration,
        contentUrl: `${SITE_URL}/${video.file}`,
      })}</script>`,
      body: `<section class="py-16 px-4">
  <div class="max-w-5xl mx-auto">
    <p class="text-sm font-bold text-pink-600 mb-3">Cake decorating video · Lichtenburg</p>
    <h1 class="font-serif text-5xl font-bold text-orange-900 mb-6">${escapeHtml(video.title)}</h1>
    <p class="text-lg text-gray-700 mb-8">${escapeHtml(video.description)}</p>
    <video preload="metadata" poster="/${video.poster}" title="${escapeHtml(video.title)}" controls playsinline class="w-full rounded-lg shadow bg-black">
      <source src="/${video.file}" type="video/mp4">
    </video>
    <div class="flex flex-wrap gap-3 mt-8">
      <a href="/quote/" class="bg-pink-600 text-white px-5 py-3 rounded-full font-bold">Get Your Quote</a>
      <a href="/gallery/" class="bg-white px-5 py-3 rounded-full font-bold shadow">View Cake Gallery</a>
    </div>
  </div>
</section>`,
    }));
  }
}

function writeSitemap() {
  const routes = [
    { loc: "/", priority: "1.00" },
    ...servicePages.map((page) => ({ loc: `/${page.slug}/`, priority: page.slug === "custom-cakes" ? "0.95" : "0.90" })),
    { loc: "/gallery/", priority: "0.90" },
    { loc: "/quote/", priority: "0.90" },
    ...galleryItems.map((item) => ({ loc: `/gallery/${item.slug}/`, priority: "0.75" })),
    ...videos.map((video) => ({ loc: `/videos/${video.slug}/`, priority: "0.70" })),
  ];
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${routes.map((route) => `  <url>
    <loc>${SITE_URL}${route.loc}</loc>
    <lastmod>${LASTMOD}</lastmod>
    <priority>${route.priority}</priority>
  </url>`).join("\n")}
</urlset>
`;
  fs.writeFileSync(path.join(ROOT, "sitemap.xml"), xml, "utf8");
}

updateIndex();
generatePages();
writeSitemap();
