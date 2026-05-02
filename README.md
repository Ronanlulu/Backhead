# Backhead Journal Observer

A React + Vite app that can be deployed to GitHub Pages.

## Run locally

```bash
npm install
npm run dev
```

## Deploy to GitHub Pages

1. Create a new GitHub repository, for example `backhead`.
2. Upload all files in this folder to the repository.
3. Go to **Settings → Pages**.
4. Under **Build and deployment**, choose **GitHub Actions**.
5. Push to the `main` branch.
6. Wait for the deploy action to finish.
7. Open the Pages URL shown by GitHub.

## Important security note

This app asks users to enter an OpenRouter API key in the browser. Do not hardcode your own API key into the source code before pushing it to GitHub. Public GitHub repositories are visible to others.
