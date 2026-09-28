const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const readJson = (file) => JSON.parse(fs.readFileSync(path.join(root, file), "utf8"));
const readText = (file) => fs.readFileSync(path.join(root, file), "utf8");
const write = (file, value) =>
  fs.writeFileSync(path.join(root, file), value.replace(/[ \t]+$/gm, ""));

const profile = readJson("data/profile.json");
const siteUrl = String(profile.siteUrl || "").replace(/\/$/, "");
const news = readJson("data/news.json").sort((a, b) => b.date.localeCompare(a.date));
const teaching = readJson("data/teaching.json");
const publications = parseBib(readText("data/publications.bib")).sort((a, b) => {
  const byYear = Number(b.year || 0) - Number(a.year || 0);
  return byYear || a.order - b.order;
});

const esc = (value = "") =>
  String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");

const attr = esc;
const heroSocialLabels = ["Email", "LinkedIn", "Google Scholar", "GitHub"];

function parseBib(source) {
  const entries = [];
  let i = 0;
  while (i < source.length) {
    const at = source.indexOf("@", i);
    if (at === -1) break;
    const brace = source.indexOf("{", at);
    if (brace === -1) break;
    const type = source.slice(at + 1, brace).trim().toLowerCase();
    let depth = 1;
    let j = brace + 1;
    while (j < source.length && depth > 0) {
      if (source[j] === "{") depth++;
      if (source[j] === "}") depth--;
      j++;
    }
    const body = source.slice(brace + 1, j - 1);
    const comma = body.indexOf(",");
    const key = body.slice(0, comma).trim();
    const fields = parseFields(body.slice(comma + 1));
    const raw = source.slice(at, j).trim();
    entries.push(normalizePublication({ order: entries.length, type, key, raw, ...fields }));
    i = j;
  }
  return entries;
}

function parseFields(input) {
  const fields = {};
  let i = 0;
  while (i < input.length) {
    while (/[,\s]/.test(input[i] || "")) i++;
    const nameStart = i;
    while (/[A-Za-z0-9_-]/.test(input[i] || "")) i++;
    const name = input.slice(nameStart, i).trim();
    if (!name) break;
    while (/[\s=]/.test(input[i] || "")) i++;

    let value = "";
    if (input[i] === "{") {
      let depth = 1;
      i++;
      const valueStart = i;
      while (i < input.length && depth > 0) {
        if (input[i] === "{") depth++;
        if (input[i] === "}") depth--;
        i++;
      }
      value = input.slice(valueStart, i - 1);
    } else if (input[i] === '"') {
      i++;
      const valueStart = i;
      while (i < input.length && input[i] !== '"') i++;
      value = input.slice(valueStart, i);
      i++;
    } else {
      const valueStart = i;
      while (i < input.length && input[i] !== ",") i++;
      value = input.slice(valueStart, i).trim();
    }
    fields[name.toLowerCase()] = value.replace(/\s+/g, " ").trim();
  }
  return fields;
}

function normalizePublication(publication) {
  const rawVenue =
    publication.venue ||
    publication.booktitle ||
    publication.journal ||
    publication.publisher ||
    "Publication";
  const venue = cleanVenue(rawVenue);
  const links = [];
  if (publication.doi) links.push({ label: "DOI", url: `https://doi.org/${publication.doi}` });
  if (publication.eprint && (publication.archiveprefix || "").toLowerCase() === "arxiv") {
    links.push({ label: "arXiv", url: `https://arxiv.org/abs/${publication.eprint}` });
  }
  if (publication.url) links.push({ label: "Link", url: publication.url });
  if (publication.code) links.push({ label: "Code", url: publication.code });
  if (publication.data) links.push({ label: "Data", url: publication.data });
  const labels = splitList(publication.labels);
  const allowedLabels = new Set(profile.research.publicationThemes || []);
  const unknownLabels = labels.filter((label) => !allowedLabels.has(label));
  if (!labels.length) {
    throw new Error(`Publication ${publication.key} has no research labels.`);
  }
  if (unknownLabels.length) {
    throw new Error(
      `Publication ${publication.key} uses labels outside the research agenda: ${unknownLabels.join(", ")}`
    );
  }

  return {
    ...publication,
    venue,
    labels,
    equalContributors: splitList(publication.equal_contributors),
    authorDisplay: publication.author_display,
    links,
    stamp: stampFor(venue)
  };
}

