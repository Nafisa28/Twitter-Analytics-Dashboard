# Twitter Analytics Dashboard

A premium, web-based Twitter Analytics Dashboard built with **React (Vite)**, **Recharts**, and **Lucide React**. It visualizes Twitter campaign metrics from June to October 2020 using preprocessed JSON data generated from `Data/Tweet.xlsx`.

This application features a custom, client-side **Time-Based Visibility Engine** that restricts specific charts to configured Indian Standard Time (IST) windows. It also includes a **Testing Mode** control panel to override the clock for demo and evaluation purposes.

---

## 🚀 Setup & Execution

### Prerequisites
- Node.js ≥ 18
- Python 3.x with `pandas` and `openpyxl` (only needed if re-generating `tweets.json`)

### 1. Data Preprocessing (already done — `public/tweets.json` is committed)
The dataset `Data/Tweet.xlsx` (sheet `SocialMedia (1)`) has been processed into `public/tweets.json` and `Data/tweets.json` via a Python script. To re-run the conversion from scratch:
```bash
pip install pandas openpyxl
python Data/convert_data.py
```
The script filters out 15 corrupted/column-shifted rows (whose `time` field is an integer like `304` instead of `YYYY-MM-DD HH:mm +0000`), retaining **1,166 clean records** from the original 1,181. It also auto-copies `tweets.json` into `public/` so Vite serves it as a static asset.

### 2. Running Locally
```bash
npm install
npm run dev
# Opens at http://localhost:3000
```

### 3. Production Build
```bash
npm run build
# Outputs to dist/  (deploy this folder to Vercel/Netlify)
```

---

## 🗂️ Dashboard Layout

The dashboard uses a Power BI–style report layout: a top tab bar with **Overview** plus one tab per task (Category Breakdown, Engagement Comparison, Media by Weekday, Replies/RTs/Likes, Monthly Trend, Top Tweets). Only the active tab's chart renders at a time. The Overview tab shows global KPI cards (total tweets, impressions, average engagement rate, total likes). Each task tab shows its chart, a collapsible "Filters applied" summary, and a locked-state placeholder with the exact IST visibility window when the chart is outside its active hours.

---

## 🌐 Deploying to Vercel (step-by-step)

1. **Push your repo to GitHub** (if not already):
```bash
   git add .
   git commit -m "feat: Twitter Analytics Dashboard"
   git push
```

