import { test, expect } from '@playwright/test';

/**
 * Zoom E2E tests
 * 
 * Verifies that mouse wheel and scaling logic work correctly.
 */

test.describe('zoom and scaling', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    const status = page.locator('#status-text');
    await expect(status).toHaveText('Connected', { timeout: 10000 });
  });

  test('default scale is 0.2', async ({ page }) => {
    const scale = await page.evaluate(() => {
      // @ts-expect-error - window.renderer is exposed in main.ts for E2E testing
      return window.renderer.getScale();
    });
    expect(scale).toBeCloseTo(0.2);
  });

  test('mouse wheel zooms in and out', async ({ page }) => {
    const initialScale = await page.evaluate(() => {
      // @ts-expect-error - window.renderer is exposed in main.ts for E2E testing
      return window.renderer.getScale();
    });

    const canvas = page.locator('#game-canvas');
    const box = await canvas.boundingBox();
    if (!box) throw new Error('Canvas not found');

    // Zoom in (deltaY negative)
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.wheel(0, -100);

    const zoomedInScale = await page.evaluate(() => {
      // @ts-expect-error - window.renderer is exposed in main.ts for E2E testing
      return window.renderer.getScale();
    });
    expect(zoomedInScale).toBeGreaterThan(initialScale);

    // Zoom out (deltaY positive)
    await page.mouse.wheel(0, 200);

    const zoomedOutScale = await page.evaluate(() => {
      // @ts-expect-error - window.renderer is exposed in main.ts for E2E testing
      return window.renderer.getScale();
    });
    expect(zoomedOutScale).toBeLessThan(zoomedInScale);
  });

  test('scale is clamped between 0.05 and 2.0', async ({ page }) => {
    const canvas = page.locator('#game-canvas');
    const box = await canvas.boundingBox();
    if (!box) throw new Error('Canvas not found');

    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);

    // Zoom in a lot
    for (let i = 0; i < 50; i++) {
      await page.mouse.wheel(0, -100);
    }
    const maxScale = await page.evaluate(() => {
      // @ts-expect-error - window.renderer is exposed in main.ts for E2E testing
      return window.renderer.getScale();
    });
    expect(maxScale).toBeCloseTo(2.0);

    // Zoom out a lot
    for (let i = 0; i < 100; i++) {
      await page.mouse.wheel(0, 100);
    }
    const minScale = await page.evaluate(() => {
      // @ts-expect-error - window.renderer is exposed in main.ts for E2E testing
      return window.renderer.getScale();
    });
    expect(minScale).toBeCloseTo(0.05);
  });
});
