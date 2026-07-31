<div align="center">
  <a href="http://git-ishaan-kumar.github.io/sixty-second-news">
    <picture>
      <source media="(prefers-color-scheme: dark)" srcset="public/logo-dark.png">
      <source media="(prefers-color-scheme: light)" srcset="public/logo-light.png">
      <img alt="Sixty Second News Banner" src="public/logo-dark.png" width="75%">
    </picture>
  </a>

  <a href="https://sixty-second-news.vercel.app/">
  <img src="https://img.shields.io/badge/Live_Demo-sixty--second--news.vercel.app-2F80ED?style=for-the-badge&logo=vercel&logoColor=white" alt="Live Demo">
  </a>

  <br>
  <br>

  <img src="https://img.shields.io/badge/Next.js-16.2-black?logo=next.js&logoColor=white" alt="Next.js">
  <img src="https://img.shields.io/badge/TypeScript-5.x-3178C6?logo=typescript&logoColor=white" alt="TypeScript">
  <img src="https://img.shields.io/badge/Tailwind_CSS-v4-38B2AC?logo=tailwind-css&logoColor=white" alt="Tailwind CSS">
  <img src="https://img.shields.io/badge/Supabase-Database-3ECF8E?logo=supabase&logoColor=white" alt="Supabase">
  <img src="https://img.shields.io/badge/Python-3.10+-3776AB?logo=python&logoColor=white" alt="Python">
  <img src="https://img.shields.io/badge/Gemini_AI-3.1_Flash-8E75B2?logo=google-gemini&logoColor=white" alt="Gemini">
  <img src="https://img.shields.io/badge/Deployed_on-Vercel-000000?logo=vercel&logoColor=white" alt="Vercel">
</div>

<br>

## 📰 Introduction

<br>

<div align="center">
  <img src="public/screenshot.png" alt="Sixty Second News App Screenshot" width="85%" style="border-radius: 12px; box-shadow: 0 10px 30px rgba(0,0,0,0.3);">
</div>

<br>

**Sixty Second News** a is news app that provides fast summaries and headlines categorized by topic, allowing users to swipe through breaking news headlines and view original sources.


- **Fresh Breaking News Every Hour**

> Automatically collects top stories from trusted global publishers every hour across politics, technology, sports, business, and more.

- **Fast, Single-Sentence Summaries**

> AI condenses complex news items into clear, straightforward summary hooks so you get the essential facts instantly.

- **TikTok-Style Swiping**

> Smooth, full-screen vertical scrolling designed for quick browsing on both mobile phones and desktop screens.

- **A Feed That Learns What You Like**

> Simply like or dislike stories to customize your experience. The app remembers your interests and tunes your feed over time.

- **Read the Full Story Anytime**

> Want to dive deeper? Tap any news card to open the original article directly on the publisher's website.

- **Install as an App**

> Add Sixty Second News directly to your phone's home screen for fast, one-tap access anytime without needing an app store download.

---

## ⚡ Quick Start

### 1. Clone & Install

```bash
git clone https://github.com/git-ishaan-kumar/sixty-second-news.git
cd sixty-second-news
npm install
```

### 2. Environment Setup

Create a `.env.local` file in the root directory and add your keys:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

NEXT_PUBLIC_TURNSTILE_SITE_KEY=your-turnstile-site-key
TURNSTILE_SECRET_KEY=your-turnstile-secret-key

CURRENTS_API_KEY=your-currents-api-key
GEMINI_API_KEY=your-gemini-api-key
CRON_SECRET=your-cron-secret
```

### 3. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](https://www.google.com/search?q=http://localhost:3000) in your browser to view the application.