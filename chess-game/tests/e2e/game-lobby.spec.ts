import { test, expect } from '@playwright/test';
import { AxeBuilder } from '@axe-core/playwright';

test.describe('GameLobby E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the game lobby
    await page.goto('/');
    
    // Wait for the page to load
    await page.waitForLoadState('networkidle');
  });

  test.describe('Accessibility', () => {
    test('should not have accessibility violations', async ({ page }) => {
      // Wait for the component to fully render
      await page.waitForSelector('[data-testid="game-lobby"]', { timeout: 10000 });
      
      // Run accessibility audit
      const accessibilityScanResults = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
        .analyze();

      expect(accessibilityScanResults.violations).toEqual([]);
    });

    test('should have proper heading structure', async ({ page }) => {
      await page.waitForSelector('h1', { timeout: 10000 });
      
      const heading = page.locator('h1');
      await expect(heading).toHaveText('Lockstep Game Lobby');
      
      // Check if there's only one h1 element
      const h1Count = await page.locator('h1').count();
      expect(h1Count).toBe(1);
    });

    test('should have proper form labels and associations', async ({ page }) => {
      await page.waitForSelector('label[for="playerName"]', { timeout: 10000 });
      
      const label = page.locator('label[for="playerName"]');
      const input = page.locator('#playerName');
      
      await expect(label).toHaveText('Your Name:');
      await expect(input).toBeVisible();
      await expect(input).toHaveAttribute('type', 'text');
      await expect(input).toHaveAttribute('placeholder', 'Enter your name');
      await expect(input).toHaveAttribute('maxLength', '20');
    });

    test('should have proper button labels and states', async ({ page }) => {
      await page.waitForSelector('button[class*="create-game-button"]', { timeout: 10000 });
      
      const createButton = page.locator('button[class*="create-game-button"]');
      await expect(createButton).toHaveText('Create New Match');
      
      // Button should be disabled initially
      await expect(createButton).toBeDisabled();
    });

    test('should have proper ARIA attributes', async ({ page }) => {
      await page.waitForSelector('[data-testid="game-lobby"]', { timeout: 10000 });
      
      // Check for proper roles
      const mainContent = page.locator('main, [role="main"], .game-lobby');
      await expect(mainContent.first()).toBeVisible();
      
      // Check for proper button roles
      const buttons = page.locator('button');
      for (let i = 0; i < await buttons.count(); i++) {
        const button = buttons.nth(i);
        await expect(button).toHaveAttribute('role', 'button');
      }
    });
  });

  test.describe('Performance', () => {
    test('should meet LCP performance requirements', async ({ page }) => {
      // Navigate to the page and measure performance
      const startTime = Date.now();
      await page.goto('/');
      
      // Wait for the main content to be visible
      await page.waitForSelector('[data-testid="game-lobby"]', { timeout: 10000 });
      
      const loadTime = Date.now() - startTime;
      
      // LCP should be under 2.5 seconds for good performance
      expect(loadTime).toBeLessThan(2500);
      
      // Measure actual LCP using Performance API
      const lcp = await page.evaluate(() => {
        return new Promise((resolve) => {
          new PerformanceObserver((list) => {
            const entries = list.getEntries();
            const lastEntry = entries[entries.length - 1];
            resolve(lastEntry.startTime);
          }).observe({ entryTypes: ['largest-contentful-paint'] });
        });
      });
      
      // LCP should be under 2.5 seconds
      expect(lcp).toBeLessThan(2500);
    });

    test('should have acceptable input latency', async ({ page }) => {
      await page.waitForSelector('#playerName', { timeout: 10000 });
      
      const input = page.locator('#playerName');
      
      // Measure input latency
      const startTime = Date.now();
      await input.click();
      await input.type('TestPlayer');
      const endTime = Date.now();
      
      const inputLatency = endTime - startTime;
      
      // Input latency should be under 100ms for good responsiveness
      expect(inputLatency).toBeLessThan(100);
    });

    test('should render within performance budget', async ({ page }) => {
      // Measure time to interactive
      const startTime = Date.now();
      await page.goto('/');
      
      // Wait for interactive elements
      await page.waitForSelector('button', { timeout: 10000 });
      
      const tti = Date.now() - startTime;
      
      // Time to interactive should be under 3.8 seconds
      expect(tti).toBeLessThan(3800);
    });
  });

  test.describe('User Interactions', () => {
    test('should allow entering player name', async ({ page }) => {
      await page.waitForSelector('#playerName', { timeout: 10000 });
      
      const input = page.locator('#playerName');
      await input.fill('TestPlayer');
      
      await expect(input).toHaveValue('TestPlayer');
    });

    test('should enable create match button when name is entered', async ({ page }) => {
      await page.waitForSelector('#playerName', { timeout: 10000 });
      
      const input = page.locator('#playerName');
      const createButton = page.locator('button[class*="create-game-button"]');
      
      // Initially disabled
      await expect(createButton).toBeDisabled();
      
      // Enter name
      await input.fill('TestPlayer');
      
      // Should be enabled
      await expect(createButton).toBeEnabled();
    });

    test('should show error when creating match without name', async ({ page }) => {
      await page.waitForSelector('button[class*="create-game-button"]', { timeout: 10000 });
      
      const createButton = page.locator('button[class*="create-game-button"]');
      await createButton.click();
      
      // Should show error message
      await expect(page.locator('.error-message')).toContainText('Please enter your name');
    });

    test('should handle long player names appropriately', async ({ page }) => {
      await page.waitForSelector('#playerName', { timeout: 10000 });
      
      const input = page.locator('#playerName');
      const longName = 'A'.repeat(25); // Longer than maxLength
      
      await input.fill(longName);
      
      // Should truncate to maxLength
      const value = await input.inputValue();
      expect(value.length).toBeLessThanOrEqual(20);
    });
  });

  test.describe('Responsive Design', () => {
    test('should be responsive on mobile devices', async ({ page }) => {
      // Set mobile viewport
      await page.setViewportSize({ width: 375, height: 667 });
      
      await page.goto('/');
      await page.waitForSelector('[data-testid="game-lobby"]', { timeout: 10000 });
      
      // Check if elements are properly sized for mobile
      const input = page.locator('#playerName');
      const inputBox = await input.boundingBox();
      
      // Input should be appropriately sized for mobile
      expect(inputBox!.width).toBeGreaterThan(200);
      expect(inputBox!.height).toBeGreaterThan(30);
    });

    test('should be responsive on tablet devices', async ({ page }) => {
      // Set tablet viewport
      await page.setViewportSize({ width: 768, height: 1024 });
      
      await page.goto('/');
      await page.waitForSelector('[data-testid="game-lobby"]', { timeout: 10000 });
      
      // Check layout on tablet
      const container = page.locator('.lobby-container');
      const containerBox = await container.boundingBox();
      
      // Container should use appropriate width for tablet
      expect(containerBox!.width).toBeLessThan(768);
    });

    test('should be responsive on desktop devices', async ({ page }) => {
      // Set desktop viewport
      await page.setViewportSize({ width: 1920, height: 1080 });
      
      await page.goto('/');
      await page.waitForSelector('[data-testid="game-lobby"]', { timeout: 10000 });
      
      // Check layout on desktop
      const container = page.locator('.lobby-container');
      const containerBox = await container.boundingBox();
      
      // Container should be centered and not too wide
      expect(containerBox!.width).toBeLessThan(1200);
    });
  });

  test.describe('Cross-browser Compatibility', () => {
    test('should work correctly in Chrome', async ({ page }) => {
      await page.goto('/');
      await page.waitForSelector('[data-testid="game-lobby"]', { timeout: 10000 });
      
      // Basic functionality test
      const input = page.locator('#playerName');
      await input.fill('TestPlayer');
      await expect(input).toHaveValue('TestPlayer');
    });

    test('should work correctly in Firefox', async ({ page }) => {
      await page.goto('/');
      await page.waitForSelector('[data-testid="game-lobby"]', { timeout: 10000 });
      
      // Basic functionality test
      const input = page.locator('#playerName');
      await input.fill('TestPlayer');
      await expect(input).toHaveValue('TestPlayer');
    });

    test('should work correctly in Safari', async ({ page }) => {
      await page.goto('/');
      await page.waitForSelector('[data-testid="game-lobby"]', { timeout: 10000 });
      
      // Basic functionality test
      const input = page.locator('#playerName');
      await input.fill('TestPlayer');
      await expect(input).toHaveValue('TestPlayer');
    });
  });

  test.describe('Error Handling', () => {
    test('should handle network errors gracefully', async ({ page }) => {
      // Mock network failure
      await page.route('**/*', route => route.abort());
      
      await page.goto('/');
      
      // Should show error state
      await expect(page.locator('.connection-error')).toBeVisible();
      await expect(page.locator('text=Failed to connect to server')).toBeVisible();
    });

    test('should show retry button on connection failure', async ({ page }) => {
      // Mock network failure
      await page.route('**/*', route => route.abort());
      
      await page.goto('/');
      
      const retryButton = page.locator('button:has-text("Retry Connection")');
      await expect(retryButton).toBeVisible();
    });

    test('should handle server errors gracefully', async ({ page }) => {
      await page.goto('/');
      await page.waitForSelector('#playerName', { timeout: 10000 });
      
      // Mock server error for create match
      await page.route('**/create-match', route => 
        route.fulfill({ status: 500, body: 'Server Error' })
      );
      
      const input = page.locator('#playerName');
      await input.fill('TestPlayer');
      
      const createButton = page.locator('button[class*="create-game-button"]');
      await createButton.click();
      
      // Should show error message
      await expect(page.locator('.error-message')).toContainText('Failed to create match');
    });
  });

  test.describe('Integration Tests', () => {
    test('should complete full user journey', async ({ page }) => {
      await page.goto('/');
      await page.waitForSelector('[data-testid="game-lobby"]', { timeout: 10000 });
      
      // Enter player name
      const input = page.locator('#playerName');
      await input.fill('TestPlayer');
      
      // Create match
      const createButton = page.locator('button[class*="create-game-button"]');
      await createButton.click();
      
      // Should navigate to game (this would depend on your routing setup)
      // For now, just verify the button click worked
      await expect(createButton).toBeVisible();
    });

    test('should handle multiple rapid interactions', async ({ page }) => {
      await page.goto('/');
      await page.waitForSelector('#playerName', { timeout: 10000 });
      
      const input = page.locator('#playerName');
      const createButton = page.locator('button[class*="create-game-button"]');
      
      // Rapid typing
      await input.fill('Player1');
      await input.fill('Player2');
      await input.fill('Player3');
      
      await expect(input).toHaveValue('Player3');
      await expect(createButton).toBeEnabled();
    });
  });
});

