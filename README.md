# Yu Wu personal homepage

A lightweight, single-page academic homepage for GitHub Pages. Content is
generated from four source files:

- `data/profile.json`: profile, research agenda, background, and links.
- `data/news.json`: news entries shown on the homepage and `news.html`.
- `data/teaching.json`: teaching and supervision records.
- `data/publications.bib`: publications, links, contribution notes, and a
  controlled set of research labels derived from the research agenda.

The allowed publication labels live in `research.publicationThemes` inside
`data/profile.json`. The build stops if a BibTeX entry uses a label outside
that Bio-derived vocabulary.

## Update the site

Edit the relevant data file, then run:

```sh
npm run verify
```

If Node is not available on the shell path, use the Node executable bundled
with Codex:

```sh
/Users/wuyu/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node scripts/build.js
```

The build regenerates the site pages, 404 page, web manifest, and robots file.
Open `index.html` directly in a browser to preview the site; a local server is
not required.

## Share preview

`assets/social-preview.png` is the 1200 x 630 social sharing image. After the
public URL is known, set `siteUrl` in `data/profile.json` (for example,
`https://your-name.github.io`). The build will then add canonical, Open Graph,
and large Twitter-card metadata automatically. Run `npm run check:release`
before publishing; it requires this URL and validates the generated sitemap and
sharing metadata.

The Chinese display name uses a two-glyph subset of Ma Shan Zheng, licensed
under the SIL Open Font License in `assets/OFL-MaShanZheng.txt`.

## Design notes

The site takes its academic information architecture and publication-oriented
spirit from [al-folio](https://github.com/alshedivat/al-folio), while its
paper-like palette, typographic restraint, and humanistic editorial tone draw
inspiration from [Tufte Jekyll](https://clayh53.github.io/tufte-jekyll/).

It was developed collaboratively by Yu Wu and Codex: the research narrative,
content structure, and visual direction were shaped through an ongoing design
conversation, with Codex implementing the resulting static site and build
tooling. All content has been carefully reviewed to ensure that it accurately reflects my intended meaning.

## Publish

1. Create a GitHub repository and add it as this folder's `origin` remote.
2. Choose the public address and set it as `siteUrl` in `data/profile.json`.
   For a user site, this will normally be `https://your-github-name.github.io`.
3. In the repository's **Settings → Pages**, set the source to **GitHub
   Actions**.
4. Run `npm run check:release`, commit the generated files, and push `main`.

The workflow validates every pull request and rebuilds and deploys `main` to
GitHub Pages. It intentionally refuses to deploy if the public URL has not
been configured.
