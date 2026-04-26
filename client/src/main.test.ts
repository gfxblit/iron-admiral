import { expect, test, describe, beforeEach, vi } from "vitest";

describe("main.ts", () => {
  beforeEach(() => {
    vi.resetModules();
    document.body.innerHTML = '<div id="app"></div>';
    
    // Mock HTMLCanvasElement.prototype.getContext
    HTMLCanvasElement.prototype.getContext = vi.fn().mockReturnValue({
      beginPath: vi.fn(),
      moveTo: vi.fn(),
      lineTo: vi.fn(),
      stroke: vi.fn(),
      fill: vi.fn(),
      clearRect: vi.fn(),
      setTransform: vi.fn(),
      save: vi.fn(),
      restore: vi.fn(),
      arc: vi.fn(),
      fillText: vi.fn(),
      measureText: vi.fn(() => ({ width: 0 })),
      translate: vi.fn(),
      rotate: vi.fn(),
      scale: vi.fn(),
      fillRect: vi.fn(),
      strokeRect: vi.fn(),
    });
  });

  test("renders app and initializes game UI", async () => {
    // import main.ts dynamically to run its top-level code
    await import("./main");
    const app = document.querySelector("#app");
    expect(app).not.toBeNull();
    
    const statusText = document.querySelector("#status-text");
    expect(statusText).not.toBeNull();
    // It might be "Connecting..." or "Connected" depending on race condition
    expect(["Connecting...", "Connected"]).toContain(statusText!.textContent);

    const shipsCount = document.querySelector("#ships-count");
    expect(shipsCount).not.toBeNull();
    expect(shipsCount!.textContent).toBe("0");
  });
});
