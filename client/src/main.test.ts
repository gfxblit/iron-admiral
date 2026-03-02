import { expect, test, describe, beforeEach, vi } from 'vitest'

describe('main.ts', () => {
  beforeEach(() => {
    vi.resetModules()
    document.body.innerHTML = '<div id="app"></div>'
  })

  test('renders app and initializes counter', async () => {
    // import main.ts dynamically to run its top-level code
    await import('./main')
    const app = document.querySelector('#app')
    expect(app).not.toBeNull()
    const counter = document.querySelector('#counter')
    expect(counter).not.toBeNull()
    expect(counter!.innerHTML).toBe('count is 0')
  })
})