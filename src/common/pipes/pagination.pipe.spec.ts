import { BadRequestException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import type { RequestProcessingConfig } from '../interfaces/request-processing-config.interface.js';
import { REQUEST_PROCESSING_CONFIG } from '../tokens/request-processing.tokens.js';
import {
  DEFAULT_LIMIT,
  DEFAULT_PAGE,
  PaginationPipe,
} from './pagination.pipe.js';

/** Module C: `?page=2&limit=10` -> `{ page: 2, limit: 10 }`. */
const config = (maxPageSize: number): RequestProcessingConfig => ({
  requestLoggingEnabled: true,
  timingLogsEnabled: true,
  maxPageSize,
  requestIdHeader: 'x-request-id',
  environment: 'test',
});

describe('PaginationPipe', () => {
  const pipe = new PaginationPipe(config(50));

  describe('defaults', () => {
    it('uses page 1 and the default limit when the query is empty', () => {
      expect(pipe.transform({})).toEqual({
        page: DEFAULT_PAGE,
        limit: DEFAULT_LIMIT,
      });
      expect(DEFAULT_PAGE).toBe(1);
      expect(DEFAULT_LIMIT).toBe(10);
    });

    it('fills in only the missing value', () => {
      expect(pipe.transform({ page: '3' })).toEqual({ page: 3, limit: 10 });
      expect(pipe.transform({ limit: '5' })).toEqual({ page: 1, limit: 5 });
    });

    it('never defaults above the configured maximum', () => {
      expect(new PaginationPipe(config(5)).transform({})).toEqual({
        page: 1,
        limit: 5,
      });
    });
  });

  describe('numeric strings', () => {
    it('converts them to numbers', () => {
      const result = pipe.transform({ page: '2', limit: '10' });
      expect(result).toEqual({ page: 2, limit: 10 });
      expect(typeof result.page).toBe('number');
      expect(typeof result.limit).toBe('number');
    });

    it('ignores every other query key and returns only page and limit', () => {
      const result = pipe.transform({ page: '2', limit: '5', sort: 'desc', q: 'x' });
      expect(Object.keys(result).sort()).toEqual(['limit', 'page']);
    });
  });

  describe('maximum page size', () => {
    it('accepts a limit equal to the maximum', () => {
      expect(pipe.transform({ limit: '50' }).limit).toBe(50);
    });

    it('rejects a limit above the maximum (it is not clamped)', () => {
      expect(() => pipe.transform({ limit: '51' })).toThrow(BadRequestException);
      expect(() => pipe.transform({ limit: '1000000' })).toThrow(BadRequestException);
    });

    it('reads the maximum from the injected configuration', () => {
      expect(new PaginationPipe(config(5)).transform({ limit: '5' }).limit).toBe(5);
      expect(() => new PaginationPipe(config(5)).transform({ limit: '6' })).toThrow(
        BadRequestException,
      );
      expect(new PaginationPipe(config(500)).transform({ limit: '400' }).limit).toBe(
        400,
      );
    });

    it('gets the configuration through dependency injection', async () => {
      const moduleRef = await Test.createTestingModule({
        providers: [
          PaginationPipe,
          { provide: REQUEST_PROCESSING_CONFIG, useValue: config(7) },
        ],
      }).compile();
      const injected = moduleRef.get(PaginationPipe);
      expect(() => injected.transform({ limit: '8' })).toThrow(BadRequestException);
      expect(injected.transform({ limit: '7' }).limit).toBe(7);
    });
  });

  describe('invalid values -> BadRequestException', () => {
    it.each([
      ['an empty string', ''],
      ['a word', 'abc'],
      ['zero', '0'],
      ['a negative number', '-1'],
      ['a decimal', '1.5'],
      ['exponent notation', '1e1'],
      ['a plus sign', '+2'],
      ['whitespace', ' 2'],
      ['digits and letters', '2abc'],
      ['a number beyond MAX_SAFE_INTEGER', '9007199254740992'],
    ])('rejects %s as page', (_name, value) => {
      expect(() => pipe.transform({ page: value })).toThrow(BadRequestException);
    });

    it.each([
      ['an empty string', ''],
      ['a word', 'abc'],
      ['zero', '0'],
      ['a negative number', '-10'],
      ['a decimal', '2.5'],
    ])('rejects %s as limit', (_name, value) => {
      expect(() => pipe.transform({ limit: value })).toThrow(BadRequestException);
    });

    it('rejects a repeated parameter (?page=1&page=2 arrives as an array)', () => {
      expect(() => pipe.transform({ page: ['1', '2'] })).toThrow(BadRequestException);
      expect(() => pipe.transform({ limit: ['5', '6'] })).toThrow(BadRequestException);
    });

    it('rejects a nested value (?page[a]=1)', () => {
      expect(() => pipe.transform({ page: { a: '1' } })).toThrow(BadRequestException);
    });

    it('answers 400 and names the offending parameter', () => {
      try {
        pipe.transform({ limit: 'abc' });
        expect.unreachable('should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(BadRequestException);
        expect((error as BadRequestException).getStatus()).toBe(400);
        expect((error as BadRequestException).message).toMatch(/limit/i);
      }
    });
  });
});
