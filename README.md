# Yu Wu personal homepage

A lightweight static academic homepage for GitHub Pages.

## Preview locally

Open `index.html` directly in a browser, or run a small static server:

```sh
python3 -m http.server 8000
```

Then visit `http://localhost:8000`.

## Publish on GitHub Pages

1. Create a GitHub repository named `<your-github-username>.github.io`.
2. Push these files to the repository's `main` branch.
3. In GitHub, open Settings -> Pages and publish from the `main` branch root.

The site intentionally avoids build tools so it can be maintained as plain HTML,
CSS, and a tiny script.
