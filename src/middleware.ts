import { storageAction, Provider, StorageConfig } from "./storageAction.js";
import fs from "fs";

// Types for Express-like request/response objects
export interface RequestLike {
  file?: FileUpload;
  files?: FileUpload | FileUpload[];
  uploadedFiles?: {
    [fieldName: string]: string | string[];
  };
}

export interface ResponseLike {
  status: (code: number) => ResponseLike;
  json: (data: any) => void;
}

export interface NextFunctionLike {
  (error?: any): void;
}

export interface FileUpload {
  fieldname: string;
  originalname: string;
  encoding: string;
  mimetype: string;
  size: number;
  destination: string;
  filename: string;
  path: string;
  buffer?: Buffer;
}

export interface StorageMiddlewareOptions {
  provider: Provider;
  config: StorageConfig;
  fieldName?: string;
  multiple?: boolean;
  fileFilter?: (req: RequestLike, file: FileUpload) => boolean;
  limits?: {
    fileSize?: number;
    files?: number;
  };
  generateFileName?: (req: RequestLike, file: FileUpload) => string;
  // NEW: Support for multiple fields
  fields?: Array<{
    fieldName: string;
    maxCount?: number;
    fileFilter?: (req: RequestLike, file: FileUpload) => boolean;
    generateFileName?: (req: RequestLike, file: FileUpload) => string;
    folder?: string;
  }>;
}

