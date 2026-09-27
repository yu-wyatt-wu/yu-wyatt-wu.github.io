const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const release = process.argv.includes("--release");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const exists = (file) => fs.existsSync(path.join(root, file));
const profile = JSON.parse(read("data/profile.json"));
const requiredFiles = [
  "index.html",
  "news.html",
  "404.html",
  "robots.txt",
  "site.webmanifest",
  "styles.css",
  "favicon.svg",
  "assets/portrait.jpg",
  "assets/wy-mark.svg",
  "assets/apple-touch-icon.png",
  "assets/icon-192.png",
  "assets/icon-512.png",
  "assets/social-preview.png",
  "assets/ma-shan-zheng.woff2"
];

for (const file of requiredFiles) {
  if (!exists(file)) throw new Error(`Missing required file: ${file}`);
}

JSON.parse(read("site.webmanifest"));

for (const page of ["index.html", "news.html", "404.html"]) {
  const html = read(page);
  if (!html.startsWith("<!doctype html>")) throw new Error(`${page} is missing a doctype.`);
  if (/\b(undefined|null)\b/.test(html)) throw new Error(`${page} contains an unresolved value.`);

  for (const match of html.matchAll(/(?:href|src)="([^"]+)"/g)) {
    const value = match[1];
    if (/^(https?:|mailto:|#)/.test(value)) continue;
    const file = value.split("#")[0].split("?")[0];
    if (file && !exists(file)) throw new Error(`${page} references a missing file: ${value}`);
  }
}

const siteUrl = String(profile.siteUrl || "").replace(/\/$/, "");
if (release) {
  if (!/^https:\/\/[^\s]+$/.test(siteUrl)) {
    throw new Error("Release check requires a public https siteUrl in data/profile.json.");
  }
  if (!exists("sitemap.xml")) throw new Error("Release check requires sitemap.xml.");
  for (const page of ["index.html", "news.html"]) {
    const html = read(page);
    if (!html.includes(`https://`)) throw new Error(`${page} is missing public share metadata.`);
    if (!html.includes(`${siteUrl}/assets/social-preview.png`)) {
      throw new Error(`${page} is missing the share preview URL.`);
    }
  }
}

console.log(release ? "Release check passed" : "Site check passed");
