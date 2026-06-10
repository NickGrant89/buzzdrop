# BuzzDrop — UK Viral Dropshipping Store

Automated UK dropshipping store for viral trending products, powered by **CJ Dropshipping** (UK warehouse).

**Domain to register:** [buzzdrop.co.uk](https://www.123-reg.co.uk/domainsearch/find?domainToCheck=buzzdrop.co.uk)

## Quick Start

### 1. Register your domain

Grab **buzzdrop.co.uk** (~£5–10/year) at [123-reg](https://www.123-reg.co.uk) or [Namecheap](https://www.namecheap.com).

### 2. Get your CJ API key

1. Sign up at [cjdropshipping.com](https://cjdropshipping.com)
2. Go to **My CJ → Authorization → API → Generate**

### 3. Configure environment

```bash
cd ~/Projects/trenddrop
cp .env.example .env.local
```

Edit `.env.local`:

```
ADMIN_AUTO_LOGIN=true
CJ_API_KEY=CJ1234567@api@your-api-key-here
```

### 4. Run

```bash
npm run dev
```

Open [http://localhost:3000/admin/login](http://localhost:3000/admin/login)

## How automation works

| Job | Schedule | Action |
|-----|----------|--------|
| Product sync | Daily 03:00 (configurable) | Fetches CJ trending + Google/TikTok keywords |
| Catalog prune | Daily 05:00 | Hides products with 0 views/orders after 30 days |
| Price update | Every 2 hours | Recalculates GBP retail margins |
| Fulfillment | Every 5 minutes | Creates CJ orders for paid orders |
| Shipping | Every 5 minutes | Pulls tracking numbers from CJ |

## Admin access

Dashboard at `/admin` — set `ADMIN_AUTO_LOGIN=false` and `ADMIN_PASSWORD` before going live.

## Tech stack

Next.js 16 · SQLite · CJ Dropshipping API · Stripe · node-cron · Tailwind
