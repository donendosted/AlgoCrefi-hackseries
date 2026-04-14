#!/bin/bash

cd /vercel/share/v0-project

# Configure git if not already configured
git config user.email "v0[bot]@users.noreply.github.com" || true
git config user.name "v0[bot]" || true

# Add all new files
git add -A

# Commit with descriptive message
git commit -m "feat: build dark-luxury DeFi landing page for AlgoCrefi

- Scaffold Next.js 15 App Router with TypeScript
- Create Loader component with SVG stroke-draw animation
- Implement custom cursor with magnetic attraction to buttons
- Build fixed navbar with scroll hide/show and mobile hamburger menu
- Design hero section with ambient orb drift, clip-path headline reveal, stat counters
- Create asymmetric bento grid (1.6fr 1fr 1fr) with 4 feature cards
- Implement horizontal scroll 'How It Works' section with 300vh sticky container
- Add Aura credit score section with SVG progress circle
- Build infinite marquee stats ticker
- Design diagonal footer with clip-path parallelogram effect
- Add comprehensive animations: text reveal, counter animation, shimmer effects, scroll reveals
- Global design system with Space Grotesk & Inter fonts, teal/violet/amber color palette
- Responsive mobile breakpoints (768px): hamburger nav, single-column grid, vertical cards
- Pure CSS keyframes + vanilla JS for all animations (no GSAP)

Co-authored-by: v0[bot] <v0[bot]@users.noreply.github.com>" || true

# Push to the current branch (algocrefi-landing-page)
git push origin HEAD 2>&1

echo "✓ Changes pushed to GitHub successfully!"
