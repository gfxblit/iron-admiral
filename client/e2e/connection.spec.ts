import { test, expect } from '@playwright/test';

test('should connect to SpaceTimeDB and show status', async ({ page }) => {
  page.on('console', msg => console.log(`BROWSER: ${msg.text()}`));
  await page.goto('/');

  // Wait for the status text to change to "Connected"
  // We set a long timeout because the backend might need time to spin up if we automate it later
  const status = page.locator('#status-text');
  await expect(status).toHaveText('Connected', { timeout: 30000 });

  // Check if the game container is visible
  const gameContainer = page.locator('#game-container');
  await expect(gameContainer).toBeVisible();

  // Initial counts should be 0 or more (just checking they are rendered)
  const shipsCount = page.locator('#ships-count');
  await expect(shipsCount).not.toHaveText('...');
});