function cleanVenue(venue = "") {
  return String(venue)
    .replace(/\s+\d{4}\b/g, "")
    .replace(/\s+main\b/gi, "")
    .replace(/\s+/g, " ")
    .trim();
}

function splitList(value = "") {
  return String(value)
    .split(";")
    .map((item) => item.trim())
    .filter(Boolean);
}

function stampFor(venue = "") {
  const short = venue.match(/\b(EACL|CVPR|ICCV|ACL|EMNLP|NAACL)\b/i);
  return short ? short[1].toUpperCase() : venue.split(/\s+/).slice(0, 2).join(" ");
}

function page(main, options = {}) {
  const isHomePage = options.isHomePage === true;
  const isNewsPage = options.path === "/news.html";
  const homePrefix = isHomePage ? "" : "index.html";
  const anchor = (id) => `${homePrefix}#${id}`;
  const topHref = isHomePage ? "#top" : "index.html#top";
  const pageTitle = options.title ? `${profile.name} | ${options.title}` : `${profile.name} | ${profile.title}`;
  const pagePath = options.path || "/";
  const robotsDirective = options.robots || "index, follow";
  const shareMeta = siteUrl
    ? `\n    <link rel="canonical" href="${attr(`${siteUrl}${pagePath}`)}">\n    <meta property="og:url" content="${attr(`${siteUrl}${pagePath}`)}">\n    <meta property="og:image" content="${attr(`${siteUrl}/assets/social-preview.png`)}">\n    <meta property="og:image:width" content="1200">\n    <meta property="og:image:height" content="630">\n    <meta property="og:image:alt" content="Yu Wu, Doctoral Researcher at the University of Helsinki">\n    <meta name="twitter:card" content="summary_large_image">\n    <meta name="twitter:title" content="${attr(pageTitle)}">\n    <meta name="twitter:description" content="${attr(profile.description)}">\n    <meta name="twitter:image" content="${attr(`${siteUrl}/assets/social-preview.png`)}">\n    <meta name="twitter:image:alt" content="Yu Wu, Doctoral Researcher at the University of Helsinki">`
    : "";
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>${esc(pageTitle)}</title>
    <meta name="description" content="${attr(profile.description)}">
    <meta name="author" content="${attr(profile.name)}">
    <meta name="robots" content="${attr(robotsDirective)}">
    <meta name="color-scheme" content="light">
    <meta property="og:title" content="${attr(pageTitle)}">
    <meta property="og:description" content="${attr(profile.description)}">
    <meta property="og:type" content="website">
    <meta property="og:site_name" content="${attr(profile.name)}">
    <meta property="og:locale" content="en_US">
${shareMeta}
    <meta name="theme-color" content="#f4efe3">
    <link rel="icon" href="favicon.svg" type="image/svg+xml">
    <link rel="apple-touch-icon" href="assets/apple-touch-icon.png">
    <link rel="mask-icon" href="assets/wy-mark.svg" color="#5d241d">
    <link rel="manifest" href="site.webmanifest">
    <link rel="preload" href="assets/ma-shan-zheng.woff2" as="font" type="font/woff2" crossorigin>
    <link rel="stylesheet" href="styles.css?v=30">
  </head>
  <body id="top">
    <div class="grain" aria-hidden="true"></div>
    <header class="site-header">
      <a class="wordmark" href="${attr(topHref)}" aria-label="Back to ${attr(profile.name)} homepage">
        <img src="assets/wy-mark.svg" alt="">
        <span>${esc(profile.name)} · <b lang="zh-Hans">${esc(profile.chineseName)}</b></span>
      </a>
      <nav class="nav" aria-label="Primary navigation">
        <a href="${attr(anchor("research"))}">Research</a>
        <a href="${attr(anchor("education"))}">Education</a>
        <a href="${attr(anchor("news"))}">News</a>
        <a href="${attr(anchor("publications"))}">Publications</a>
        <a href="${attr(anchor("teaching"))}">Teaching</a>
      </nav>
    </header>
    <main>
${main}
    </main>
    <footer class="site-footer">
      <p>${esc(profile.name)} · <span lang="zh-Hans">${esc(profile.chineseName)}</span> · ${esc(profile.affiliation)}</p>
      <a class="top-link" href="${attr(topHref)}" aria-label="Back to top">↑</a>
    </footer>
    <!-- Cloudflare Web Analytics -->
    <script type="module" src="https://static.cloudflareinsights.com/beacon.min.js" data-cf-beacon='{"token":"91fb6ec8e1d04180b41a7f05e22f0056"}'></script>
    <!-- End Cloudflare Web Analytics -->
  </body>
</html>
`;
}

function homePage() {
  return page(`
      ${heroSection()}
      ${researchSection()}
      ${educationSection()}
      ${newsSection()}
      ${publicationsSection()}
      ${teachingSection()}
`, { isHomePage: true });
}

function heroSection() {
  return `<section class="hero" aria-labelledby="hero-title">
        <div class="hero-copy">
          <p class="kicker">${esc(profile.kicker)}</p>
          <h1 id="hero-title"><span>${esc(profile.name)}</span><em lang="zh-Hans">${esc(profile.chineseName)}</em></h1>
          <p class="subtitle">${esc(profile.subtitle)}</p>
          <p class="lede">${esc(profile.lede)}</p>
          <div class="hero-actions">
            <div class="hero-social" aria-label="Contact and profiles">
              ${heroSocialLabels.map(socialLink).join("")}
            </div>
          </div>
        </div>
        <aside class="profile-card" aria-label="Profile summary">
          <figure class="portrait-frame">
            <img src="${attr(profile.portrait)}" alt="${attr(profile.portraitAlt)}" width="1000" height="662" decoding="async">
          </figure>
          <div class="profile-copy">
            <p class="profile-role">${esc(profile.title)}</p>
            <p class="profile-group"><a href="${attr(profile.groupUrl)}">${esc(profile.group)}</a></p>
            <p class="profile-unit"><span>${esc(profile.department)}</span><span>${esc(profile.faculty)}</span></p>
            <p class="profile-affiliation">${esc(profile.affiliation)}</p>
            <p class="profile-programme"><a href="${attr(profile.programmeUrl)}">${esc(profile.programme)}</a><span>${esc(profile.discipline)}</span></p>
            <nav class="profile-identifiers" aria-label="Academic profiles">
              <a href="${attr(findLink("University profile"))}">University profile</a>
              <a href="${attr(findLink("ORCID"))}">ORCID</a>
            </nav>
          </div>
        </aside>
      </section>`;
}

function socialLink(label) {
  return `<a class="social-icon" href="${attr(findLink(label))}" aria-label="${attr(label)}" title="${attr(label)}">${socialIcon(label)}</a>`;
}

function socialIcon(label) {
  const icons = {
    Email: `<svg viewBox="0 0 24 24" aria-hidden="true"><rect width="20" height="16" x="2" y="4" rx="2"></rect><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"></path></svg>`,
    LinkedIn: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6Z"></path><rect width="4" height="12" x="2" y="9"></rect><circle cx="4" cy="4" r="2"></circle></svg>`,
    "Google Scholar": `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M21.42 10.92a1 1 0 0 0-.84-.92l-8-4a1 1 0 0 0-.9 0l-8 4a1 1 0 0 0 0 1.8l8 4a1 1 0 0 0 .9 0l3.43-1.72V19a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2v-4.94l5.55 2.78a1 1 0 0 0 .9 0l8-4a1 1 0 0 0 .97-1.92Z"></path><path d="M6 14v5"></path></svg>`,
    GitHub: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 22v-2a4.8 4.8 0 0 0-1-3.5c3.28-.36 6.72-1.61 6.72-7.25A5.64 5.64 0 0 0 19.22 5.3 5.07 5.07 0 0 0 19.08 1S17.92.64 15 2.6a13.38 13.38 0 0 0-7 0C5.08.64 3.92 1 3.92 1a5.07 5.07 0 0 0-.14 4.3 5.64 5.64 0 0 0-1.5 3.9c0 5.63 3.44 6.88 6.72 7.25A4.8 4.8 0 0 0 8 20v2"></path><path d="M9 18c-4.51 2-5-2-7-2"></path></svg>`
  };
  return icons[label] || "";
}

