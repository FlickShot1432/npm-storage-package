// Integration helpers for Express.js and multer (optional dependencies)
// This file shows how to properly integrate the storage middleware with Express
// You need to install express and multer to use these helpers

import {
  createStorageUploadMiddleware,
  type StorageMiddlewareOptions,
  type RequestLike,
  type FileUpload,
} from "./middleware.js";

// Generic types to avoid direct Express dependencies
export interface ExpressRequest {
  file?: unknown;
  files?: unknown;
  uploadedFiles?: {
    [fieldName: string]: string | string[];
  };
  [key: string]: unknown;
}

export interface ExpressResponse {
  status: (code: number) => ExpressResponse;
  json: (data: unknown) => void;
}

export interface ExpressNextFunction {
  (error?: unknown): void;
}

// Helper to convert Express multer files to our FileUpload format
function convertMulterFile(file: unknown): FileUpload {
  const multerFile = file as {
    fieldname: string;
    originalname: string;
    encoding: string;
    mimetype: string;
    size: number;
    destination: string;
    filename: string;
    path: string;
    buffer?: Buffer;
  };

  return {
    fieldname: multerFile.fieldname,
    originalname: multerFile.originalname,
    encoding: multerFile.encoding,
    mimetype: multerFile.mimetype,
    size: multerFile.size,
    destination: multerFile.destination,
    filename: multerFile.filename,
    path: multerFile.path,
    buffer: multerFile.buffer,
  };
}

// Helper to convert Express request to RequestLike
function convertExpressRequest(req: ExpressRequest): RequestLike {
  const requestLike: RequestLike = {
    uploadedFiles: req.uploadedFiles,
  };

  if (req.file) {
    requestLike.file = convertMulterFile(req.file);
  }

  if (req.files) {
    if (Array.isArray(req.files)) {
      requestLike.files = req.files.map(convertMulterFile);
    } else {
      // Handle case where req.files is an object with field names as keys
      const filesArray: FileUpload[] = [];
      Object.values(req.files).forEach((files) => {
        if (Array.isArray(files)) {
          filesArray.push(...files.map(convertMulterFile));
        } else {
          filesArray.push(convertMulterFile(files));
        }
      });
      requestLike.files = filesArray.length === 1 ? filesArray[0] : filesArray;
    }
  }

  return requestLike;
}

// Express middleware wrapper
export function createExpressStorageMiddleware(options: StorageMiddlewareOptions) {
  const storageMiddleware = createStorageUploadMiddleware(options);

  return async (req: ExpressRequest, res: ExpressResponse, next: ExpressNextFunction) => {
    const requestLike = convertExpressRequest(req);
    const responseLike = {
      status: (code: number) => ({
        json: (data: unknown) => res.status(code).json(data),
        status: (newCode: number) => res.status(newCode),
      }),
      json: (data: unknown) => res.json(data),
    };

    try {
      await storageMiddleware(
        requestLike,
        responseLike as unknown as typeof responseLike,
        (error?: unknown) => {
          if (error) {
            return next(error);
          }

          // Copy back the uploadedFiles to the original request
          req.uploadedFiles = requestLike.uploadedFiles;
          next();
        }
      );
    } catch (error) {
      next(error);
    }
  };
}

// Express-specific middleware creators
export function createExpressS3Middleware(options: Omit<StorageMiddlewareOptions, "provider">) {
  return createExpressStorageMiddleware({ ...options, provider: "s3" });
}

export function createExpressGCSMiddleware(options: Omit<StorageMiddlewareOptions, "provider">) {
  return createExpressStorageMiddleware({ ...options, provider: "gcs" });
}

export function createExpressAzureMiddleware(options: Omit<StorageMiddlewareOptions, "provider">) {
  return createExpressStorageMiddleware({ ...options, provider: "azure" });
}

// Complete Express middleware factory that includes multer
export function createCompleteExpressMiddleware(
  multerInstance: {
    single: (fieldName: string) => unknown;
    array: (fieldName: string, maxCount?: number) => unknown;
  },
  storageOptions: StorageMiddlewareOptions,
  multerOptions: {
    fieldName: string;
    multiple?: boolean;
    maxCount?: number;
  }
) {
  const { fieldName, multiple = false, maxCount = 1 } = multerOptions;

  // Choose appropriate multer middleware
  const multerMiddleware = multiple
    ? multerInstance.array(fieldName, maxCount)
    : multerInstance.single(fieldName);

  const storageMiddleware = createExpressStorageMiddleware(storageOptions);

  // Return combined middleware
  return [multerMiddleware, storageMiddleware];
}

// Usage examples:
/*
import express from 'express';
import multer from 'multer';
import { createCompleteExpressMiddleware } from './express-helpers.js';

const app = express();
const upload = multer({ dest: 'temp/' });

const gcsConfig = {
  bucket: 'my-bucket',
  credentials: require('./gcs-key.json')
};

// Single file upload
app.post('/upload', 
  ...createCompleteExpressMiddleware(
    upload,
    { provider: 'gcs', config: gcsConfig },
    { fieldName: 'file' }
  ),
  (req, res) => {
    res.json({ url: req.uploadedFiles?.file });
  }
);

// Multiple file upload
app.post('/upload-multiple',
  ...createCompleteExpressMiddleware(
    upload,
    { provider: 'gcs', config: gcsConfig },
    { fieldName: 'files', multiple: true, maxCount: 5 }
  ),
  (req, res) => {
    res.json({ urls: req.uploadedFiles?.files });
  }
);
*/
