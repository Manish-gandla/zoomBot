const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const readline = require('readline');

// ============================================================
// CONFIGURATION
// ============================================================
const MEETING_URL = process.env.MEETING_URL || 'https://bytexl-in.zoom.us/w/87508297509?tk=Jwab1SSwtXE_pvbtNcHafwa2tqnfgysJfPZP7pS8Cz8.DQkAAAAUX-anJRZYb09MRWd2WFRDU0FwY2ZLY1ZKT2ZBAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA&pwd=wloDbtKaR91Ui2VqKxn9yqIm92pw8c.1';
const BOT_NAME = process.env.BOT_NAME || 'Rahul Sharma';
const STAY_DURATION = parseInt(process.env.STAY_DURATION || '14400'); // Default 4 hours (9AM to 1PM)
const SCREENSHOT_DIR = process.env.SCREENSHOT_DIR || 'artifacts';

// ============================================================
// SETUP
// ============================================================
if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

function log(msg) {
  const ts = new Date().toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata' });
  console.log(`[${ts}] [${BOT_NAME}] ${msg}`);
}

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function screenshot(page, name) {
  try {
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, `${BOT_NAME.replace(/\s+/g, '_')}_${name}.png`)
    });
  } catch (e) {
    log(`Screenshot error: ${e.message}`);
  }
}

async function waitForUserInput(prompt) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  return new Promise(resolve => {
    rl.question(prompt, answer => {
      rl.close();
      resolve(answer);
    });
  });
}

// ============================================================
// CHECK IF STILL IN MEETING
// ============================================================
async function checkInMeeting(page) {
  try {
    const result = await page.evaluate(() => {
      const body = (document.body?.innerText || '').toLowerCase();
      
      // Check for in-meeting indicators
      const hasLeave = body.includes('leave meeting') || body.includes('leave');
      const hasMute = document.querySelector('[class*="unmute"], [class*="mute"], [aria-label*="Mute"], [aria-label*="Unmute"]') !== null;
      const hasParticipants = body.includes('participants');
      const hasFooter = document.getElementById('wc-footer') !== null;
      const hasEnd = body.includes('end meeting') || body.includes('end');
      const hasWaiting = body.includes('waiting for the host') || body.includes('waiting room');
      
      return {
        inMeeting: hasLeave || hasMute || hasParticipants || hasFooter || hasEnd,
        inWaitingRoom: hasWaiting,
        hasLeave: hasLeave,
        hasMute: hasMute,
        details: { hasLeave, hasMute, hasParticipants, hasFooter, hasEnd, hasWaiting }
      };
    });
    return result;
  } catch {
    return { inMeeting: false, inWaitingRoom: false, hasLeave: false, hasMute: false, details: {} };
  }
}

// ============================================================
// MAINTAIN MEETING — Keep bot alive
// ============================================================
async function maintainMeeting(page, duration) {
  log('='.repeat(50));
  log(`✅ BOT IS IN THE MEETING!`);
  log(`🌐 Maintaining presence for ${Math.floor(duration / 3600)}h ${Math.floor((duration % 3600) / 60)}m`);
  log(`⏰ Current time (IST): ${new Date().toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata' })}`);
  log(`⏰ Will leave at approximately: ${new Date(Date.now() + duration * 1000).toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata' })}`);
  log('='.repeat(50));

  const startTime = Date.now();
  const endTime = startTime + (duration * 1000);
  let lastScreenshotTime = 0;
  let lastCheckTime = 0;
  let disconnectionCount = 0;

  while (Date.now() < endTime) {
    await sleep(30000); // Check every 30 seconds

    const elapsed = Math.floor((Date.now() - startTime) / 1000);
    const elapsedMin = Math.floor(elapsed / 60);
    const elapsedHr = Math.floor(elapsedMin / 60);
    const elapsedRemainMin = elapsedMin % 60;

    // Screenshot every 5 minutes
    if (Date.now() - lastScreenshotTime > 300000) {
      await screenshot(page, `maintaining_${elapsedMin}m`);
      lastScreenshotTime = Date.now();
    }

    // Check connection every 2 minutes
    if (Date.now() - lastCheckTime > 120000) {
      const status = await checkInMeeting(page);
      
      if (status.inMeeting) {
        log(`✅ Still in meeting (${elapsedHr}h ${elapsedRemainMin}m elapsed)`);
        disconnectionCount = 0;
      } else if (status.inWaitingRoom) {
        log(`⏳ In waiting room (${elapsedHr}h ${elapsedRemainMin}m elapsed)`);
      } else {
        disconnectionCount++;
        log(`⚠️ May have disconnected (check #${disconnectionCount})`);
        await screenshot(page, `disconnect_check_${disconnectionCount}`);
        
        if (disconnectionCount >= 3) {
          log('❌ Confirmed disconnected after 3 checks. Exiting.');
          return false;
        }
      }
      lastCheckTime = Date.now();
    }

    // Gentle mouse movement every 3 minutes to look human
    if (elapsed % 180 < 5) {
      try {
        await page.mouse.move(
          500 + Math.floor(Math.random() * 400),
          300 + Math.floor(Math.random() * 200),
          { steps: 10 }
        );
      } catch {}
    }
  }

  log('='.repeat(50));
  log(`✅ Duration completed! Bot was in meeting for ${elapsedHr}h ${elapsedRemainMin}m`);
  log('='.repeat(50));
  await screenshot(page, 'duration_complete');
  return true;
}