function researchSection() {
  const research = profile.research;
  const project = research.project;
  return `<section class="section" id="research" aria-labelledby="research-title">
        <header class="section-intro">
          <h2 id="research-title">${esc(research.title)}</h2>
        </header>
        <div class="research-overview">
          <p class="research-lead">${esc(research.overview)}</p>
        </div>
        <div class="research-areas">
          ${research.areas
            .map(
              (area, index) => `<article>
            <span>${String(index + 1).padStart(2, "0")}</span>
            <h3>${esc(area.title)}</h3>
            <p>${esc(area.description)}</p>
          </article>`
            )
            .join("")}
        </div>
        <div class="project-line">
          <span>Current project</span>
          <strong>
            <a href="${attr(project.url)}">${esc(project.fullName)} (${esc(project.name)})</a>
            <span class="project-funding">${esc(project.funding)}</span>
          </strong>
          <p><span class="project-focus-title">${esc(project.projectTitle)}</span>${esc(project.focus)}</p>
        </div>
      </section>`;
}

function publicationsSection() {
  const current = publications.filter((publication) => Number(publication.year) >= 2025);
  const earlier = publications.filter((publication) => Number(publication.year) < 2025);
  const equalLegend = publications.some((publication) => publication.equalContributors.length)
    ? `<p class="publication-legend">* Equal contribution</p>`
    : "";
  return `<section class="section" id="publications" aria-labelledby="publications-title">
        <header class="section-intro">
          <h2 id="publications-title">Publications</h2>
          ${equalLegend}
        </header>
        ${publicationGroup("Current research", current, false)}
        ${publicationGroup("Earlier research", earlier, true)}
      </section>`;
}

