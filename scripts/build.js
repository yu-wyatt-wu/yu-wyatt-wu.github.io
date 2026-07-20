const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const readJson = (file) => JSON.parse(fs.readFileSync(path.join(root, file), "utf8"));
const readText = (file) => fs.readFileSync(path.join(root, file), "utf8");
const write = (file, html) => fs.writeFileSync(path.join(root, file), html.replace(/[ \t]+$/gm, ""));

const profile = readJson("data/profile.json");
const news = readJson("data/news.json").sort((a, b) => b.date.localeCompare(a.date));
const activities = readJson("data/activities.json");
const analytics = readJson("data/analytics.json");
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
const slug = (value = "") =>
  String(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

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
    entries.push(normalizePub({ order: entries.length, type, key, raw, ...fields }));
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

function normalizePub(pub) {
  const venue = pub.venue || pub.booktitle || pub.journal || pub.publisher || "Publication";
  const tags = splitList(pub.tags);
  const links = [];
  if (pub.doi) links.push({ label: "DOI", url: `https://doi.org/${pub.doi}` });
  if (pub.eprint && (pub.archiveprefix || "").toLowerCase() === "arxiv") {
    links.push({ label: "arXiv", url: `https://arxiv.org/abs/${pub.eprint}` });
  }
  if (pub.url) links.push({ label: "Link", url: pub.url });
  if (pub.code) links.push({ label: "Code", url: pub.code });
  if (pub.data) links.push({ label: "Data", url: pub.data });
  return {
    ...pub,
    venue,
    tags,
    links,
    selected: String(pub.selected || "").toLowerCase() === "true",
    stamp: stampFor(venue),
    kind: pub.type === "inproceedings" ? "Conference paper" : "Preprint"
  };
}

function splitList(value = "") {
  return String(value)
    .split(";")
    .map((item) => item.trim())
    .filter(Boolean);
}

function stampFor(venue = "") {
  if (/nlp4dh/i.test(venue)) return "DH / NLP";
  const short = venue.match(/\b(EACL|CVPR|ICCV|ACL|EMNLP|NAACL)\b/i);
  return short ? short[1].toUpperCase() : venue.split(/\s+/).slice(0, 2).join(" ");
}

function page({ title, description = profile.description, active, main, bodyClass = "" }) {
  const analyticsScript = analyticsSnippet();
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>${esc(title)}</title>
    <meta name="description" content="${attr(description)}">
    <meta name="color-scheme" content="light">
    <meta property="og:title" content="${attr(title)}">
    <meta property="og:description" content="${attr(description)}">
    <meta property="og:type" content="website">
    <link rel="stylesheet" href="styles.css">
    ${analyticsScript}
  </head>
  <body class="${attr(bodyClass)}">
    <div class="grain" aria-hidden="true"></div>
    <header class="site-header">
      <a class="wordmark" href="index.html" aria-label="${attr(profile.name)} homepage"><span>${esc(profile.name)} · ${esc(profile.chineseName)}</span></a>
      <nav class="nav" aria-label="Primary navigation">
        ${navLink("index.html", "Home", active)}
        ${navLink("news.html", "News", active)}
        ${navLink("publications.html", "Publications", active)}
        ${navLink("teaching.html", "Teaching", active)}
        ${navLink("cv.html", "CV", active)}
        ${navLink("analytics.html", "Analytics", active)}
      </nav>
    </header>
    <main>
${main}
    </main>
    <footer class="site-footer">
      <p>${esc(profile.name)} · ${esc(profile.chineseName)} · University of Helsinki</p>
      <button class="top-button" type="button" aria-label="Back to top">↑</button>
    </footer>
    <script src="script.js"></script>
  </body>
</html>
`;
}

function navLink(href, label, active) {
  const isActive = path.basename(href) === active;
  return `<a href="${href}"${isActive ? ' aria-current="page"' : ""}>${label}</a>`;
}

function analyticsSnippet() {
  const plausible = profile.analytics?.plausibleDomain;
  const cloudflare = profile.analytics?.cloudflareToken;
  if (plausible) {
    return `<script defer data-domain="${attr(plausible)}" src="https://plausible.io/js/script.js"></script>`;
  }
  if (cloudflare) {
    return `<script defer src="https://static.cloudflareinsights.com/beacon.min.js" data-cf-beacon='{"token":"${attr(cloudflare)}"}'></script>`;
  }
  return "";
}

function homePage() {
  const selected = publications.filter((pub) => pub.selected).slice(0, 4);
  return page({
    title: `${profile.name} | ${profile.title}`,
    active: "index.html",
    main: `
      <section class="hero" aria-labelledby="hero-title">
        <div class="hero-copy">
          <p class="kicker">${esc(profile.kicker)}</p>
          <h1 id="hero-title"><span>${esc(profile.name)}</span><em>${esc(profile.chineseName)}</em></h1>
          <p class="subtitle">${esc(profile.subtitle)}</p>
          <p class="lede">${esc(profile.lede)}</p>
          <div class="hero-actions" aria-label="Primary links">
            <a href="publications.html">Selected publications</a>
            <a href="cv.html">CV</a>
            <a href="${attr(profile.links[0].url)}">University profile</a>
          </div>
        </div>
        <aside class="folio-card" aria-label="Profile summary">
          <div class="folio-mark" aria-hidden="true"><span>${esc(profile.initials)}</span></div>
          <dl>
            <div><dt>Affiliation</dt><dd>${esc(profile.affiliation)}</dd></div>
            <div><dt>Doctoral programme</dt><dd>${esc(profile.programme)}</dd></div>
            <div><dt>Research focus</dt><dd>${esc(profile.researchFocus)}</dd></div>
            <div><dt>ORCID</dt><dd><a href="${attr(findLink("ORCID"))}">${esc(orcidId())}</a></dd></div>
          </dl>
        </aside>
      </section>
      ${aboutSection()}
      ${newsPreview(news.slice(0, 3))}
      ${researchSection()}
      ${currentWorkSection()}
      ${publicationsSection(selected, "Selected work", "publications.html")}
      ${briefCvSection()}
      ${contactSection()}
`
  });
}

function aboutSection() {
  return `
      <section class="section intro-grid" aria-labelledby="about-title">
        <div><p class="section-label">About</p><h2 id="about-title">${esc(profile.aboutTitle)}</h2></div>
        <div class="prose">${profile.about.map((p) => `<p>${esc(p)}</p>`).join("")}</div>
      </section>`;
}

function newsPreview(items) {
  return `
      <section class="section" id="news" aria-labelledby="news-title">
        <div class="section-heading">
          <p class="section-label">News</p>
          <h2 id="news-title">Recent notes</h2>
        </div>
        <div class="news-list compact-list">
          ${items.map(newsItem).join("")}
        </div>
        <p class="section-link"><a href="news.html">All news</a></p>
      </section>`;
}

function researchSection() {
  return `
      <section class="section" id="research" aria-labelledby="research-title">
        <div class="section-heading">
          <p class="section-label">Research</p>
          <h2 id="research-title">Research directions</h2>
        </div>
        <div class="research-list">
          ${profile.researchDirections
            .map(
              (item, index) => `<article>
            <span class="number">${["I", "II", "III", "IV"][index] || index + 1}</span>
            <h3>${esc(item.title)}</h3>
            <p>${esc(item.description)}</p>
          </article>`
            )
            .join("")}
        </div>
      </section>`;
}

function currentWorkSection() {
  const work = profile.currentWork;
  return `
      <section class="section project-panel" id="projects" aria-labelledby="projects-title">
        <div>
          <p class="section-label">${esc(work.label)}</p>
          <h2 id="projects-title">${esc(work.title)}</h2>
          <p class="prose">${esc(work.description)}</p>
        </div>
        <div class="side-note">
          <p>${esc(work.note)}</p>
          ${work.links.map((link) => `<a href="${attr(link.url)}">${esc(link.label)}</a>`).join("")}
          <span>${esc(work.next)}</span>
        </div>
      </section>`;
}

function publicationsPage() {
  return page({
    title: `Publications | ${profile.name}`,
    active: "publications.html",
    main: pageHero("Publications", "Selected work", "Generated from BibTeX, grouped by year, with links and expandable citations.") + publicationsSection(publications, "All publications")
  });
}

function publicationsSection(items, heading, moreHref = "") {
  return `
      <section class="section publications-section" id="publications" aria-labelledby="publications-title">
        <div class="section-heading">
          <p class="section-label">Publications</p>
          <h2 id="publications-title">${esc(heading)}</h2>
        </div>
        <div class="publication-year" aria-label="Publications grouped by year">
          ${groupedByYear(items)
            .map(([year, pubs]) => pubs.map((pub, index) => `${index === 0 ? `<p class="year">${esc(year)}</p>` : '<p class="year ghost-year" aria-hidden="true"></p>'}${publicationCard(pub)}`).join(""))
            .join("")}
        </div>
        ${moreHref ? `<p class="section-link"><a href="${moreHref}">All publications</a></p>` : ""}
      </section>`;
}

function groupedByYear(items) {
  const groups = new Map();
  for (const item of items) {
    const year = item.year || "Undated";
    if (!groups.has(year)) groups.set(year, []);
    groups.get(year).push(item);
  }
  return [...groups.entries()].sort((a, b) => Number(b[0]) - Number(a[0]));
}

function publicationCard(pub) {
  const meta = [pub.venue, ...pub.tags].filter(Boolean);
  return `
          <article class="publication-card${pub.selected ? " featured" : ""}">
            <div class="pub-stamp" aria-hidden="true"><span>${esc(pub.stamp)}</span><small>${esc(pub.year)}</small></div>
            <div class="pub-body">
              <div class="pub-meta">${meta.map((tag) => `<span>${esc(tag)}</span>`).join("")}</div>
              <h3>${esc(pub.title)}</h3>
              <p class="authors">${formatAuthors(pub.author)}</p>
              ${pub.note ? `<p class="pub-note">${esc(pub.note)}</p>` : ""}
              <div class="pub-footer">
                <div class="links">${pub.links.map((link) => `<a href="${attr(link.url)}">${esc(link.label)}</a>`).join("")}</div>
                <details><summary>BibTeX</summary><pre>${esc(pub.raw)}</pre></details>
              </div>
            </div>
          </article>`;
}

function formatAuthors(authors = "") {
  return authors
    .split(/\s+and\s+/)
    .map((name) => {
      const clean = displayName(name.trim());
      return /Yu\s+Wu/i.test(clean) ? `<strong>${esc(clean)}</strong>` : esc(clean);
    })
    .join(", ") + ".";
}

function displayName(name) {
  const parts = name.split(",").map((part) => part.trim());
  return parts.length === 2 ? `${parts[1]} ${parts[0]}` : name;
}

function newsPage() {
  return page({
    title: `News | ${profile.name}`,
    active: "news.html",
    main: pageHero("News", "Recent notes", "Updates on papers, presentations, teaching, and project milestones.") + `
      <section class="section">
        <div class="news-list">${news.map(newsItem).join("")}</div>
      </section>`
  });
}

function newsItem(item) {
  return `<article class="news-item">
    <time datetime="${attr(item.date)}">${formatDate(item.date)}</time>
    <div>
      <h3>${item.url ? `<a href="${attr(item.url)}">${esc(item.title)}</a>` : esc(item.title)}</h3>
      <p>${esc(item.body)}</p>
      ${item.tags?.length ? `<div class="pub-meta">${item.tags.map((tag) => `<span>${esc(tag)}</span>`).join("")}</div>` : ""}
    </div>
  </article>`;
}

function teachingPage() {
  const teaching = [...(activities.teaching || []), ...(activities.training || [])];
  return page({
    title: `Teaching | ${profile.name}`,
    active: "teaching.html",
    main: pageHero("Teaching", "Courses, supervision, and training", "Teaching activities, student supervision, and doctoral training.") + `
      <section class="section cv-grid">
        <div><p class="section-label">Teaching</p><h2>Teaching and supervision</h2></div>
        <div class="timeline">${teaching.map(timelineItem).join("") || emptyState("Teaching entries will appear here.")}</div>
      </section>`
  });
}

function cvPage() {
  const selectedPubs = publications.slice(0, 6);
  return page({
    title: `CV | ${profile.name}`,
    active: "cv.html",
    bodyClass: "cv-page",
    main: pageHero("CV", `${profile.name} · ${profile.chineseName}`, "A structured curriculum vitae generated from the same data used by the homepage.") + `
      <section class="section cv-tools">
        <button class="print-button" type="button" onclick="window.print()">Print / Save as PDF</button>
      </section>
      ${cvSection("Appointments", activities.experience)}
      ${cvSection("Education", activities.education)}
      ${cvSection("Teaching", activities.teaching)}
      ${cvSection("Talks", activities.talks)}
      ${cvSection("Training", activities.training)}
      <section class="section cv-grid">
        <div><p class="section-label">Publications</p><h2>Selected publications</h2></div>
        <div class="cv-publications">${selectedPubs.map((pub) => `<p>${formatAuthors(pub.author)} ${esc(pub.title)}. <em>${esc(pub.venue)}</em>, ${esc(pub.year)}.</p>`).join("")}</div>
      </section>
      ${contactSection()}`
  });
}

function cvSection(title, items = []) {
  return `
      <section class="section cv-grid">
        <div><p class="section-label">CV</p><h2>${esc(title)}</h2></div>
        <div class="timeline">${items.map(timelineItem).join("") || emptyState(`${title} entries will appear here.`)}</div>
      </section>`;
}

function timelineItem(item) {
  return `<article>
    <time>${esc(item.period)}</time>
    <h3>${esc(item.title)}</h3>
    <p>${[item.place, item.description].filter(Boolean).map(esc).join(" · ")}</p>
  </article>`;
}

function briefCvSection() {
  const items = [
    ...(activities.experience || []),
    ...(activities.education || []),
    ...(activities.teaching || []).slice(0, 1)
  ].slice(0, 4);
  return `
      <section class="section cv-grid" id="cv" aria-labelledby="cv-title">
        <div><p class="section-label">CV</p><h2 id="cv-title">Brief academic record</h2></div>
        <div class="timeline">${items.map(timelineItem).join("")}</div>
      </section>`;
}

function analyticsPage() {
  return page({
    title: `Analytics | ${profile.name}`,
    active: "analytics.html",
    main: pageHero("Analytics", "Privacy-friendly visits", "Aggregate traffic notes and location-level visualization. This site does not store full visitor IP addresses.") + `
      <section class="section analytics-grid">
        ${analytics.summary.map((item) => `<article class="stat-card"><span>${esc(item.label)}</span><strong>${esc(item.value)}</strong></article>`).join("")}
      </section>
      <section class="section cv-grid">
        <div><p class="section-label">Locations</p><h2>Visit geography</h2></div>
        <div class="bar-list">${barList(analytics.locations)}</div>
      </section>
      <section class="section cv-grid">
        <div><p class="section-label">Trend</p><h2>Traffic overview</h2></div>
        <div class="bar-list">${barList(analytics.trend, "period")}</div>
      </section>
      <section class="section"><p class="prose">${esc(analytics.note)}</p></section>`
  });
}

function barList(items, labelKey = "place") {
  const max = Math.max(...items.map((item) => Number(item.visits)), 1);
  return items
    .map((item) => {
      const width = Math.max(4, (Number(item.visits) / max) * 100);
      return `<div class="bar-row"><span>${esc(item[labelKey])}</span><div><i style="width: ${width}%"></i></div><strong>${esc(item.visits)}</strong></div>`;
    })
    .join("");
}

function contactSection() {
  return `
      <section class="section contact" id="contact" aria-labelledby="contact-title">
        <div><p class="section-label">Contact</p><h2 id="contact-title">Profiles and links</h2></div>
        <div class="contact-links">${profile.links.map((link) => `<a href="${attr(link.url)}">${esc(link.label)}</a>`).join("")}</div>
      </section>`;
}

function pageHero(label, title, description) {
  return `
      <section class="section page-title">
        <p class="section-label">${esc(label)}</p>
        <h1>${esc(title)}</h1>
        <p class="lede">${esc(description)}</p>
      </section>`;
}

function formatDate(date) {
  return new Intl.DateTimeFormat("en", { year: "numeric", month: "short", day: "2-digit" }).format(new Date(`${date}T00:00:00Z`));
}

function findLink(label) {
  return profile.links.find((link) => link.label === label)?.url || "#";
}

function orcidId() {
  return findLink("ORCID").replace("https://orcid.org/", "");
}

function emptyState(text) {
  return `<p class="empty-state">${esc(text)}</p>`;
}

write("index.html", homePage());
write("publications.html", publicationsPage());
write("news.html", newsPage());
write("teaching.html", teachingPage());
write("cv.html", cvPage());
write("analytics.html", analyticsPage());

console.log("Built index.html, publications.html, news.html, teaching.html, cv.html, analytics.html");
