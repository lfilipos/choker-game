# Testing Infrastructure

This document describes the comprehensive testing infrastructure for the Chess Game project, including unit tests, component tests, E2E tests, accessibility testing, and performance testing.

## 🧪 Test Types

### 1. Unit & Component Tests (Jest + React Testing Library)
- **Location**: `src/components/__tests__/`
- **Framework**: Jest + React Testing Library
- **Coverage**: Minimum 80% required
- **Run**: `npm test` or `npm run test:coverage`

### 2. E2E Tests (Playwright)
- **Location**: `tests/e2e/`
- **Framework**: Playwright
- **Browsers**: Chrome, Firefox, Safari
- **Run**: `npm run test:e2e`

### 3. Accessibility Tests (Axe + Playwright)
- **Framework**: Axe-core + Playwright
- **Standards**: WCAG 2.1 AA
- **Run**: `npm run test:accessibility`

### 4. Performance Tests (Playwright + Web Vitals)
- **Metrics**: LCP, Input Latency, TTI
- **Thresholds**: LCP < 2.5s, Input Latency < 100ms
- **Run**: `npm run test:performance`

## 🚀 Quick Start

### Run All Tests
```bash
npm run test:all
```

### Run Specific Test Types
```bash
# Unit and component tests
npm test

# E2E tests
npm run test:e2e

# Accessibility tests
npm run test:accessibility

# Performance tests
npm run test:performance

# With coverage
npm run test:coverage
```

## 📋 Test Coverage Requirements

- **Minimum Coverage**: 80%
- **Coverage Areas**: Lines, Functions, Branches, Statements
- **Quality Gates**: Build fails if coverage drops below threshold

## 🔧 Configuration Files

### Jest Configuration
- **File**: `jest.config.js`
- **Environment**: jsdom
- **Setup**: `jest.setup.js`
- **Coverage**: Istanbul

### Playwright Configuration
- **File**: `playwright.config.ts`
- **Browsers**: Chromium, Firefox, WebKit
- **Base URL**: http://localhost:3000
- **Screenshots**: On failure
- **Traces**: On first retry

### CI/CD Configuration
- **File**: `.github/workflows/test.yml`
- **Triggers**: Push to main/develop, PRs
- **Jobs**: Test, E2E, Accessibility, Performance, Security

## 🎯 Testing Standards

### Accessibility (WCAG 2.1 AA)
- Proper heading structure
- Form labels and associations
- ARIA attributes
- Keyboard navigation
- Screen reader compatibility

### Performance
- **LCP**: < 2.5 seconds
- **Input Latency**: < 100ms
- **TTI**: < 3.8 seconds
- **FCP**: < 1.8 seconds

### Code Quality
- ESLint with zero warnings
- TypeScript strict mode
- Consistent code formatting
- Proper error handling

## 🧩 Test Utilities

### Test Utils (`src/utils/test-utils.tsx`)
- Custom render function
- Accessibility testing helpers
- Performance measurement utilities
- Mock data generators
- Custom Jest matchers

### Mock Data
```typescript
import { createMockMatch, createMockMatches } from '../utils/test-utils';

const mockMatch = createMockMatch({ playerCount: 3 });
const mockMatches = createMockMatches(5);
```

## 📊 Test Reports

### Coverage Reports
- **Location**: `coverage/`
- **Format**: HTML, LCOV
- **Upload**: Codecov integration

### Playwright Reports
- **Location**: `playwright-report/`
- **Features**: Screenshots, traces, video
- **Upload**: GitHub Actions artifacts

### Test Results
- **Format**: Markdown
- **Location**: `test-report.md`
- **Generated**: After each test run

## 🔍 Debugging Tests

### Jest Debug Mode
```bash
npm test -- --verbose --detectOpenHandles
```

### Playwright Debug Mode
```bash
npx playwright test --debug
```

### VS Code Integration
- Jest extension for unit tests
- Playwright extension for E2E tests
- Debug configurations included

## 🚨 Common Issues & Solutions

### Test Failures
1. **Coverage below 80%**: Add more test cases
2. **Accessibility violations**: Fix ARIA attributes, labels
3. **Performance thresholds**: Optimize component rendering
4. **E2E timeouts**: Increase timeout values or fix selectors

### Mock Issues
1. **Socket service**: Ensure proper mocking
2. **CSS modules**: Mock with empty objects
3. **Browser APIs**: Mock in jest.setup.js

## 📈 Continuous Integration

### GitHub Actions
- **Matrix Testing**: Node 18.x, 20.x
- **Parallel Jobs**: Test, E2E, Accessibility, Performance
- **Quality Gates**: All tests must pass
- **Artifacts**: Test reports, coverage, screenshots

### Pre-commit Hooks
- Linting
- Type checking
- Unit tests
- Coverage check

## 🎨 Best Practices

### Writing Tests
1. **Arrange-Act-Assert**: Clear test structure
2. **Descriptive Names**: Test names explain behavior
3. **Single Responsibility**: One assertion per test
4. **Mock External Dependencies**: Socket, API calls

### Test Data
1. **Factory Functions**: Use mock data generators
2. **Realistic Data**: Mimic production scenarios
3. **Edge Cases**: Test boundary conditions
4. **Cleanup**: Reset state between tests

### Accessibility Testing
1. **WCAG Compliance**: Follow AA standards
2. **Screen Reader**: Test with assistive technologies
3. **Keyboard Navigation**: Ensure tab order
4. **Color Contrast**: Meet contrast requirements

## 🔮 Future Enhancements

### Planned Features
- Visual regression testing
- Load testing for multiplayer
- Cross-browser compatibility matrix
- Performance monitoring dashboard
- Automated accessibility audits

### Tools to Consider
- **Storybook**: Component development
- **Lighthouse CI**: Performance monitoring
- **Pa11y**: Accessibility automation
- **BackstopJS**: Visual regression

## 📚 Resources

### Documentation
- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [React Testing Library](https://testing-library.com/docs/react-testing-library/intro/)
- [Playwright Documentation](https://playwright.dev/docs/intro)
- [Axe-core Documentation](https://github.com/dequelabs/axe-core)

### Standards
- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [Web Vitals](https://web.dev/vitals/)
- [Testing Best Practices](https://testing-library.com/docs/guiding-principles)

## 🤝 Contributing

### Adding Tests
1. Create test file in appropriate directory
2. Follow naming convention: `ComponentName.test.tsx`
3. Ensure coverage for new functionality
4. Update this documentation if needed

### Test Review
- All new code must have tests
- Tests must pass CI checks
- Coverage must not decrease
- Accessibility tests must pass

---

**Note**: This testing infrastructure ensures code quality, accessibility compliance, and performance standards. All tests must pass before merging to main branch.

