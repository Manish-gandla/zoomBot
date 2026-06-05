# Zoom Presence Bot v2

Maintains your presence in a Zoom meeting from 9 AM to 1 PM IST (Mon-Sat).

## Files in This Project

| File | Purpose |
|------|---------|
| `package.json` | Dependencies (playwright, node-cron) |
| `zoomBot.js` | **Main bot** — opens browser, waits for manual join, maintains presence |
| `trigger.js` | **Launcher** — spawns the bot (use with Task Scheduler) |
| `scheduler-setup.ps1` | **One-click Task Scheduler setup** (run as Admin) |
| `README.md` | This file |

## Quick Start

### 1. Install Node.js
Download from https://nodejs.org/ (LTS version)

Verify:
```cmd
node --version
npm --version
