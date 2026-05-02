import { chromium } from 'playwright';
import * as fs from 'fs';

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  // Mobile viewport for touch UI
  await page.setViewportSize({ width: 390, height: 844 }); // iPhone 12 Pro
  
  console.log('Navigating to app...');
  await page.goto('http://localhost:5173');
  
  // Wait for connection
  await page.waitForSelector('#connection-status:has-text("Connected")', { timeout: 10000 });
  console.log('Connected to SpaceTimeDB');

  // Spawn a ship using keyboard shortcut 'S'
  console.log('Spawning ship...');
  await page.keyboard.press('s');
  
  // Wait for ship to appear and be selectable
  // We can't easily wait for canvas draw, but we can wait for ship count update if it existed
  // Instead, let's use interactionManager to select the ship we just spawned
  await page.waitForTimeout(2000); // Give it a moment to spawn and sync
  
  console.log('Selecting ship via InteractionManager...');
  await page.evaluate(() => {
    // @ts-ignore
    const ships = Array.from(window.spacetimeManager.shipTable.values());
    if (ships.length > 0) {
      // @ts-ignore
      window.interactionManager.selectShipById(ships[ships.length - 1].shipId);
    }
  });

  // Check if overlay is visible
  const overlay = page.locator('#mobile-actions');
  await overlay.waitFor({ state: 'visible' });
  console.log('Mobile action overlay visible');

  // Take screenshot of selection + overlay
  if (!fs.existsSync('uat-screenshots')) fs.mkdirSync('uat-screenshots');
  await page.screenshot({ path: 'uat-screenshots/01-selection.png' });
  console.log('Screenshot 01-selection.png saved');

  // Toggle Radar
  console.log('Toggling Radar...');
  await page.click('button:has-text("RADAR")');
  await page.waitForTimeout(500);
  await page.screenshot({ path: 'uat-screenshots/02-radar-on.png' });
  console.log('Screenshot 02-radar-on.png saved');

  // Enter Fire Mode
  console.log('Entering Fire Mode...');
  await page.click('button:has-text("FIRE")');
  await page.waitForSelector('#interaction-status:has-text("FIRE MODE ACTIVE")');
  await page.screenshot({ path: 'uat-screenshots/03-fire-mode.png' });
  console.log('Screenshot 03-fire-mode.png saved');

  await browser.close();
})();
