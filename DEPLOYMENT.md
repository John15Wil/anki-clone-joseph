# Anki Clone Deployment Guide

This document provides instructions for deploying the Anki Clone application to various platforms.

## Pre-built Application

The project has already been built and is ready for deployment in the `dist/` directory.

## Deploy to Vercel (Recommended)

### Method 1: Using Vercel CLI
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy to Vercel
vercel --prod
```

### Method 2: Vercel Dashboard
1. Go to [vercel.com](https://vercel.com)
2. Sign up/login with GitHub/Google
3. Click "New Project"
4. Choose "Git Repository" or "Upload Folder"
5. Upload the project folder
6. Vercel will auto-detect it's a React/Vite app
7. Click "Deploy"

### Environment Variables for Vercel
If you want to enable Supabase cloud sync:
1. Go to Project Settings → Environment Variables
2. Add:
   - `VITE_SUPABASE_URL`: your Supabase project URL
   - `VITE_SUPABASE_ANON_KEY`: your Supabase anonymous key

## Deploy to Netlify

### Method 1: Drag and Drop
1. Go to [app.netlify.com](https://app.netlify.com)
2. Drag and drop the `dist/` folder onto the deployment area
3. Wait for deployment to complete

### Method 2: Netlify CLI
```bash
# Install Netlify CLI
npm i -g netlify-cli

# Deploy
netlify deploy --prod --dir=dist
```

## Deploy to GitHub Pages

```bash
# Add GitHub remote (replace with your repo URL)
git remote add origin https://github.com/USERNAME/anki-clone.git

# Push to GitHub
git push -u origin main

# Go to repository Settings → Pages
# Source: Deploy from a branch
# Branch: main / (root)
# Click Save
```

## Deploy to Cloudflare Pages

1. Go to [dash.cloudflare.com/pages](https://dash.cloudflare.com/pages)
2. Click "Create a project"
3. Choose "Upload assets"
4. Upload the `dist/` folder
5. Click "Deploy site"

## What's Deployed

✅ **Complete PWA**: Works offline, installable on all devices
✅ **Full Features**: All learning modes, statistics, rich text editing
✅ **Responsive Design**: Mobile, tablet, desktop optimized
✅ **Offline First**: Works without internet using IndexedDB
✅ **Cloud Sync**: Optional Supabase integration

## Performance Notes

- Bundle size: ~2MB (can be optimized with code splitting)
- Service Worker caching enabled
- Google Fonts cached
- PWA manifest configured

## Post-Deployment Checklist

1. ✅ Test the deployed URL
2. ✅ Install as PWA on mobile device
3. ✅ Test offline functionality
4. ✅ Verify all features work
5. Optional: Configure Supabase for cloud sync

## Support

The application works immediately after deployment without any configuration. All core features (offline learning, statistics, PWA) work out of the box.

## License

This project is open source. Feel free to modify and redistribute.