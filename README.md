# Story Generator

A simple, single-page web app that generates a 4-panel visual story based on a user prompt using OpenAI's Images API.

## Features

- Generate 4 sequential story panels from a text prompt
- Minimalist, clean UI inspired by Linear/Vercel
- Sequential image generation with progress tracking
- API key stored securely in browser localStorage
- Fully responsive design

## Tech Stack

- Vanilla HTML, CSS, and JavaScript
- OpenAI Images API
- No build tools or frameworks required

## Usage

1. Open `index.html` in a browser
2. Enter your OpenAI API key (saved automatically in localStorage)
3. Enter a story idea
4. Click "Generate Story" and watch the 4 scenes appear sequentially

## Deployment

This app is deployed on Cloudflare Pages as a static site.

### Cloudflare Pages Configuration

- **Framework preset**: None
- **Build command**: (leave empty)
- **Build output directory**: `/` (root)
- **Root directory**: `/` (root)

All API calls happen client-side directly from the browser to OpenAI's API.
