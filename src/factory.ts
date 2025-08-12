import { createStorageUploadMiddleware, type StorageMiddlewareOptions } from "./middleware.js";
import {
  createS3Storage,
  createGCSStorage,
  createAzureStorage,
  type CloudStorageOptions,
  type FieldConfig,
} from "./multer-storage.js";
import { type StorageConfig, type Provider } from "./storageAction.js";
import multer from "multer";

interface FlexibleUploadOptions {
  // For single file upload
  destination?: string;
  generateFileName?: (req: any, file: any) => string;
  fileFilter?: (req: any, file: any) => boolean;
  
  // For advanced multi-field upload
  fieldPaths?: Record<string, string>;
  allowedExtensions?: Record<string, string[]>;
  fileSizeLimit?: number;
  fieldConfigs?: Record<string, FieldConfig>;
  
  // General options
  limits?: {
    fileSize?: number;
    files?: number;
  };
}

// Configuration factory class
export class StorageFactory {
  private configs: Record<Provider, StorageConfig>;

  constructor(configs: { s3?: StorageConfig; gcs?: StorageConfig; azure?: StorageConfig }) {
    this.configs = {} as Record<Provider, StorageConfig>;

    if (configs.s3) this.configs.s3 = configs.s3;
    if (configs.gcs) this.configs.gcs = configs.gcs;
    if (configs.azure) this.configs.azure = configs.azure;
  }

  // Legacy middleware creators (kept for backward compatibility)
  s3Upload(options?: Omit<StorageMiddlewareOptions, "provider" | "config">) {
    if (!this.configs.s3) {
      throw new Error("S3 configuration not provided");
    }
    return createStorageUploadMiddleware({
      provider: "s3",
      config: this.configs.s3,
      ...options,
    });
  }

  gcsUpload(options?: Omit<StorageMiddlewareOptions, "provider" | "config">) {
    if (!this.configs.gcs) {
      throw new Error("GCS configuration not provided");
    }
    return createStorageUploadMiddleware({
      provider: "gcs",
      config: this.configs.gcs,
      ...options,
    });
  }

  azureUpload(options?: Omit<StorageMiddlewareOptions, "provider" | "config">) {
    if (!this.configs.azure) {
      throw new Error("Azure configuration not provided");
    }
    return createStorageUploadMiddleware({
      provider: "azure",
      config: this.configs.azure,
      ...options,
    });
  }

  // MAIN API: Flexible Advanced Upload Methods
  // These methods can handle single file, multiple files, and multiple fields
  
  s3Multer(options: FlexibleUploadOptions = {}) {
    if (!this.configs.s3) {
      throw new Error("S3 configuration not provided");
    }

    const storage = createS3Storage({
      config: this.configs.s3,
      ...this.processFlexibleOptions(options),
    });

    return multer({ 
      storage, 
      limits: options.limits || (options.fileSizeLimit ? { fileSize: options.fileSizeLimit } : undefined)
    });
  }

  gcsMulter(options: FlexibleUploadOptions = {}) {
    if (!this.configs.gcs) {
      throw new Error("GCS configuration not provided");
    }

    const storage = createGCSStorage({
      config: this.configs.gcs,
      ...this.processFlexibleOptions(options),
    });

    return multer({ 
      storage, 
      limits: options.limits || (options.fileSizeLimit ? { fileSize: options.fileSizeLimit } : undefined)
    });
  }

  azureMulter(options: FlexibleUploadOptions = {}) {
    if (!this.configs.azure) {
      throw new Error("Azure configuration not provided");
    }

    const storage = createAzureStorage({
      config: this.configs.azure,
      ...this.processFlexibleOptions(options),
    });

    return multer({ 
      storage, 
      limits: options.limits || (options.fileSizeLimit ? { fileSize: options.fileSizeLimit } : undefined)
    });
  }

  // Helper method to process flexible options
  private processFlexibleOptions(options: FlexibleUploadOptions): Omit<CloudStorageOptions, "config"> {
    const result: any = {};

    // Handle basic options
    if (options.destination) result.destination = options.destination;
    if (options.generateFileName) result.generateFileName = options.generateFileName;
    if (options.fileFilter) result.fileFilter = options.fileFilter;
    if (options.fileSizeLimit) result.fileSizeLimit = options.fileSizeLimit;

    // Handle field configs (for multi-field uploads)
    if (options.fieldConfigs) {
      result.fieldConfigs = options.fieldConfigs;
    } else if (options.fieldPaths && options.allowedExtensions) {
      // Convert fieldPaths and allowedExtensions to fieldConfigs format
      const fieldConfigs: Record<string, FieldConfig> = {};
      Object.keys(options.fieldPaths).forEach((fieldName) => {
        fieldConfigs[fieldName] = {
          name: fieldName,
          destination: options.fieldPaths![fieldName],
          allowedExtensions: options.allowedExtensions![fieldName],
        };
      });
      result.fieldConfigs = fieldConfigs;
    }

    return result;
  }

  // Generic upload method
  upload(provider: Provider, options?: Omit<StorageMiddlewareOptions, "provider" | "config">) {
    if (!this.configs[provider]) {
      throw new Error(`${provider} configuration not provided`);
    }
    return createStorageUploadMiddleware({
      provider,
      config: this.configs[provider],
      ...options,
    });
  }
}

// Simple factory functions (alternative approach)
export function createS3Middleware(config: StorageConfig) {
  return (options?: Omit<StorageMiddlewareOptions, "provider" | "config">) =>
    createStorageUploadMiddleware({
      provider: "s3",
      config,
      ...options,
    });
}

export function createGCSMiddleware(config: StorageConfig) {
  return (options?: Omit<StorageMiddlewareOptions, "provider" | "config">) =>
    createStorageUploadMiddleware({
      provider: "gcs",
      config,
      ...options,
    });
}

export function createAzureMiddleware(config: StorageConfig) {
  return (options?: Omit<StorageMiddlewareOptions, "provider" | "config">) =>
    createStorageUploadMiddleware({
      provider: "azure",
      config,
      ...options,
    });
}
