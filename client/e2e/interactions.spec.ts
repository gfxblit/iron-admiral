import { test, expect } from '@playwright/test';

test('setting a waypoint updates the ship target', async ({ page }) => {
  await page.goto('/');

  // Ensure we are connected
  const status = page.locator('#status-text');
  await expect(status).toHaveText('Connected', { timeout: 10000 });

  // Spawn a ship first
  await page.evaluate(async () => {
    // @ts-expect-error - Accessing the singleton instance exposed in main.ts
    const manager = window.spacetimeManager;
    await manager.registerPlayer('InteractionTester');
    await new Promise(resolve => setTimeout(resolve, 500));
    await manager.spawnShip('ArleighBurke', 0, 0);
  });

  // Wait for the ship to appear in the UI count
  await expect(page.locator('#ships-count')).not.toHaveText('0', { timeout: 10000 });

  // Click on the center of the canvas to select the ship (spawned at 0,0 which is likely center)
  const canvas = page.locator('#game-canvas');
  const box = await canvas.boundingBox();
  if (!box) throw new Error('Canvas not found');

  const centerX = box.x + box.width / 2;
  const centerY = box.y + box.height / 2;

  // Left click to select
  await page.mouse.click(centerX, centerY);

  // Check if status shows "Selected ship"
  const interactionStatus = page.locator('#interaction-status');
  await expect(interactionStatus).toContainText('Selected ship', { timeout: 5000 });

  // Right click to set waypoint at offset
  const targetX = centerX + 100;
  const targetY = centerY + 100;
  await page.mouse.click(targetX, targetY, { button: 'right' });

  // Check if status shows "Waypoint set"
  await expect(interactionStatus).toContainText('Waypoint set', { timeout: 5000 });
});
