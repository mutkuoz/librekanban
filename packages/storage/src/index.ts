import type { StorageBackend as BackendName } from '@librekanban/shared';
import { createLocalStorage } from './local';
import { createS3Storage } from './s3';

/** Minimal interface every storage backend implements. */
export interface StorageBackend {
  put(key: string, data: Buffer | Uint8Array, contentType: string): Promise<void>;
  get(key: string): Promise<Buffer>;
  delete(key: string): Promise<void>;
  exists(key: string): Promise<boolean>;
}

export type StorageConfig =
  | { backend: Extract<BackendName, 'local'>; dir: string }
  | {
      backend: Extract<BackendName, 's3'>;
      endpoint?: string;
      region: string;
      bucket: string;
      accessKeyId: string;
      secretAccessKey: string;
    };

/** Pick a storage backend from validated config. Local disk is the default. */
export function createStorage(config: StorageConfig): StorageBackend {
  if (config.backend === 's3') {
    return createS3Storage(config);
  }
  return createLocalStorage(config.dir);
}

export { createLocalStorage, createS3Storage };