// ============================================================
# MASTER BOT CONTROL
# ============================================================
async function run() {
  const browser = await chromium.launch({
    headless: false,  // Browser will be visible for you to interact with
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
      '--mute-audio',
    ],
  });

  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 },
    userAgent: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
    locale: 'en-US',
    timezoneId: 'Asia/Kolkata',
    permissions: ['camera', 'microphone'],
    recordVideo: { dir: SCREENSHOT_DIR, size: { width: 1280, height: 720 } },
  });

  const page = await context.newPage();

  // Log any page errors
  page.on('pageerror', err => log(`[PAGE ERROR] ${err.message}`));

  try {
    log('='.repeat(50));
    log(`🚀 ZOOM BOT LAUNCHER`);
    log(`👤 Bot name: ${BOT_NAME}`);
    log(`⏰ Current time (IST): ${new Date().toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata' })}`);
    log(`⏰ Duration set: ${Math.floor(STAY_DURATION / 3600)}h ${Math.floor((STAY_DURATION % 3600) / 60)}m`);
    log('='.repeat(50));

    // STEP 1: Open the meeting URL
    log('\n🌐 Opening Zoom meeting link...');
    await page.goto(MEETING_URL, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await sleep(3000);
    await screenshot(page, 'initial_page');
    
    log('\n' + '='.repeat(50));
    log('🔴 MANUAL JOIN MODE');
    log('📋 The browser is now open. Please:');
    log('   1. Click "Join from Browser" if shown');
    log('   2. Enter your name if needed');
    log('   3. Handle any mic/camera prompts');
    log('   4. Click Join to enter the meeting');
    log('   5. Once you are INSIDE the meeting, come back here and type: "done"');
    log('='.repeat(50));
    log('');
    log('⌨️  Type "done" and press Enter when you are in the meeting:');
    
    // Wait for manual input
    const userResponse = await waitForUserInput('> ');
    
    // STEP 2: User is now in the meeting
    log('\n📸 Taking confirmation screenshot...');
    await screenshot(page, 'user_joined_confirmation');
    
    // Verify we're in the meeting
    const status = await checkInMeeting(page);
    if (status.inMeeting || status.inWaitingRoom) {
      log('✅ Confirmed: Bot is in the meeting/waiting room!');
    } else {
      log('⚠️ Could not confirm meeting state. Checking URL and page content...');
      try {
        const url = page.url();
        log(`   Current URL: ${url}`);
        const title = await page.title();
        log(`   Page title: ${title}`);
      } catch {}
      
      log('\n📋 Are you actually in the meeting? If yes, type "yes" to continue:');
      const confirm = await waitForUserInput('> ');
      if (confirm.toLowerCase() !== 'yes') {
        log('❌ User confirmed not in meeting. Exiting.');
        await browser.close();
        process.exit(1);
      }
    }

    // STEP 3: Now leave the meeting — the bot will stay
    log('\n' + '='.repeat(50));
    log('🚪 Now you can leave the meeting.');
    log('📋 The browser will stay open and the bot will maintain');
    log(`   your presence for ${Math.floor(STAY_DURATION / 3600)}h ${Math.floor((STAY_DURATION % 3600) / 60)}m.`);
    log('');
    log('📋 You can:');
    log('   - Close the Zoom tab/window (bot continues in background)');
    log('   - Minimize/ignore the browser');
    log('   - Go to another meeting');
    log('');
    log('📋 Just type "continue" when ready to start the maintenance phase:');
    log('='.repeat(50));
    
    await waitForUserInput('> ');

    // STEP 4: Bot maintains presence
    log('\n🔄 Starting maintenance phase...');
    await maintainMeeting(page, STAY_DURATION);

  } catch (err) {
    log(`💥 ERROR: ${err.message}`);
    await screenshot(page, 'error_state');
  } finally {
    log('\n🏁 Bot session complete.');
    await screenshot(page, 'final_state');
    await page.close();
    await context.close();
    await browser.close();
    process.exit(0);
  }
}

run();