function publicationGroup(title, items, compact) {
  if (!items.length) return "";
  return `<section class="publication-group${compact ? " earlier-work" : ""}">
          <h3>${esc(title)}</h3>
          <div class="publication-list">
            ${items.map((publication) => publicationCard(publication, compact)).join("")}
          </div>
        </section>`;
}

function publicationCard(publication, compact) {
  const primaryLink =
    publication.links.find((link) => link.label === "DOI") ||
    publication.links.find((link) => link.label === "arXiv") ||
    publication.links[0];
  return `<article class="publication-card${compact ? " compact" : ""}">
              <div class="pub-stamp" aria-hidden="true">
                <span>${esc(publication.stamp)}</span>
                <small>${esc(publication.year)}</small>
              </div>
              <div class="pub-body">
                <div class="pub-labels" aria-label="Research themes">${publication.labels.map((label) => `<span>${esc(label)}</span>`).join("")}</div>
                <h4>${primaryLink ? `<a href="${attr(primaryLink.url)}">${esc(publication.title)}</a>` : esc(publication.title)}</h4>
                <p class="authors">${publication.authorDisplay ? highlightOwnName(publication.authorDisplay) : formatAuthors(publication.author, publication.equalContributors)}</p>
                ${publication.note ? `<p class="contribution"><span>Contribution</span>${esc(publication.note)}</p>` : ""}
                <div class="pub-footer">
                  <div class="publication-links">${publication.links
                    .map((link) => `<a href="${attr(link.url)}">${esc(link.label)}</a>`)
                    .join("")}</div>
                  <details><summary>BibTeX</summary><pre>${esc(publication.raw)}</pre></details>
                </div>
              </div>
            </article>`;
}

function formatAuthors(authors = "", equalContributors = []) {
  const equalNames = new Set(equalContributors.map((name) => displayName(name.trim()).toLowerCase()));
  return (
    authors
      .split(/\s+and\s+/)
      .map((name) => {
        const clean = displayName(name.trim());
        const marker = equalNames.has(clean.toLowerCase()) ? "*" : "";
        const rendered = `${esc(clean)}${marker}`;
        return /Yu\s+Wu/i.test(clean) ? `<strong>${rendered}</strong>` : rendered;
      })
      .join(", ") + "."
  );
}

function highlightOwnName(value = "") {
  return esc(value).replace(/Yu Wu/g, "<strong>Yu Wu</strong>");
}

function displayName(name) {
  const parts = name.split(",").map((part) => part.trim());
  return parts.length === 2 ? `${parts[1]} ${parts[0]}` : name;
}

function newsSection() {
  return `<section class="section" id="news" aria-labelledby="news-title">
        <header class="section-intro">
          <h2 id="news-title">Recent updates</h2>
        </header>
        <div class="news-list">
          ${news.slice(0, 5).map((item, index) => newsItem(item, { compact: index > 0 })).join("")}
        </div>
        <p class="section-more"><a href="news.html">View all news</a></p>
      </section>`;
}

function newsItem(item, options = {}) {
  const compact = options.compact === true;
  const target = options.archive ? `#${newsId(item)}` : `news.html#${newsId(item)}`;
  return `<article class="news-item${compact ? " compact" : ""}${item.featured ? " featured" : ""}" id="${attr(newsId(item))}">
            <div class="news-date">
              <time datetime="${attr(item.date)}">${formatDate(item.date)}</time>
              ${item.featured ? '<span class="news-mark">New</span>' : ""}
            </div>
            <div>
              <h3><a href="${attr(target)}">${esc(item.title)}</a></h3>
              ${compact ? "" : `<p>${esc(item.body)}</p>`}
              ${!compact && item.url ? `<p class="news-source"><a href="${attr(item.url)}">Source</a></p>` : ""}
            </div>
          </article>`;
}

