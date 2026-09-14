# AI Review Analyzer

A web app that helps small business owners quickly understand customer
reviews and generate a professional response — built with the cake and
cake-topper business in mind, but works for any small business.

## Status: MVP in progress

The core flow works end-to-end today:

1. Paste a customer review
2. Click **Analyze review**
3. See the sentiment, positive/negative themes, and a suggested response

Right now the analysis runs on a built-in rule-based engine (see
`lib/analyzer.ts`) so it works instantly with no setup or API key. The
original plan is to swap this for a real OpenAI call — see the comment
at the top of `lib/analyzer.ts` for exactly what to change.

## Tech stack

- Next.js (App Router) + TypeScript
- Tailwind CSS
- Planned: OpenAI API for the analysis step (see Roadmap)

## Running locally

```bash
npm install
npm run dev
```

Then open http://localhost:3000

## Roadmap

- **V1 (current):** paste a review, get sentiment + themes + a suggested response
- **V2:** review history, saved analyses, a dashboard, search
- **V3:** direct integrations with Google Reviews, Yelp, and Facebook Reviews, plus email notifications and an analytics dashboard

## Why this project

Built out of a real need: running two small businesses (custom cakes and
custom cake toppers) means reading and responding to reviews across
multiple platforms, and it's easy to respond inconsistently or too slowly.
This project is the tool I actually wanted to exist.
