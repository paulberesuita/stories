# Story Generator

A visual story generator that creates 4-panel Disney Pixar-style stories from text prompts using OpenAI's image generation API.

## Features

- Generate 4 sequential story panels from a text prompt
- Disney Pixar cartoon art style for all generated images
- Swipeable card stack UI with drag gestures
- Save stories to cloud storage (Cloudflare D1 + R2)
- Sample story prompts for quick inspiration
- API key management via settings modal
- Fully responsive design

## Tech Stack

- **Frontend**: Vanilla HTML, CSS, JavaScript
- **Styling**: Tailwind CSS (CDN)
- **Animations**: Motion.dev
- **Image Generation**: OpenAI Images API (gpt-image-1.5)
- **Backend**: Cloudflare Pages Functions
- **Database**: Cloudflare D1 (SQLite)
- **Storage**: Cloudflare R2 (images)

## Project Structure

```
stories/
├── index.html              # Main HTML file
├── styles.css              # Custom CSS styles
├── wrangler.toml           # Cloudflare configuration
├── js/
│   ├── main.js             # App initialization and event handling
│   ├── api.js              # OpenAI API integration
│   ├── cards.js            # Card rendering and stack management
│   ├── drag.js             # Mouse/touch drag interactions
│   ├── state.js            # Application state management
│   ├── config.js           # Configuration and constants
│   └── animations.js       # Motion.dev animations
├── functions/
│   └── api/
│       ├── stories.js      # Save/retrieve stories API
│       └── images/
│           └── [[path]].js # Serve images from R2
└── migrations/
    └── 0001_create_tables.sql  # D1 database schema
```

## Local Development

1. Open `index.html` in a browser (or use a local server)
2. Click the settings icon (gear) to enter your OpenAI API key
3. Enter a story idea or click a sample prompt
4. Click "Create" to generate your story

For full functionality with saving:

```bash
# Install wrangler
npm install -g wrangler

# Run locally with D1/R2 bindings
npx wrangler pages dev .
```

## Database Schema

**stories table:**
- `id` (TEXT, PRIMARY KEY) - UUID
- `prompt` (TEXT) - Original user prompt
- `created_at` (TEXT) - ISO timestamp

**scenes table:**
- `id` (TEXT, PRIMARY KEY) - UUID
- `story_id` (TEXT, FK) - Reference to stories.id
- `scene_number` (INTEGER) - 1-4
- `caption` (TEXT) - Scene description
- `image_key` (TEXT) - R2 object key
- `created_at` (TEXT) - ISO timestamp

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/stories` | List all saved stories |
| GET | `/api/stories?id=xxx` | Get story with all scenes |
| POST | `/api/stories` | Save a new story |
| GET | `/api/images/:path` | Serve image from R2 |

## Deployment

Deployed on Cloudflare Pages with D1 and R2 bindings.

```bash
# Deploy to Cloudflare Pages
npx wrangler pages deploy . --project-name=stories
```

### Cloudflare Resources

- **D1 Database**: `stories-db`
- **R2 Bucket**: `stories-images`
- **Pages Project**: `stories`

### First-time Setup

```bash
# Create D1 database
npx wrangler d1 create stories-db

# Create R2 bucket
npx wrangler r2 bucket create stories-images

# Run migrations
npx wrangler d1 execute stories-db --file=migrations/0001_create_tables.sql --remote

# Add bindings in Cloudflare Dashboard:
# Workers & Pages > stories > Settings > Bindings
# - D1: DB -> stories-db
# - R2: IMAGES -> stories-images
```

## Configuration

Key settings in `js/config.js`:

- `TEST_MODE` - Set to `true` to use hardcoded test images
- `SCENE_COUNT` - Number of story panels (default: 4)
- `SWIPE_THRESHOLD` - Pixels needed to trigger card swipe
- `IMAGE_MODEL` - OpenAI model (`gpt-image-1.5`)
- `IMAGE_SIZE` - Generated image size (`1024x1024`)

## Live Demo

https://stories-cc6.pages.dev
