# AI CPGRAMS Local — Bengaluru Citizen Grievance Portal

A production-ready, AI-powered Citizen Grievance Redressal Portal for Bengaluru municipal issues (BBMP, BWSSB, BESCOM). Built with Next.js 14 App Router, Tailwind CSS, and Leaflet.js.

## Features

### 4-Step Citizen Workflow
1. **Describe & Locate** — Voice recording (mic), text input, or 1-click demo presets for Water Leak / Pothole / Garbage scenarios
2. **AI Analysis** — Classifies department, urgency, and generates a formal 2-sentence summary
3. **Review & Edit** — Editable AI summary, department badge routing, advisory card for missing details
4. **Submit** — Generates a reference ID, with receipt download

### Key Capabilities
- 🎙️ **Voice Recorder** — Record audio or upload MP3/WAV/M4A, with animated waveform visualization
- 🗺️ **4-Layer Location Engine** — Browser GPS, EXIF metadata from photos, AI NLP text extraction, interactive draggable Leaflet map
- 🤖 **AI Analysis** — Uses OpenAI `gpt-4o-mini` when key is set; falls back to smart keyword heuristic (fully functional without API key)
- 🔍 **Deduplication** — Checks against seeded grievances; shows duplicate banner with "+1 Upvote" button
- 💡 **Advisory Card** — Non-blocking guidance for missing details (never blocks submission)
- 📶 **Offline Queue** — IndexedDB-powered offline filing with auto-sync when back online
- 🌐 **Multilingual** — English, Kannada, Hindi, Tamil, Hinglish

### Pre-seeded Demo Data (Bengaluru real locations)
| ID | Category | Location | Upvotes |
|---|---|---|---|
| GRV-001 | Water Supply | Koramangala 10th Main (12.9344°N, 77.6251°E) | 14 |
| GRV-002 | Roads | Bellandur - Columbia Asia Hospital (12.9279°N, 77.6801°E) | 32 |
| GRV-003 | Sanitation | Indiranagar Metro Station (12.9784°N, 77.6386°E) | 8 |

## Getting Started

### Prerequisites
- Node.js 18+
- npm

### Installation

```bash
npm install
```

### Development

```bash
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000).

### With OpenAI (optional)

Create a `.env.local` file:

```env
OPENAI_API_KEY=sk-...your-key-here...
```

Without this key, the app uses a fast local heuristic that correctly classifies Water, Roads, Sanitation, Streetlight, and Drainage issues.

### Production Build

```bash
npm run build
npm start
```

### Deploy to Vercel

Click **Deploy** — no configuration needed. Optionally add `OPENAI_API_KEY` in Vercel Environment Variables.

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new)

## File Structure

```
├── app/
│   ├── layout.tsx              # Root layout with Leaflet CSS
│   ├── globals.css             # Civic blue theme + animations
│   ├── page.tsx                # Main 4-step citizen portal
│   └── api/
│       └── analyze-grievance/
│           └── route.ts        # AI analysis (OpenAI + heuristic fallback)
├── components/
│   ├── Header.tsx              # Civic branding, profile drawer, language selector
│   ├── VoiceTextRecorder.tsx   # Mic recorder with waveform + audio upload
│   ├── LocationPicker.tsx      # Leaflet map with 4-layer location detection
│   ├── AdvisoryCard.tsx        # Non-blocking guidance card
│   └── DuplicateBanner.tsx     # Semantic duplicate match + upvote UI
└── lib/
    ├── seedData.ts             # Mock citizen profile, pre-seeded grievances, demo presets
    └── offlineQueue.ts         # IndexedDB offline queue with auto-sync
```

## Tech Stack

- **Framework**: Next.js 14 (App Router, Server Actions, Route Handlers)
- **UI**: React 18, Tailwind CSS, Lucide Icons
- **Map**: Leaflet.js + React-Leaflet (OpenStreetMap tiles)
- **EXIF**: ExifReader (GPS extraction from photos)
- **AI**: OpenAI GPT-4o-mini (optional, with local heuristic fallback)
- **Offline**: Browser IndexedDB via custom `offlineQueue` utility

## Compliance
This portal handles data in accordance with the IT Act 2000 and Digital Personal Data Protection Act 2023.

## Helplines
- Civic: **1533**
- BBMP: **080-22660000**
- BWSSB: **1916**
