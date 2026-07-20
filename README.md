# Yu Wu personal homepage

A lightweight static academic homepage for GitHub Pages. The site keeps the
custom visual design while generating content from structured data files.

## Edit content

- `data/profile.json`: identity, research directions, links, and current work.
- `data/news.json`: dated news items.
- `data/publications.bib`: publication source data; custom fields such as
  `venue`, `tags`, `code`, `data`, `note`, and `selected` control the cards.
- `data/activities.json`: CV, teaching, talks, training, service, and awards.
- `data/analytics.json`: privacy-friendly aggregate analytics placeholders.

## Build

Use the bundled Node runtime if `node` is not on your PATH:

```sh
/Users/wuyu/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node scripts/build.js
```

This regenerates:

- `index.html`
- `news.html`
- `publications.html`
- `teaching.html`
- `cv.html`
- `analytics.html`

## Preview locally

```sh
python3 -m http.server 8000
```

Then visit `http://localhost:8000`.

## Analytics

The site does not store raw visitor IP addresses. To enable real aggregate
traffic stats, set either `plausibleDomain` or `cloudflareToken` in
`data/profile.json`, then rebuild. Keep any public analytics display aggregated
at country/city or broader levels.

## Publish on GitHub Pages

1. Create a GitHub repository named `<your-github-username>.github.io`.
2. Push the generated HTML files and data files to the repository's `main`
   branch.
3. In GitHub, open Settings -> Pages and choose GitHub Actions as the source.

The included workflow at `.github/workflows/pages.yml` runs the build script and
deploys the generated site whenever `main` is pushed.
