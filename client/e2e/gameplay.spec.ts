import { test, expect } from '@playwright/test';

test('spawning a ship updates the UI count', async ({ page }) => {
  await page.goto('/');

  // Ensure we are connected
  const status = page.locator('#status-text');
  await expect(status).toHaveText('Connected', { timeout: 10000 });

  // Initial count should be 0 (assuming a fresh local SpacetimeDB instance)
  // If not fresh, we just want to see it increment.
  const initialCountText = await page.locator('#ships-count').textContent();
  const initialCount = parseInt(initialCountText || '0');

  // Trigger ship spawn via the SpacetimeManager in the browser context
  // This simulates what would happen if a player or another agent triggered an action
  const evalError = await page.evaluate(async () => {
    try {
      // @ts-expect-error - Accessing the singleton instance exposed in main.ts
      const manager = window.spacetimeManager;

      // Must register player first
      await manager.registerPlayer('TestPlayer');

      // Give it a tiny bit of time for the registration to be processed
      await new Promise((resolve: (value: void) => void) => setTimeout(resolve, 500));

      await manager.spawnShip('ArleighBurke', 100, 100);
      return null;
    } catch (e: unknown) {
      return String(e);
    }
  });
  // Surface reducer errors instead of silently timing out on ship count assertion
  expect(evalError, `Browser-side error during spawn: ${evalError}`).toBeNull();

  // Check if the count incremented
  const expectedCount = String(initialCount + 1);
  await expect(page.locator('#ships-count')).toHaveText(expectedCount, { timeout: 10000 });

  // Visual Verification: Take a screenshot so the agent can "see" the ship
  await page.screenshot({ path: 'e2e-screenshots/ship-spawned.png' });
});
