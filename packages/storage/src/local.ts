import { mkdir, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { dirname, join, resolve, sep } from 'node:path';
import type { StorageBackend } from './index';

/**
 * Local-disk storage — the zero-dependency default for self-hosting. Files
 * live under a single root directory; keys are sanitised so they can never
 * escape it.
 */
export function createLocalStorage(rootDir: string): StorageBackend {
  const root = resolve(rootDir);

  const pathFor = (key: string): string => {
    const target = resolve(join(root, key));
    if (target !== root && !target.startsWith(root + sep)) {
      throw new Error(`Invalid storage key (path traversal): ${key}`);
    }
    return target;
  };

  return {
    async put(key, data, _contentType) {
      const target = pathFor(key);
      await mkdir(dirname(target), { recursive: true });
      await writeFile(target, data);
    },
    async get(key) {
      return readFile(pathFor(key));
    },
    async delete(key) {
      await rm(pathFor(key), { force: true });
    },
    async exists(key) {
      try {
        await stat(pathFor(key));
        return true;
      } catch {
        return false;
      }
    },
  };
}
