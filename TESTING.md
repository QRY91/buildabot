# Testing Guide

## Overview

This project uses [Vitest](https://vitest.dev/) as the testing framework. Vitest is fast, modern, and has excellent TypeScript support.

## Running Tests

### Basic Commands

```bash
# Run tests in watch mode (recommended for development)
npm test

# Run tests once (for CI/CD)
npm run test:run

# Run tests with UI (interactive browser interface)
npm run test:ui

# Run tests with coverage report
npm run test:coverage
```

### Watch Mode

When you run `npm test`, Vitest will watch for file changes and automatically re-run relevant tests. This is great for development!

Press keys in watch mode:
- `a` - Run all tests
- `f` - Run only failed tests
- `p` - Filter by filename
- `t` - Filter by test name
- `q` - Quit

## Test Structure

Tests are located in `src/__tests__/` directory:

```
src/
└── __tests__/
    ├── types.test.ts              # Type definitions validation
    ├── tools-base.test.ts         # Tool registry tests
    ├── tools-filesystem.test.ts   # Filesystem tool tests
    ├── tools-shell.test.ts        # Shell tool safety tests
    └── providers-ollama.test.ts   # Ollama provider tests (mocked)
```

## What's Tested

### 1. Type Definitions (`types.test.ts`)
- ✅ Message types (User, Assistant, Tool, System)
- ✅ Tool definitions structure
- ✅ Type safety and constraints

### 2. Tool Registry (`tools-base.test.ts`)
- ✅ Tool registration
- ✅ Tool retrieval
- ✅ Tool execution
- ✅ Error handling
- ✅ Invalid JSON arguments

### 3. Filesystem Tools (`tools-filesystem.test.ts`)
- ✅ Read file operations
- ✅ Write file operations
- ✅ Directory listing
- ✅ Error scenarios (non-existent files, invalid paths)
- ✅ File overwriting

### 4. Shell Tool (`tools-shell.test.ts`)
- ✅ Command whitelist enforcement
- ✅ Dangerous pattern blocking (rm, curl, pipes, redirects)
- ✅ Sandbox directory restriction
- ✅ Allowed commands execution
- ✅ Safety validations

### 5. Ollama Provider (`providers-ollama.test.ts`)
- ✅ HTTP requests (mocked)
- ✅ Message format conversion
- ✅ Tool call detection and parsing
- ✅ Error handling (API errors, network errors)
- ✅ Model selection
- ✅ Tool message conversion

## Writing Tests

### Basic Test Structure

```typescript
import { describe, it, expect } from 'vitest';

describe('Feature Name', () => {
  it('should do something', () => {
    const result = myFunction();
    expect(result).toBe('expected value');
  });
});
```

### Setup and Teardown

```typescript
import { beforeEach, afterEach } from 'vitest';

describe('Feature', () => {
  beforeEach(() => {
    // Runs before each test
  });

  afterEach(() => {
    // Runs after each test (cleanup)
  });
});
```

### Async Tests

```typescript
it('should handle async operations', async () => {
  const result = await asyncFunction();
  expect(result).toBe('value');
});
```

### Testing Errors

```typescript
it('should throw error', async () => {
  await expect(functionThatThrows()).rejects.toThrow('Error message');
});
```

## Mocking

### HTTP Requests (Ollama Provider)

We use `axios-mock-adapter` to mock HTTP calls:

```typescript
import MockAdapter from 'axios-mock-adapter';
import axios from 'axios';

const mock = new MockAdapter(axios);

// Mock a successful response
mock.onPost('http://localhost:11434/api/chat').reply(200, {
  message: { role: 'assistant', content: 'Hello!' },
  done: true,
});

// Mock an error
mock.onPost('http://localhost:11434/api/chat').reply(500, {
  error: 'Server error'
});

// Clean up
mock.restore();
```

## Coverage

Generate coverage report:

```bash
npm run test:coverage
```

Coverage reports are generated in `coverage/` directory:
- `coverage/index.html` - Browse in browser
- `coverage/coverage-final.json` - Machine-readable format

## Best Practices

### 1. Test Names
- Use descriptive names: "should do X when Y"
- Focus on behavior, not implementation

### 2. Test Organization
- Group related tests with `describe`
- One assertion per test (when possible)
- Test both success and failure cases

### 3. Test Isolation
- Each test should be independent
- Use `beforeEach`/`afterEach` for setup/cleanup
- Don't rely on test execution order

### 4. What to Test
- ✅ Public API behavior
- ✅ Error handling
- ✅ Edge cases
- ✅ Integration between components
- ❌ Implementation details
- ❌ Third-party library internals

## Adding New Tests

1. Create test file: `src/__tests__/feature-name.test.ts`
2. Import what you're testing
3. Write tests using `describe` and `it`
4. Run `npm test` to verify

Example:

```typescript
// src/__tests__/my-feature.test.ts
import { describe, it, expect } from 'vitest';
import { myFeature } from '../my-feature';

describe('MyFeature', () => {
  it('should work correctly', () => {
    expect(myFeature()).toBe('expected');
  });
});
```

## Debugging Tests

### Console Logging
```typescript
it('should debug', () => {
  console.log('Debug info:', value);
  expect(value).toBe('test');
});
```

### Run Single Test
```typescript
it.only('should run only this test', () => {
  // Only this test will run
});
```

### Skip Test
```typescript
it.skip('should skip this test', () => {
  // This test will be skipped
});
```

### Filter by Name
```bash
npm test -- --grep "specific test name"
```

## Continuous Integration

For CI/CD pipelines, use:

```bash
npm run test:run
```

This runs tests once without watch mode and exits with appropriate code for CI systems.

## Next Steps

Once you implement the Agent class (Phase 5), add tests for:
- Agent loop execution
- Message history management
- Tool execution flow
- Max iteration guards
- System prompt handling

Happy testing! 🧪
