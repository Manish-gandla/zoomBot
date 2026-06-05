/**
 * ZOOM BOT TRIGGER
 * =================
 * Use this to launch the bot manually or with Task Scheduler.
 * Run:    node trigger.js
 * Or set Task Scheduler to run this file.
 */

const { spawn } = require('child_process');
const path = require('path');

console.log('========================================');
console.log('  ZOOM BOT TRIGGER');
console.log('========================================');
console.log(`  Time: ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}`);
console.log('========================================');

// Spawn the main bot
const botProcess = spawn('node', [path.join(__dirname, 'zoomBot.js')], {
  stdio: 'inherit',
  cwd: __dirname,
  shell: true,
});

botProcess.on('error', (err) => {
  console.error('[TRIGGER] Failed to start bot:', err.message);
  process.exit(1);
});

botProcess.on('exit', (code) => {
  console.log(`[TRIGGER] Bot exited with code ${code}`);
  process.exit(code);
});

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('[TRIGGER] Received SIGINT, shutting down bot...');
  botProcess.kill('SIGINT');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('[TRIGGER] Received SIGTERM, shutting down bot...');
  botProcess.kill('SIGTERM');
  process.exit(0);
});