// Create storage upload middleware function
export function createStorageUploadMiddleware(options: StorageMiddlewareOptions) {
  return async (req: RequestLike, res: ResponseLike, next: NextFunctionLike) => {
    try {
      // Initialize uploadedFiles if not present
      if (!req.uploadedFiles) {
        req.uploadedFiles = {};
      }

      // Handle multiple fields if provided
      if (options.fields && options.fields.length > 0) {
        const files = req.files as any;
        for (const fieldConfig of options.fields) {
          const fieldFiles = files?.[fieldConfig.fieldName];
          if (!fieldFiles) continue;

          const filesToProcess = Array.isArray(fieldFiles) ? fieldFiles : [fieldFiles];
          const uploadedUrls: string[] = [];
          for (const file of filesToProcess) {
            // Apply field-specific filter
            if (fieldConfig.fileFilter && !fieldConfig.fileFilter(req, file)) {
              // Clean up the temp file
              if (file.path && fs.existsSync(file.path)) {
                fs.unlinkSync(file.path);
              }
              continue;
            }

            // Generate filename using field-specific function or folder
            let fileName: string;
            if (fieldConfig.generateFileName) {
              fileName = fieldConfig.generateFileName(req, file);
            } else if (fieldConfig.folder) {
              fileName = `${fieldConfig.folder}/${Date.now()}-${file.originalname}`;
            } else {
              fileName = file.filename || file.originalname;
            }

            // Upload the file
            const uploadedUrl = await storageAction(options.provider, "upload", options.config, {
              fileName,
              filePath: file.path,
              mimeType: file.mimetype,
            });

            uploadedUrls.push(uploadedUrl as string);

            // Clean up temp file
            if (file.path && fs.existsSync(file.path)) {
              fs.unlinkSync(file.path);
            }
          }

          // Store the URL(s) based on maxCount
          if (fieldConfig.maxCount === 1 || uploadedUrls.length === 1) {
            req.uploadedFiles[fieldConfig.fieldName] = uploadedUrls[0] || "";
          } else {
            req.uploadedFiles[fieldConfig.fieldName] = uploadedUrls;
          }
        }
      } else {
        // Original single field logic
        const {
          fieldName = "file",
          multiple = false,
          fileFilter,
          limits,
          generateFileName,
        } = options;

        if (multiple) {
          const files = Array.isArray(req.files) ? req.files : req.files ? [req.files] : [];

          if (files.length > 0) {
            // Apply file filter if provided
            const filteredFiles = fileFilter
              ? files.filter((file) => fileFilter(req, file))
              : files;

            // Check limits
            if (limits?.files && filteredFiles.length > limits.files) {
              return next(new Error(`Too many files. Maximum ${limits.files} allowed.`));
            }

            const uploadPromises = filteredFiles.map(async (file) => {
              // Check file size limit
              if (limits?.fileSize && file.size > limits.fileSize) {
                throw new Error(
                  `File ${file.originalname} exceeds size limit of ${limits.fileSize} bytes`
                );
              }

              // Generate filename if custom generator provided
              const fileName = generateFileName
                ? generateFileName(req, file)
                : file.filename || file.originalname;

              const uploadedUrl = await storageAction(options.provider, "upload", options.config, {
                fileName,
                filePath: file.path,
                mimeType: file.mimetype,
              });

              // Clean up temp file if it exists
              if (file.path && fs.existsSync(file.path)) {
                fs.unlinkSync(file.path);
              }

              return uploadedUrl as string;
            });

            req.uploadedFiles[fieldName] = await Promise.all(uploadPromises);
          }
        } else {
          const file = req.file;
          if (file) {
            // Apply file filter if provided
            if (fileFilter && !fileFilter(req, file)) {
              return next(new Error("File type not allowed"));
            }

            // Check file size limit
            if (limits?.fileSize && file.size > limits.fileSize) {
              return next(new Error(`File exceeds size limit of ${limits.fileSize} bytes`));
            }

            // Generate filename if custom generator provided
            const fileName = generateFileName
              ? generateFileName(req, file)
              : file.filename || file.originalname;

            const uploadedUrl = await storageAction(options.provider, "upload", options.config, {
              fileName,
              filePath: file.path,
              mimeType: file.mimetype,
            });

            // Clean up temp file if it exists
            if (file.path && fs.existsSync(file.path)) {
              fs.unlinkSync(file.path);
            }

            req.uploadedFiles[fieldName] = uploadedUrl as string;
          }
        }
      }

      next();
    } catch (error) {
      // Clean up temp files in case of error
      try {
        if (options.fields) {
          // Clean up multiple field files
          const files = req.files as any;
          options.fields.forEach((fieldConfig) => {
            const fieldFiles = files?.[fieldConfig.fieldName];
            const filesToClean = Array.isArray(fieldFiles)
              ? fieldFiles
              : fieldFiles
                ? [fieldFiles]
                : [];
            filesToClean.forEach((file: FileUpload) => {
              if (file.path && fs.existsSync(file.path)) {
                fs.unlinkSync(file.path);
              }
            });
          });
        } else if (options.multiple) {
          const files = Array.isArray(req.files) ? req.files : req.files ? [req.files] : [];
          files.forEach((file) => {
            if (file.path && fs.existsSync(file.path)) {
              fs.unlinkSync(file.path);
            }
          });
        } else {
          const file = req.file;
          if (file && file.path && fs.existsSync(file.path)) {
            fs.unlinkSync(file.path);
          }
        }
      } catch (cleanupError) {
        console.error("Error cleaning up temp files:", cleanupError);
      }

      next(error);
    }
  };
}

// Specific middleware creators for each provider
export function s3UploadMiddleware(options: Omit<StorageMiddlewareOptions, "provider">) {
  return createStorageUploadMiddleware({ ...options, provider: "s3" });
}

export function gcsUploadMiddleware(options: Omit<StorageMiddlewareOptions, "provider">) {
  return createStorageUploadMiddleware({ ...options, provider: "gcs" });
}

export function azureUploadMiddleware(options: Omit<StorageMiddlewareOptions, "provider">) {
  return createStorageUploadMiddleware({ ...options, provider: "azure" });
}

// Utility function to delete files
export async function deleteStorageFile(
  provider: Provider,
  config: StorageConfig,
  key: string
): Promise<boolean> {
  return (await storageAction(provider, "delete", config, { key })) as boolean;
}

// Utility function to get file URL
export async function getStorageFileUrl(
  provider: Provider,
  config: StorageConfig,
  key: string
): Promise<string> {
  return (await storageAction(provider, "getUrl", config, { key })) as string;
}
