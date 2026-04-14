let mockCounter = 100;

export function mockId(prefix = "mock"): string {
  return `${prefix}-${++mockCounter}`;
}

export function mockTimestamp(): string {
  return new Date().toISOString();
}
