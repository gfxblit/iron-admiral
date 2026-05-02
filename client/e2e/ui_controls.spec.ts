import { test, expect } from '@playwright/test';

/**
 * UI Controls E2E tests
 *
 * Verifies the mobile action overlay (RADAR, FIRE, DESEL buttons)
 * and keyboard shortcuts surface the correct backend features.
 */

test.describe('mobile action overlay', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    const status = page.locator('#status-text');
    await expect(status).toHaveText('Connected', { timeout: 10000 });

    // Register player and spawn a ship so we have something to interact with
    await page.evaluate(async () => {
      // @ts-expect-error - window.spacetimeManager exposed in main.ts
      const manager = window.spacetimeManager;
      await manager.registerPlayer('UIControlsTester');
      await new Promise((resolve: (v: void) => void) => setTimeout(resolve, 500));
      await manager.spawnShip('ArleighBurke', 0, 0);
    });

    // Wait for ship to appear
    await expect(page.locator('#ships-count')).not.toHaveText('0', { timeout: 10000 });
  });

  test('overlay is hidden before a ship is selected', async ({ page }) => {
    // The #mobile-actions element should exist but not be visible (display: none)
    const overlay = page.locator('#mobile-actions');
    await expect(overlay).toBeAttached({ timeout: 5000 });
    await expect(overlay).not.toBeVisible();
  });

  test('selecting a ship shows the action overlay', async ({ page }) => {
    const canvas = page.locator('#game-canvas');
    const box = await canvas.boundingBox();
    if (!box) throw new Error('Canvas not found');

    const centerX = box.x + box.width / 2;
    const centerY = box.y + box.height / 2;

    // Left-click to select the ship at center
    await page.mouse.click(centerX, centerY);

    // Check selection feedback
    const interactionStatus = page.locator('#interaction-status');
    await expect(interactionStatus).toContainText('Selected ship', { timeout: 5000 });

    // Overlay should now be visible
    const overlay = page.locator('#mobile-actions');
    await expect(overlay).toBeVisible({ timeout: 3000 });

    // All three buttons should be present
    await expect(page.locator('#btn-radar')).toBeVisible();
    await expect(page.locator('#btn-fire')).toBeVisible();
    await expect(page.locator('#btn-deselect')).toBeVisible();
  });

  test('DESEL button hides the overlay and clears selection', async ({ page }) => {
    const canvas = page.locator('#game-canvas');
    const box = await canvas.boundingBox();
    if (!box) throw new Error('Canvas not found');

    const centerX = box.x + box.width / 2;
    const centerY = box.y + box.height / 2;

    // Select the ship
    await page.mouse.click(centerX, centerY);
    const interactionStatus = page.locator('#interaction-status');
    await expect(interactionStatus).toContainText('Selected ship', { timeout: 5000 });

    const overlay = page.locator('#mobile-actions');
    await expect(overlay).toBeVisible({ timeout: 3000 });

    // Click DESEL button
    await page.locator('#btn-deselect').click();

    // Overlay should be hidden again
    await expect(overlay).not.toBeVisible({ timeout: 3000 });
  });

  test('FIRE button enters fire mode and shows status message', async ({ page }) => {
    const canvas = page.locator('#game-canvas');
    const box = await canvas.boundingBox();
    if (!box) throw new Error('Canvas not found');

    const centerX = box.x + box.width / 2;
    const centerY = box.y + box.height / 2;

    // Select the ship
    await page.mouse.click(centerX, centerY);
    await expect(page.locator('#interaction-status')).toContainText('Selected ship', { timeout: 5000 });

    // Click the FIRE button
    await page.locator('#btn-fire').click();

    // Status should indicate fire mode
    const interactionStatus = page.locator('#interaction-status');
    await expect(interactionStatus).toContainText('FIRE MODE ACTIVE', { timeout: 3000 });
  });

  test('Escape key cancels fire mode', async ({ page }) => {
    const canvas = page.locator('#game-canvas');
    const box = await canvas.boundingBox();
    if (!box) throw new Error('Canvas not found');

    const centerX = box.x + box.width / 2;
    const centerY = box.y + box.height / 2;

    // Select the ship then enter fire mode via keyboard
    await page.mouse.click(centerX, centerY);
    await expect(page.locator('#interaction-status')).toContainText('Selected ship', { timeout: 5000 });

    await page.keyboard.press('f');

    const interactionStatus = page.locator('#interaction-status');
    await expect(interactionStatus).toContainText('FIRE MODE ACTIVE', { timeout: 3000 });

    // Press Escape to cancel fire mode
    await page.keyboard.press('Escape');
    await expect(interactionStatus).toContainText('Fire mode cancelled', { timeout: 3000 });
  });

  test('R keyboard shortcut attempts radar toggle on selected ship', async ({ page }) => {
    const canvas = page.locator('#game-canvas');
    const box = await canvas.boundingBox();
    if (!box) throw new Error('Canvas not found');

    const centerX = box.x + box.width / 2;
    const centerY = box.y + box.height / 2;

    // Select the ship
    await page.mouse.click(centerX, centerY);
    await expect(page.locator('#interaction-status')).toContainText('Selected ship', { timeout: 5000 });

    // Press R — should call toggleRadar and show status
    await page.keyboard.press('r');

    const interactionStatus = page.locator('#interaction-status');
    await expect(interactionStatus).toContainText('Radar toggled', { timeout: 5000 });
  });
});
