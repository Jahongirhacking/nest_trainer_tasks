// src/types/express.d.ts
import { RequestMetadataInfo } from './request-metadata.interface.ts';

declare global {
  namespace Express {
    interface Request {
      requestMetadata?: RequestMetadataInfo;
    }
  }
}

export {};
