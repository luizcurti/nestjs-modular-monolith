import { Test, TestingModule } from '@nestjs/testing';
import { ConsoleLogger } from '@nestjs/common';

class MockLogger extends ConsoleLogger {
  log(): void {
    // No-op for tests
  }
  error(): void {
    // No-op for tests
  }
  warn(): void {
    // No-op for tests
  }
  debug(): void {
    // No-op for tests
  }
  verbose(): void {
    // No-op for tests
  }
}

export class TestHelper {
  static async createTestingModule(
    moduleMetadata: any,
  ): Promise<TestingModule> {
    return Test.createTestingModule(moduleMetadata)
      .setLogger(new MockLogger())
      .compile();
  }
}
