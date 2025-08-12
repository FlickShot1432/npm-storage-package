import AWS from "aws-sdk";
import fs from "fs";
import { Storage, StorageOptions } from "@google-cloud/storage";
import { BlobServiceClient, ContainerClient } from "@azure/storage-blob";

export type Provider = "s3" | "gcs" | "azure";
export type Operation = "upload" | "delete" | "getUrl";

// ✅ Define credentials type for AWS manually (because CredentialsOptions is not exported in v2)
type AWSCredentialsOptions = {
  accessKeyId: string;
  secretAccessKey: string;
  sessionToken?: string;
};

// ✅ Config interfaces
export interface S3Config {
  bucket: string;
  region?: string;
  credentials?: AWS.Credentials | AWSCredentialsOptions;
}

export interface GCSConfig {
  bucket: string;
  projectId?: string;
  keyFilename?: string;
  credentials?: StorageOptions["credentials"];
}

export interface AzureConfig {
  bucket: string;
  credentials: { connectionString: string };
}

export type StorageConfig = S3Config | GCSConfig | AzureConfig;

export interface FileOptions {
  filePath?: string;
  buffer?: Buffer; // NEW: Support for buffer uploads
  fileName?: string;
  mimeType?: string;
  key?: string; // For delete/getUrl
}

export async function storageAction(
  provider: Provider,
  operation: Operation,
  config: StorageConfig,
  options: FileOptions
): Promise<string | boolean> {
  if (!config?.bucket) throw new Error("Bucket name is required");

  switch (provider) {
    case "s3":
      return s3Action(operation, config as S3Config, options);
    case "gcs":
      return gcsAction(operation, config as GCSConfig, options);
    case "azure":
      return azureAction(operation, config as AzureConfig, options);
    default:
      throw new Error(`Unsupported provider: ${provider}`);
  }
}

// ✅ AWS S3
async function s3Action(
  operation: Operation,
  config: S3Config,
  options: FileOptions
): Promise<string | boolean> {
  const s3 = new AWS.S3({
    region: config.region,
    credentials: config.credentials,
  });

  if (operation === "upload") {
    if (!options.fileName) {
      throw new Error("fileName is required");
    }
    if (!options.filePath && !options.buffer) {
      throw new Error("Either filePath or buffer is required");
    }

    let data: Buffer;
    if (options.buffer) {
      data = options.buffer;
    } else {
      data = fs.readFileSync(options.filePath!);
    }

    await s3
      .putObject({
        Bucket: config.bucket,
        Key: options.fileName,
        Body: data,
        ContentType: options.mimeType,
      })
      .promise();

    return `https://${config.bucket}.s3.amazonaws.com/${options.fileName}`;
  }

  if (operation === "delete") {
    if (!options.key) throw new Error("key is required for delete operation");
    await s3.deleteObject({ Bucket: config.bucket, Key: options.key }).promise();
    return true;
  }

  if (operation === "getUrl") {
    if (!options.key) throw new Error("key is required for getUrl operation");
    // Check if file exists before returning URL
    try {
      await s3.headObject({ Bucket: config.bucket, Key: options.key }).promise();
    } catch (error: any) {
      if (error.code === "NotFound" || error.statusCode === 404) {
        throw new Error(`File not found: ${options.key}`);
      }
      throw error;
    }
    return `https://${config.bucket}.s3.amazonaws.com/${options.key}`;
  }

  throw new Error(`Unsupported operation: ${operation}`);
}

// ✅ Google Cloud Storage
async function gcsAction(
  operation: Operation,
  config: GCSConfig,
  options: FileOptions
): Promise<string | boolean> {
  // Build GCS storage options
  const storageOptions: StorageOptions = {};
  if (config.projectId) {
    storageOptions.projectId = config.projectId;
  }
  if (config.keyFilename) {
    storageOptions.keyFilename = config.keyFilename;
  }
  if (config.credentials) {
    storageOptions.credentials = config.credentials;
  }
  const storage = new Storage(storageOptions);
  const bucket = storage.bucket(config.bucket);

  if (operation === "upload") {
    if (!options.fileName) {
      throw new Error("fileName is required");
    }
    if (!options.filePath && !options.buffer) {
      throw new Error("Either filePath or buffer is required");
    }

    const file = bucket.file(options.fileName);
    if (options.buffer) {
      // Upload from buffer
      await file.save(options.buffer, {
        metadata: {
          contentType: options.mimeType,
        },
      });
    } else {
      // Upload from file path
      await bucket.upload(options.filePath!, { destination: options.fileName });
    }
    return `https://storage.googleapis.com/${config.bucket}/${options.fileName}`;
  }

  if (operation === "delete") {
    if (!options.key) throw new Error("key is required for delete operation");
    await bucket.file(options.key).delete();
    return true;
  }

  if (operation === "getUrl") {
    if (!options.key) throw new Error("key is required for getUrl operation");
    // Check if file exists before returning URL
    const file = bucket.file(options.key);
    const [exists] = await file.exists();
    if (!exists) {
      throw new Error(`File not found: ${options.key}`);
    }
    return `https://storage.googleapis.com/${config.bucket}/${options.key}`;
  }

  throw new Error(`Unsupported operation: ${operation}`);
}

// ✅ Azure Blob Storage
async function azureAction(
  operation: Operation,
  config: AzureConfig,
  options: FileOptions
): Promise<string | boolean> {
  if (!config.credentials?.connectionString) {
    throw new Error("Azure connectionString is required in credentials");
  }

  const client = BlobServiceClient.fromConnectionString(config.credentials.connectionString);
  const container: ContainerClient = client.getContainerClient(config.bucket);

  if (operation === "upload") {
    if (!options.fileName) {
      throw new Error("fileName is required");
    }
    if (!options.filePath && !options.buffer) {
      throw new Error("Either filePath or buffer is required");
    }

    const blob = container.getBlockBlobClient(options.fileName);
    if (options.buffer) {
      // Upload from buffer
      await blob.upload(options.buffer, options.buffer.length, {
        blobHTTPHeaders: {
          blobContentType: options.mimeType,
        },
      });
    } else {
      // Upload from file path
      await blob.uploadFile(options.filePath!);
    }
    return blob.url;
  }

  if (operation === "delete") {
    if (!options.key) throw new Error("key is required for delete operation");
    await container.deleteBlob(options.key);
    return true;
  }

  if (operation === "getUrl") {
    if (!options.key) throw new Error("key is required for getUrl operation");
    // Check if file exists before returning URL
    const blob = container.getBlockBlobClient(options.key);
    const exists = await blob.exists();
    if (!exists) {
      throw new Error(`File not found: ${options.key}`);
    }
    return `${container.url}/${options.key}`;
  }

  throw new Error(`Unsupported operation: ${operation}`);
}
