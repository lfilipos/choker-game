import React from 'react';
import { render, RenderOptions } from '@testing-library/react';
import { axe } from 'jest-axe';

// Extend Jest matchers for accessibility testing
declare global {
  namespace jest {
    interface Matchers<R> {
      toHaveNoViolations(): R;
      toMeetPerformanceBudget(threshold: number): R;
    }
  }
}

// Custom matcher for accessibility testing
const toHaveNoViolations = (results: any) => {
  const pass = results.violations.length === 0;
  if (pass) {
    return {
      message: () => `expected accessibility violations but found none`,
      pass: true,
    };
  } else {
    return {
      message: () => `expected no accessibility violations but found ${results.violations.length}`,
      pass: false,
    };
  }
};

expect.extend({ toHaveNoViolations });

// Custom render function that includes providers
const customRender = (
  ui: React.ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) => render(ui, { ...options });

// Re-export everything
export * from '@testing-library/react';

// Override render method
export { customRender as render };

// Accessibility testing utilities
export const testAccessibility = async (container: HTMLElement) => {
  const results = await axe(container);
  expect(results).toHaveNoViolations();
  return results;
};

// Performance testing utilities
export const measurePerformance = (callback: () => void) => {
  const start = performance.now();
  callback();
  const end = performance.now();
  return end - start;
};

// Mock data generators
export const createMockMatch = (overrides: Partial<any> = {}) => ({
  id: 'test-match-123',
  status: 'waiting',
  playerCount: 2,
  createdAt: new Date().toISOString(),
  availableSlots: [
    { team: 'white', gameSlot: 'A' },
    { team: 'black', gameSlot: 'B' }
  ],
  ...overrides
});

export const createMockMatches = (count: number) => {
  return Array.from({ length: count }, (_, index) => 
    createMockMatch({
      id: `match-${index + 1}`,
      playerCount: Math.floor(Math.random() * 4) + 1,
      createdAt: new Date(Date.now() - Math.random() * 24 * 60 * 60 * 1000).toISOString()
    })
  );
};

// Test constants
export const TEST_CONSTANTS = {
  PERFORMANCE: {
    LCP_THRESHOLD: 2500, // 2.5 seconds
    INPUT_LATENCY_THRESHOLD: 100, // 100ms
    TTI_THRESHOLD: 3800, // 3.8 seconds
  },
  ACCESSIBILITY: {
    WCAG_LEVELS: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'],
  },
  TIMEOUTS: {
    DEFAULT: 10000,
    SHORT: 5000,
    LONG: 15000,
  },
} as const;

// Custom matchers for performance testing
export const customMatchers = {
  toMeetPerformanceBudget: (received: number, threshold: number) => {
    const pass = received <= threshold;
    if (pass) {
      return {
        message: () => `expected ${received} to be greater than ${threshold}`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected ${received} to be less than or equal to ${threshold}`,
        pass: false,
      };
    }
  },
};

// Extend Jest expect
declare global {
  namespace jest {
    interface Matchers<R> {
      toMeetPerformanceBudget(threshold: number): R;
    }
  }
}

// Add custom matchers to Jest
expect.extend(customMatchers);