2. **Go to [vercel.com](https://vercel.com)** → sign in with GitHub → click **"Add New Project"**.

3. **Import your GitHub repository** from the list.

4. **Configure build settings** — Vercel auto-detects Vite. Confirm or manually set:
   | Setting | Value |
   |---|---|
   | Framework Preset | **Vite** |
   | Build Command | `npm run build` |
   | Output Directory | `dist` |
   | Install Command | `npm install` |

5. Click **"Deploy"**. Vercel will build and give you a live URL like `https://your-project.vercel.app`.

6. **`public/tweets.json` is handled automatically** — everything inside `public/` is copied verbatim into `dist/` by Vite's build, so it is served as a static file at `/tweets.json` in production. No special Vercel configuration is needed.

> **Note**: Do not run `git init` or add a new remote — this is an already-connected repo.

---

## 📌 Task Mapping & Filter Assumptions

### Task 1 — Tweet Interaction Breakdown by Category
- **Chart**: Clustered bar chart — URL clicks, profile clicks, hashtag clicks per tweet category.
- **Categories**: `Media`, `Link`, `Hashtag`. One tweet can count toward multiple categories simultaneously.
- **Filters**: even `tweetDate` · `wordCount > 40` · at least one click metric > 0
- **Visibility**: 3:00 PM – 5:00 PM IST
- **⚠️ Caveat**: The `wordCount > 40` filter yields **0 matching rows** because the maximum word count in this dataset is **36 words**. This is a data characteristic (tweets in this dataset are short). The filter is applied exactly as specified; the chart section shows a caveat banner explaining this.

### Task 2 — Engagement Rate Comparison (App Opens)
- **Chart**: Two-bar chart comparing average `engagement rate` for `app opens > 0` vs. `app opens = 0`.
- **Filters**: `hourUTC` 9–17 · weekday Mon–Fri · even impressions · odd `tweetDate` · `charCount > 30` · **exclude letter "D" (case-insensitive)**
- **Visibility**: 7:00 AM – 11:00 AM IST **and** 12:00 PM – 6:00 PM IST
- **⚠️ Caveat — Aggressive Filter**: Excluding the letter "D" (case-insensitive) is an extremely restrictive filter because "d" appears in nearly every English word ("the", "and", "would", etc.). Only **5 tweets** survive all filters. None of those 5 had `app opens > 0`, so the first bar renders at 0%. The chart shows an informational banner explaining this.

### Task 3 — Media Interaction by Day of Week
- **Chart**: Dual-axis composed chart — media views bars (left Y) + media engagements line (right Y), by day of week. Spike day (highest combined) highlighted in rose.
- **Data range**: Last 3 months present in the dataset (Aug, Sep, Oct 2020), computed dynamically from `MAX(time)`.
- **Filters**: even impressions · odd `tweetDate` · `charCount > 30` · **exclude letter "H" (case-insensitive)**
- **Visibility**: 7:00 AM – 11:00 AM IST **and** 3:00 PM – 5:00 PM IST
- **⚠️ Caveat — Aggressive Filter**: Excluding "H" removes words like "the", "this", "that", "hashtag". **80 tweets** survive — enough for real chart values but a thin dataset. Noted in the UI.

### Task 4 — Replies, Retweets, and Likes Comparison
- **Chart**: 3-bar chart — total replies, retweets, and likes.
- **Filters**: tweet `time` between June 1 and August 31, 2020 (inclusive). 753 rows match.
- **Visibility**: Always visible.

### Task 5 — Monthly Engagement Rate Trend
- **Chart**: Two-line chart — average engagement rate per month for media vs. non-media tweets.
- **Filters**: None (all 1,166 cleaned tweets included).
- **Visibility**: Always visible.

### Task 6 — Top 10 Tweets by Engagement
- **Chart**: Horizontal bar + ranked leaderboard table.
- **Ranking**: by `retweets + likes` (descending).
- **Filters**: exclude Sat/Sun · even impressions · odd `tweetDate` · `wordCount < 30`
- **Visibility**: 3:00 PM – 5:00 PM IST
- **⚠️ Assumption — No Username Column**: The source dataset has no dedicated username or user-profile column. Each tweet is identified by its **numeric Tweet ID** (last 8 digits shown for brevity) and a **truncated text preview**. This is documented as an assumption.

---

## 🛠️ Testing Mode (IST Clock Override)

Click the gear icon in the top-right of the header to open the **"Testing Mode"** popover, containing an **"Enable testing mode"** checkbox.

- **Default behaviour on page load**: Real-world IST time is used (derived client-side via `Intl.DateTimeFormat` with `Asia/Kolkata` timezone). The checkbox is **unchecked** by default.
- **When enabled**: You can select a simulated Hour and Minute. The visibility engine (`useVisibleInWindow` hook) immediately re-evaluates all 4 time-locked tasks (1, 2, 3, 6) against the simulated time, toggling their Locked/Active state instantly.
- **Purpose**: This is for **demo and evaluation only** — so reviewers can test all chart states at any real-world time without waiting for specific IST windows. It has no effect on the tweet data or chart calculations.
- **Reset**: Click "Reset to Live" or uncheck the checkbox to return to real IST.

**Quick test matrix:**

| Simulated Hour | Task 1 | Task 2 | Task 3 | Task 4 | Task 5 | Task 6 |
|---|---|---|---|---|---|---|
| 08:00 (8 AM) | 🔒 | ✅ | ✅ | ✅ | ✅ | 🔒 |
| 11:30 (11:30 AM) | 🔒 | 🔒 | 🔒 | ✅ | ✅ | 🔒 |
| 13:00 (1 PM) | 🔒 | ✅ | 🔒 | ✅ | ✅ | 🔒 |
| 15:30 (3:30 PM) | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| 18:30 (6:30 PM) | 🔒 | 🔒 | 🔒 | ✅ | ✅ | 🔒 |

---

## ⚠️ Deployment Constraints

- **Folder casing**: All references use `Data/` (capital D) and `public/` (lowercase). Vercel/Netlify use case-sensitive Linux filesystems — any mismatch will break the production build.
- **`tweets.json` static serving**: The file lives in `public/tweets.json`. Vite copies everything in `public/` to `dist/` verbatim. The app fetches it at runtime via `fetch('/tweets.json')` — it is **not** bundled into the JS.
- **Git**: This repo is pre-configured with a remote. Do not run `git init` or `git remote add`.
