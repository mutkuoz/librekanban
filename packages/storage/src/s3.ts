import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import type { StorageBackend, StorageConfig } from './index';

type S3Config = Extract<StorageConfig, { backend: 's3' }>;

/** S3-compatible storage (AWS S3, MinIO, R2, B2, …) for scaled deployments. */
export function createS3Storage(config: S3Config): StorageBackend {
  const client = new S3Client({
    region: config.region,
    endpoint: config.endpoint,
    forcePathStyle: Boolean(config.endpoint), // MinIO/R2 path-style addressing
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    },
  });
  const Bucket = config.bucket;

  return {
    async put(key, data, contentType) {
      await client.send(
        new PutObjectCommand({ Bucket, Key: key, Body: data, ContentType: contentType }),
      );
    },
    async get(key) {
      const res = await client.send(new GetObjectCommand({ Bucket, Key: key }));
      const bytes = await res.Body?.transformToByteArray();
      if (!bytes) throw new Error(`Empty object: ${key}`);
      return Buffer.from(bytes);
    },
    async delete(key) {
      await client.send(new DeleteObjectCommand({ Bucket, Key: key }));
    },
    async exists(key) {
      try {
        await client.send(new HeadObjectCommand({ Bucket, Key: key }));
        return true;
      } catch {
        return false;
      }
    },
  };
}
