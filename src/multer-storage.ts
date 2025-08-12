import { StorageEngine } from "multer";
import { storageAction, Provider, StorageConfig } from "./storageAction.js";
import { Request } from "express";

// Custom file object that multer will use
export interface CloudFile {
  fieldname: string;
  originalname: string;
  encoding: string;
  mimetype: string;
  size: number;
  destination: string;
  filename: string;
  path: string;
  buffer: Buffer;
  // Cloud storage specific properties
  cloudUrl?: string;
  cloudKey?: string;
}

// Field-specific configuration for multi-field uploads
export interface FieldConfig {
  name: string;
  maxCount?: number;
  destination?: string;
  allowedExtensions?: string[];
  generateFileName?: (req: Request, file: Express.Multer.File) => string;
}

// Advanced multi-field configuration
export interface MultiFieldOptions {
  fields: FieldConfig[];
  fileSizeLimit?: number; // in bytes
  globalFileFilter?: (req: Request, file: Express.Multer.File) => boolean;
}

// Options for the cloud storage engine
export interface CloudStorageOptions {
  provider: Provider;
  config: StorageConfig;
  generateFileName?: (req: Request, file: Express.Multer.File) => string;
  fileFilter?: (req: Request, file: Express.Multer.File) => boolean;
  destination?: string | ((req: Request, file: Express.Multer.File) => string);
  // New: field-specific configurations
  fieldConfigs?: Record<string, FieldConfig>;
  fileSizeLimit?: number;
}

// Custom multer storage engine for cloud storage
export class CloudStorageEngine implements StorageEngine {
  private provider: Provider;
  private config: StorageConfig;
  private generateFileName?: (req: Request, file: Express.Multer.File) => string;
  private fileFilter?: (req: Request, file: Express.Multer.File) => boolean;
  private destination?: string | ((req: Request, file: Express.Multer.File) => string);
  private fieldConfigs?: Record<string, FieldConfig>;
  private fileSizeLimit?: number;

  constructor(options: CloudStorageOptions) {
    this.provider = options.provider;
    this.config = options.config;
    this.generateFileName = options.generateFileName;
    this.fileFilter = options.fileFilter;
    this.destination = options.destination;
    this.fieldConfigs = options.fieldConfigs;
    this.fileSizeLimit = options.fileSizeLimit;
  }

  _handleFile(
    req: Request,
    file: Express.Multer.File,
    callback: (error?: any, info?: Partial<CloudFile>) => void
  ): void {
    // Get field-specific configuration
    const fieldConfig = this.fieldConfigs?.[file.fieldname];

    // Apply global file filter first
    if (this.fileFilter && !this.fileFilter(req, file)) {
      return callback(new Error("File type not allowed"));
    }

    // Apply field-specific extension validation
    if (fieldConfig?.allowedExtensions) {
      const fileExtension = file.originalname.toLowerCase().split(".").pop();
      if (!fileExtension || !fieldConfig.allowedExtensions.includes(`.${fileExtension}`)) {
        return callback(
          new Error(
            `File extension not allowed for field '${file.fieldname}'. Allowed: ${fieldConfig.allowedExtensions.join(", ")}`
          )
        );
      }
    }

    // Generate filename using field-specific or global generator
    let fileName: string;
    if (fieldConfig?.generateFileName) {
      fileName = fieldConfig.generateFileName(req, file);
    } else if (this.generateFileName) {
      fileName = this.generateFileName(req, file);
    } else {
      // Use field-specific destination or global destination
      const dest =
        fieldConfig?.destination ||
        (typeof this.destination === "function" ? this.destination(req, file) : this.destination) ||
        "";
      const cleanDest = dest.replace(/[\\\/]+$/, ""); // Remove trailing slashes
      fileName = cleanDest
        ? `${cleanDest}/${Date.now()}-${file.originalname}`
        : `${Date.now()}-${file.originalname}`;
    }

    // Collect file data
    const chunks: Buffer[] = [];
    let totalSize = 0;

    file.stream.on("data", (chunk: Buffer) => {
      chunks.push(chunk);
      totalSize += chunk.length;

      // Check file size limit (global or field-specific)
      const sizeLimit = this.fileSizeLimit;
      if (sizeLimit && totalSize > sizeLimit) {
        return callback(
          new Error(`File size exceeds limit of ${Math.round(sizeLimit / (1024 * 1024))}MB`)
        );
      }
    });

    file.stream.on("error", (error) => {
      callback(error);
    });

    file.stream.on("end", async () => {
      try {
        // Combine all chunks into a single buffer
        const buffer = Buffer.concat(chunks, totalSize);

        // Upload to cloud storage
        const uploadedUrl = await storageAction(this.provider, "upload", this.config, {
          fileName,
          buffer, // Pass buffer instead of file path
          mimeType: file.mimetype,
        });

        // Return file info that multer expects
        const fileInfo: Partial<CloudFile> = {
          fieldname: file.fieldname,
          originalname: file.originalname,
          encoding: file.encoding,
          mimetype: file.mimetype,
          size: totalSize,
          destination: fieldConfig?.destination || (this.destination as string) || "",
          filename: fileName,
          path: uploadedUrl as string, // Use cloud URL as path
          buffer,
          cloudUrl: uploadedUrl as string,
          cloudKey: fileName,
        };

        callback(null, fileInfo);
      } catch (error) {
        callback(error);
      }
    });
  }

  _removeFile(req: Request, file: CloudFile, callback: (error: Error | null) => void): void {
    // Implement file removal from cloud storage
    if (file.cloudKey) {
      storageAction(this.provider, "delete", this.config, { key: file.cloudKey })
        .then(() => callback(null))
        .catch((error) => callback(error));
    } else {
      callback(null);
    }
  }
}

// Factory functions to create storage engines
export function createS3Storage(
  options: Omit<CloudStorageOptions, "provider">
): CloudStorageEngine {
  return new CloudStorageEngine({ ...options, provider: "s3" });
}

export function createGCSStorage(
  options: Omit<CloudStorageOptions, "provider">
): CloudStorageEngine {
  return new CloudStorageEngine({ ...options, provider: "gcs" });
}

export function createAzureStorage(
  options: Omit<CloudStorageOptions, "provider">
): CloudStorageEngine {
  return new CloudStorageEngine({ ...options, provider: "azure" });
}
