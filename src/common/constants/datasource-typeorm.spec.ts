import { DataSource } from './datasource-typeorm';

describe('DataSource Constants', () => {
  it('should be defined', () => {
    expect(DataSource).toBeDefined();
  });

  it('should have correct TYPEORM value', () => {
    expect(DataSource.TYPEORM).toBe('typeorm');
  });

  it('should have correct MEMORY value', () => {
    expect(DataSource.MEMORY).toBe('memory');
  });

  it('should have correct REDIS value', () => {
    expect(DataSource.REDIS).toBe('redis');
  });

  it('should have correct POSTGRES value', () => {
    expect(DataSource.POSTGRES).toBe('postgres');
  });

  it('should have all expected enum values', () => {
    const expectedValues = ['typeorm', 'memory', 'redis', 'postgres'];
    const actualValues = Object.values(DataSource);

    expect(actualValues).toEqual(expect.arrayContaining(expectedValues));
    expect(actualValues).toHaveLength(4);
  });

  it('should allow enum usage in conditionals', () => {
    expect(DataSource.TYPEORM === 'typeorm').toBe(true);
    expect(DataSource.MEMORY === 'memory').toBe(true);
    expect(DataSource.REDIS === 'redis').toBe(true);
    expect(DataSource.POSTGRES === 'postgres').toBe(true);
  });

  it('should support Object.keys and Object.values operations', () => {
    const keys = Object.keys(DataSource);
    const values = Object.values(DataSource);

    expect(keys).toContain('TYPEORM');
    expect(keys).toContain('MEMORY');
    expect(keys).toContain('REDIS');
    expect(keys).toContain('POSTGRES');

    expect(values).toContain('typeorm');
    expect(values).toContain('memory');
    expect(values).toContain('redis');
    expect(values).toContain('postgres');
  });
});
