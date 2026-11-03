import { Inject, Injectable } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import type { RequestProcessingConfig } from '../interfaces/request-processing-config.interface.js';
import { RequestProcessingModule } from '../request-processing.module.js';
import {
  REQUEST_LOGGER,
  REQUEST_PROCESSING_CONFIG,
} from '../tokens/request-processing.tokens.js';
import { loadRequestProcessingConfig } from './request-processing.config.js';
import { requestProcessingConfigProvider } from './request-processing.provider.js';

/**
 * Module D: the configuration is built from the environment, validated,
 * immutable and injected by token. See ASSIGNMENT.md, "Module D".
 */

const DEFAULTS: RequestProcessingConfig = {
  requestLoggingEnabled: true,
  timingLogsEnabled: true,
  maxPageSize: 100,
  requestIdHeader: 'x-request-id',
  environment: 'development',
};

describe('loadRequestProcessingConfig()', () => {
  it('returns the documented defaults for an empty environment', () => {
    expect(loadRequestProcessingConfig({})).toEqual(DEFAULTS);
  });

  it('reads every variable', () => {
    expect(
      loadRequestProcessingConfig({
        REQUEST_LOGGING_ENABLED: 'false',
        REQUEST_TIMING_ENABLED: 'false',
        MAX_PAGE_SIZE: '25',
        REQUEST_ID_HEADER: 'x-correlation-id',
        NODE_ENV: 'production',
      }),
    ).toEqual({
      requestLoggingEnabled: false,
      timingLogsEnabled: false,
      maxPageSize: 25,
      requestIdHeader: 'x-correlation-id',
      environment: 'production',
    });
  });

  it.each([
    ['true', true],
    ['TRUE', true],
    ['1', true],
    ['false', false],
    ['False', false],
    ['0', false],
  ])('parses the boolean "%s" as %s', (raw, expected) => {
    const config = loadRequestProcessingConfig({
      REQUEST_LOGGING_ENABLED: raw,
      REQUEST_TIMING_ENABLED: raw,
    });
    expect(config.requestLoggingEnabled).toBe(expected);
    expect(config.timingLogsEnabled).toBe(expected);
  });

  it('lower-cases the header name', () => {
    expect(
      loadRequestProcessingConfig({ REQUEST_ID_HEADER: 'X-Correlation-ID' })
        .requestIdHeader,
    ).toBe('x-correlation-id');
  });

  it.each([
    ['REQUEST_LOGGING_ENABLED', 'maybe'],
    ['REQUEST_LOGGING_ENABLED', ''],
    ['REQUEST_TIMING_ENABLED', 'yes please'],
    ['MAX_PAGE_SIZE', 'abc'],
    ['MAX_PAGE_SIZE', ''],
    ['MAX_PAGE_SIZE', '0'],
    ['MAX_PAGE_SIZE', '-5'],
    ['MAX_PAGE_SIZE', '1.5'],
    ['MAX_PAGE_SIZE', '1e3'],
    ['REQUEST_ID_HEADER', ''],
    ['REQUEST_ID_HEADER', 'has space'],
    ['REQUEST_ID_HEADER', 'bad:name'],
  ])('rejects %s="%s" and names the variable in the error', (name, value) => {
    expect(() => loadRequestProcessingConfig({ [name]: value })).toThrow(
      new RegExp(name),
    );
  });

  it('returns an immutable object', () => {
    expect(Object.isFrozen(loadRequestProcessingConfig({}))).toBe(true);
  });

  it('only looks at the env it is given, never at process.env', () => {
    vi.stubEnv('MAX_PAGE_SIZE', '7');
    try {
      expect(loadRequestProcessingConfig({}).maxPageSize).toBe(100);
    } finally {
      vi.unstubAllEnvs();
    }
  });

  it('does not modify the env it is given', () => {
    const env = { MAX_PAGE_SIZE: '25' };
    loadRequestProcessingConfig(env);
    expect(env).toEqual({ MAX_PAGE_SIZE: '25' });
  });
});

@Injectable()
class ConfigConsumer {
  constructor(
    @Inject(REQUEST_PROCESSING_CONFIG)
    readonly config: RequestProcessingConfig,
  ) {}
}

describe('requestProcessingConfigProvider (dependency injection)', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  const build = () =>
    Test.createTestingModule({
      providers: [requestProcessingConfigProvider, ConfigConsumer],
    }).compile();

  it('is registered under REQUEST_PROCESSING_CONFIG and can be injected', async () => {
    const moduleRef = await build();
    const consumer = moduleRef.get(ConfigConsumer);
    expect(consumer.config).toBeDefined();
    expect(consumer.config).toBe(moduleRef.get(REQUEST_PROCESSING_CONFIG));
  });

  it('exposes the values of the environment at module creation time', async () => {
    vi.stubEnv('MAX_PAGE_SIZE', '7');
    vi.stubEnv('REQUEST_ID_HEADER', 'x-trace-id');
    const first = (await build()).get<RequestProcessingConfig>(
      REQUEST_PROCESSING_CONFIG,
    );
    expect(first.maxPageSize).toBe(7);
    expect(first.requestIdHeader).toBe('x-trace-id');

    // The environment is read when the module is created, not once at import.
    vi.stubEnv('MAX_PAGE_SIZE', '9');
    const second = (await build()).get<RequestProcessingConfig>(
      REQUEST_PROCESSING_CONFIG,
    );
    expect(second.maxPageSize).toBe(9);
  });

  it('uses the defaults when nothing is configured', async () => {
    vi.stubEnv('MAX_PAGE_SIZE', undefined);
    vi.stubEnv('REQUEST_ID_HEADER', undefined);
    vi.stubEnv('REQUEST_LOGGING_ENABLED', undefined);
    vi.stubEnv('REQUEST_TIMING_ENABLED', undefined);
    const config = (await build()).get<RequestProcessingConfig>(
      REQUEST_PROCESSING_CONFIG,
    );
    expect(config).toMatchObject({
      requestLoggingEnabled: true,
      timingLogsEnabled: true,
      maxPageSize: 100,
      requestIdHeader: 'x-request-id',
    });
  });

  it('fails fast at startup on an invalid value, naming the variable', async () => {
    vi.stubEnv('MAX_PAGE_SIZE', 'lots');
    await expect(build()).rejects.toThrow(/MAX_PAGE_SIZE/);
  });

  it('can be replaced by a test configuration', async () => {
    const custom: RequestProcessingConfig = { ...DEFAULTS, maxPageSize: 3 };
    const moduleRef = await Test.createTestingModule({
      providers: [requestProcessingConfigProvider, ConfigConsumer],
    })
      .overrideProvider(REQUEST_PROCESSING_CONFIG)
      .useValue(custom)
      .compile();
    expect(moduleRef.get(ConfigConsumer).config.maxPageSize).toBe(3);
  });
});

describe('RequestProcessingModule', () => {
  it('provides and exports the config and the logger tokens', async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [RequestProcessingModule],
    }).compile();
    expect(moduleRef.get(REQUEST_PROCESSING_CONFIG, { strict: false })).toBeDefined();
    expect(
      moduleRef.get<{ log: unknown }>(REQUEST_LOGGER, { strict: false }).log,
    ).toBeTypeOf('function');
  });
});
