import { expect, test, describe, beforeEach } from 'vitest'

describe('main.ts', () => {
  beforeEach(() => {
    document.body.innerHTML = '<div id="app"></div>'
  })

  test('renders app and initializes counter', async () => {
    // import main.ts dynamically to run its top-level code
    await import('./main?test=' + Date.now())
    const app = document.querySelector('#app')
    expect(app).not.toBeNull()
    const counter = document.querySelector('#counter')
    expect(counter).not.toBeNull()
    expect(counter!.innerHTML).toBe('count is 0')
  })
})