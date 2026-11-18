const puppeteer = require('puppeteer-core');
const path = require('path');
const fs = require('fs');

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const SCREENSHOT_DIR = path.resolve(__dirname, '..', 'docs', 'screenshots');

if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

const delay = (ms) => new Promise(r => setTimeout(r, ms));

async function clickTab(page, label) {
  const buttons = await page.$$('button');
  for (const b of buttons) {
    const text = await page.evaluate(el => el.textContent, b);
    if (text && text.includes(label)) {
      await b.click();
      return true;
    }
  }
  return false;
}

async function capture() {
  console.log('Launching Chrome...');
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1440,900'],
    defaultViewport: { width: 1440, height: 900 }
  });

  const page = await browser.newPage();

  // Step 1: Login & establish session
  console.log('1. Navigating to login...');
  await page.goto('http://localhost:3000', { waitUntil: 'networkidle2' });
  await page.type('input[type="email"]', 'dispatcher@ucr.edu');
  await page.type('input[type="password"]', 'ucr-admin-secure');
  await page.click('button[type="submit"]');
  await page.waitForNavigation({ waitUntil: 'networkidle2' }).catch(() => {});
  console.log('Logged in successfully!');

  // Wait for map tiles and all 52 markers to load
  await delay(4500);

  // Screenshot 1: Operations Map with 52 students
  console.log('2. Capturing Operations Map with 52 students...');
  await page.screenshot({
    path: path.join(SCREENSHOT_DIR, '01_live_operations_map.png'),
    fullPage: false
  });

  // Screenshot 2: Student Directory
  console.log('3. Capturing Student Directory...');
  await clickTab(page, 'Student Registry');
  await delay(2000);
  await page.screenshot({
    path: path.join(SCREENSHOT_DIR, '02_student_directory.png'),
    fullPage: false
  });

  // Screenshot 3: Safe Corridors
  console.log('4. Capturing Geofences / Safe Corridors...');
  await clickTab(page, 'Safe Corridors');
  await delay(2000);
  await page.screenshot({
    path: path.join(SCREENSHOT_DIR, '03_safe_corridors.png'),
    fullPage: false
  });

  // Screenshot 4: Incident Ledger
  console.log('5. Capturing Incident Ledger...');
  await clickTab(page, 'Incident Ledger');
  await delay(2000);
  await page.screenshot({
    path: path.join(SCREENSHOT_DIR, '04_incident_ledger.png'),
    fullPage: false
  });

  // Screenshot 5: Student Mobile App (Light Mode Apple White)
  console.log('6. Capturing Student Mobile App Simulator (Light Mode)...');
  await page.goto('http://localhost:3000/student', { waitUntil: 'networkidle2' });
  await delay(2500);
  await page.screenshot({
    path: path.join(SCREENSHOT_DIR, '05_student_mobile_app.png'),
    fullPage: false
  });

  // Screenshot 6: Dual Custody Gunpoint Geofence Simulation
  console.log('7. Capturing Gunpoint Duress On-Campus Protection...');
  // Click on-campus radio to show in-person staff key dialog
  const radios = await page.$$('input[type="radio"]');
  if (radios.length > 1) {
    await radios[1].click(); // Select On-Campus
  }
  await delay(1500);
  await page.screenshot({
    path: path.join(SCREENSHOT_DIR, '06_duress_geofence_guard.png'),
    fullPage: false
  });

  console.log('All 6 screenshots captured with high precision!');
  await browser.close();
}

capture().catch((err) => {
  console.error('Screenshot error:', err);
  process.exit(1);
});