function newsId(item) {
  return `news-${item.date}`;
}

function newsPage() {
  return page(`<section class="section news-page" id="news" aria-labelledby="news-title">
        <header class="section-intro">
          <h2 id="news-title">News</h2>
        </header>
        <div class="news-list news-archive">
          ${news.map((item) => newsItem(item, { archive: true })).join("")}
        </div>
      </section>`, { title: "News", path: "/news.html" });
}

function notFoundPage() {
  return page(`<section class="section" aria-labelledby="not-found-title">
        <header class="section-intro">
          <h1 id="not-found-title">Page not found</h1>
        </header>
        <div class="research-overview">
          <p class="research-lead">The page you requested is not available. <a href="index.html">Return to the homepage</a>.</p>
        </div>
      </section>`, { title: "Page not found", path: "/404.html", robots: "noindex, follow" });
}

function manifest() {
  return JSON.stringify(
    {
      name: `${profile.name} | ${profile.title}`,
      short_name: profile.name,
      description: profile.description,
      lang: "en",
      start_url: "./",
      display: "minimal-ui",
      background_color: "#f4efe3",
      theme_color: "#f4efe3",
      icons: [
        { src: "assets/icon-192.png", sizes: "192x192", type: "image/png" },
        { src: "assets/icon-512.png", sizes: "512x512", type: "image/png" }
      ]
    },
    null,
    2
  );
}

function robots() {
  return `User-agent: *\nAllow: /${siteUrl ? `\n\nSitemap: ${siteUrl}/sitemap.xml` : ""}\n`;
}

function sitemap() {
  const urls = ["/", "/news.html"];
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls
    .map((url) => `  <url><loc>${esc(`${siteUrl}${url}`)}</loc></url>`)
    .join("\n")}\n</urlset>\n`;
}

function teachingSection() {
  return `<section class="section" id="teaching" aria-labelledby="teaching-title">
        <header class="section-intro">
          <h2 id="teaching-title">Teaching and supervision</h2>
        </header>
        <div class="teaching-list">
          ${teaching.map(teachingItem).join("")}
        </div>
      </section>`;
}

function teachingItem(item) {
  return `<article class="teaching-item">
            <time>${esc(item.period)}</time>
            <div>
              <div class="teaching-meta"><span>${esc(item.type)}</span>${item.hours ? `<span>${esc(item.hours)}</span>` : ""}</div>
              <h3>${item.url ? `<a href="${attr(item.url)}">${esc(item.title)}</a>` : esc(item.title)}</h3>
              <p>${esc(item.description)}</p>
            </div>
          </article>`;
}

function educationSection() {
  return `<section class="section" id="education" aria-labelledby="education-title">
        <header class="section-intro">
          <h2 id="education-title">Education</h2>
        </header>
        <div class="education-grid">
          <div class="education-timeline">
            ${profile.education.map(educationItem).join("")}
          </div>
        </div>
      </section>`;
}

function educationItem(item) {
  return `<article class="education-entry">
            <time>${esc(item.period)}</time>
            <div class="education-copy">
              <h3>${esc(item.title)}</h3>
              <p class="education-place"><strong>${esc(item.place)}</strong></p>
              <p class="education-thesis"><span>Thesis:</span> <em>${esc(item.thesis)}</em></p>
            </div>
            ${item.logo ? `<img class="education-logo" src="${attr(item.logo)}" alt="${attr(item.logoAlt || item.place)} logo">` : ""}
          </article>`;
}

function formatDate(date) {
  return new Intl.DateTimeFormat("en", {
    year: "numeric",
    month: "short",
    day: "2-digit"
  }).format(new Date(`${date}T00:00:00Z`));
}

function findLink(label) {
  return profile.links.find((link) => link.label === label)?.url || "#";
}

write("index.html", homePage());
write("news.html", newsPage());
write("404.html", notFoundPage());
write("site.webmanifest", manifest());
write("robots.txt", robots());

if (siteUrl) {
  write("sitemap.xml", sitemap());
} else {
  fs.rmSync(path.join(root, "sitemap.xml"), { force: true });
}

for (const stalePage of ["publications.html", "teaching.html", "cv.html", "analytics.html"]) {
  fs.rmSync(path.join(root, stalePage), { force: true });
}

console.log("Built index.html");
