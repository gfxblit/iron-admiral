import { expect, test, describe, beforeEach } from "vitest";
import { setupCounter } from "./counter";

describe("counter.ts", () => {
  let button: HTMLButtonElement;

  beforeEach(() => {
    button = document.createElement("button");
  });

  test("initializes with count is 0", () => {
    setupCounter(button);
    expect(button.innerHTML).toBe("count is 0");
  });

  test("increments counter on click", () => {
    setupCounter(button);
    button.click();
    expect(button.innerHTML).toBe("count is 1");
    button.click();
    expect(button.innerHTML).toBe("count is 2");
  });
});
