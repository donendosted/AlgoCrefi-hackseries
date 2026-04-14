#!/usr/bin/env node

import { execSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..');

try {
  console.log('[v0] Changing to project directory:', projectRoot);
  process.chdir(projectRoot);

  console.log('[v0] Configuring git identity...');
  try {
    execSync('git config user.email "v0[bot]@users.noreply.github.com"');
    execSync('git config user.name "v0[bot]"');
  } catch (e) {
    console.log('[v0] Git config already set or not needed');
  }

  console.log('[v0] Adding all files...');
  execSync('git add -A');

  console.log('[v0] Creating commit...');
  const commitMessage = `feat: build dark-luxury DeFi landing page for AlgoCrefi

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

Co-authored-by: v0[bot] <v0[bot]@users.noreply.github.com>`;

  try {
    execSync(`git commit -m "${commitMessage.replace(/"/g, '\\"')}"`, { stdio: 'inherit' });
  } catch (e) {
    console.log('[v0] Commit failed or no changes to commit');
  }

  console.log('[v0] Pushing to GitHub...');
  execSync('git push origin HEAD', { stdio: 'inherit' });

  console.log('[v0] ✓ Changes pushed to GitHub successfully!');
} catch (error) {
  console.error('[v0] Error during git operations:', error.message);
  process.exit(1);
}
