# 🌐 Universal Storage Package

A simple **TypeScript-based NPM package** to **upload, delete, and get URLs** of files in **AWS S3**, **Google Cloud Storage (GCS)**, and **Azure Blob Storage** using a single unified function. Now includes **Express.js middleware support** for seamless backend integration!

---

## 🚀 Features

✅ **One function for all providers** – S3, GCS, Azure  
✅ **Supports Upload, Delete, and Get URL operations**  
✅ **Express.js middleware support** – Works like multer!  
✅ **Written in TypeScript with full type safety**  
✅ **Easy to integrate into any Node.js project**  
✅ **Lightweight & production-ready**

---

## 📦 Installation

```bash
npm install npm-storage-package
```

or

```bash
yarn add npm-storage-package
```

---

## 🔧 Usage Examples

### 🎯 Method 1: Direct Function Usage

#### 1️⃣ Import the Package

```ts
import { storageAction } from "npm-storage-package";
```

#### 2️⃣ Upload File to AWS S3

```ts
const url = await storageAction("s3", "upload", {
  bucket: "my-bucket",
  region: "us-east-1",
  credentials: {
    accessKeyId: "YOUR_AWS_KEY",
    secretAccessKey: "YOUR_AWS_SECRET",
  },
}, {
  filePath: "./sample.jpg",
  fileName: "uploaded-sample.jpg",
  mimeType: "image/jpeg",
});

console.log("Uploaded File URL:", url);
```

---

### 🚀 Method 2: Express.js Middleware (NEW!)

Perfect for backend APIs! Multiple approaches to avoid config repetition:

#### Approach 1: Factory Class (Recommended)

```ts
import express from 'express';
import multer from 'multer';
import { StorageFactory } from 'npm-storage-package';

const app = express();
const upload = multer({ dest: 'temp/' });

// Configure all providers once
const storage = new StorageFactory({
  s3: {
    bucket: 'my-s3-bucket',
    region: 'us-east-1',
    credentials: { accessKeyId: 'xxx', secretAccessKey: 'xxx' }
  },
  gcs: {
    bucket: 'my-gcs-bucket',
    credentials: require('./gcs-key.json')
  },
  azure: {
    bucket: 'my-container',
    credentials: { connectionString: 'xxx' }
  }
});

// Use without repeating configs! 🎉
app.post('/upload/s3', 
  upload.single('file'),
  storage.s3Upload({
    fieldName: 'file',
    fileFilter: (req, file) => file.mimetype.startsWith('image/')
  }),
  (req, res) => {
    res.json({ url: req.uploadedFiles?.file });
  }
);

app.post('/upload/gcs',
  upload.single('photo'),
  storage.gcsUpload({
    fieldName: 'photo',
    limits: { fileSize: 5 * 1024 * 1024 }
  }),
  (req, res) => {
    res.json({ url: req.uploadedFiles?.photo });
  }
);
```

#### Approach 2: Factory Functions

```ts
import { createS3Middleware, createGCSMiddleware } from 'npm-storage-package';

// Create pre-configured middleware creators
const s3Upload = createS3Middleware(s3Config);
const gcsUpload = createGCSMiddleware(gcsConfig);

// Use them cleanly
app.post('/upload/s3', 
  upload.single('image'),
  s3Upload({ fieldName: 'image' }),
  handler
);

app.post('/upload/gcs',
  upload.single('doc'),
  gcsUpload({ fieldName: 'doc' }),
  handler
);
```

#### Approach 3: Custom Wrapper Functions

```ts
function createImageUpload(provider: 'gcs' | 's3' | 'azure') {
  const storage = new StorageFactory({ s3: s3Config, gcs: gcsConfig, azure: azureConfig });
  return [
    upload.single('image'),
    storage.upload(provider, {
      fieldName: 'image',
      fileFilter: (req, file) => file.mimetype.startsWith('image/'),
      generateFileName: (req, file) => `images/${Date.now()}-${file.originalname}`
    })
  ];
}

// Ultra-clean usage! ✨
app.post('/images/s3', ...createImageUpload('s3'), handler);
app.post('/images/gcs', ...createImageUpload('gcs'), handler);
app.post('/images/azure', ...createImageUpload('azure'), handler);
```

#### Original Approach (Still Available)

```ts
import { gcsUploadMiddleware } from 'npm-storage-package';

// Original way - config passed each time
app.post('/upload', 
  upload.single('file'),
  gcsUploadMiddleware({
    config: gcsConfig,  // ← Config repeated each time
    fieldName: 'file'
  }),
  handler
);
```

---

## 📋 Middleware Options

| Option | Type | Description | Default |
|--------|------|-------------|---------|
| `provider` | `'s3' \| 'gcs' \| 'azure'` | Storage provider | Required |
| `config` | `StorageConfig` | Provider configuration | Required |
| `fieldName` | `string` | Form field name | `'file'` |
| `multiple` | `boolean` | Allow multiple files | `false` |
| `fileFilter` | `Function` | File filtering function | `undefined` |
| `limits` | `Object` | File size/count limits | `undefined` |
| `generateFileName` | `Function` | Custom filename generator | Auto-generated |

---

### 3️⃣ Delete File from GCS

```ts
await storageAction("gcs", "delete", {
  bucket: "my-gcs-bucket",
  credentials: require("./gcs-key.json"),
}, {
  key: "uploaded-sample.jpg",
});
```

---

### 4️⃣ Get Azure Blob File URL

```ts
const fileUrl = await storageAction("azure", "getUrl", {
  bucket: "my-container",
  credentials: {
    connectionString: "AZURE_CONNECTION_STRING",
  },
}, {
  key: "uploaded-sample.jpg",
});

console.log("File URL:", fileUrl);
```

---

## 📌 Supported Providers

| Provider | Operations Supported        | Required Credentials                                |
|----------|-----------------------------|-----------------------------------------------------|
| **S3**   | Upload, Delete, Get URL     | `accessKeyId`, `secretAccessKey`, `region`         |
| **GCS**  | Upload, Delete, Get URL     | `credentials` (Service Account JSON)               |
| **Azure**| Upload, Delete, Get URL     | `connectionString`                                 |

---

## 🛠 API Reference

### 🔹 `storageAction(provider, operation, config, options)`

| Parameter   | Type               | Description                                        |
|-------------|--------------------|----------------------------------------------------|
| **provider** | `"s3"` \| `"gcs"` \| `"azure"` | Choose storage provider                          |
| **operation**| `"upload"` \| `"delete"` \| `"getUrl"` | Choose action to perform                  |
| **config**   | `StorageConfig`    | Storage configuration (bucket, credentials, etc.) |
| **options**  | `FileOptions`      | File details like filePath, fileName, key, etc.    |

---

## 📂 File Options

| Field       | Required (per operation) | Description                                      |
|------------|--------------------------|--------------------------------------------------|
| `filePath` | ✅ Upload                | Local file path                                  |
| `fileName` | ✅ Upload                | Name to save in storage                          |
| `mimeType` | (Optional) Upload        | MIME type for S3                                 |
| `key`      | ✅ Delete / Get URL      | File key to delete or get URL                    |

---

## ✨ Why Use Middleware Approach?

🎯 **Seamless Integration**: Works exactly like multer  
🧹 **Automatic Cleanup**: Temp files auto-deleted  
🛡️ **Built-in Error Handling**: Upload failures handled gracefully  
🔀 **Multi-Provider**: Easy switching between S3, GCS, Azure  
⚙️ **Flexible Config**: Custom filtering, naming, limits  
📘 **TypeScript Ready**: Full type definitions included  

---

## 🔍 TypeScript Support

Full TypeScript support with proper type definitions:

```ts
declare global {
  namespace Express {
    interface Request {
      uploadedFiles?: {
        [fieldName: string]: string | string[];
      };
    }
  }
}
```

---

## ✨ Example Project Setup

```bash
npm install npm-storage-package express multer
npm install -D @types/express @types/multer
```

```ts
import express from 'express';
import { gcsUploadMiddleware } from "npm-storage-package";

const app = express();

app.post('/upload', 
  gcsUploadMiddleware({
    config: {
      bucket: 'my-bucket',
      credentials: require('./gcs-key.json')
    }
  }),
  (req, res) => {
    res.json({ url: req.uploadedFiles?.file });
  }
);

app.listen(3000, () => console.log('Server running on port 3000'));
```

---

## 🛡 Best Practices

✅ Store credentials in **environment variables**  
✅ Use **async/await** with `try/catch` for error handling  
✅ Avoid committing sensitive keys to GitHub  
✅ Set appropriate **file size limits** in middleware  
✅ Use **file filtering** for security  

---

## 📜 License

This package is licensed under the **MIT License**.  
Feel free to contribute and improve this project! 🚀

---

### 💡 Contribute
⭐ Star this repository if you find it useful!  
Pull requests are welcome. 💻

---

## 📦 Installation

```bash
npm install npm-storage-package
```

or

```bash
yarn add npm-storage-package
```

---

## 🔧 Usage Example

### 1️⃣ Import the Package

```ts
import { storageAction } from "npm-storage-package";
```

---

### 2️⃣ Upload File to AWS S3

```ts
const url = await storageAction("s3", "upload", {
  bucket: "my-bucket",
  region: "us-east-1",
  credentials: {
    accessKeyId: "YOUR_AWS_KEY",
    secretAccessKey: "YOUR_AWS_SECRET",
  },
}, {
  filePath: "./sample.jpg",
  fileName: "uploaded-sample.jpg",
  mimeType: "image/jpeg",
});

console.log("Uploaded File URL:", url);
```

---

### 3️⃣ Delete File from GCS

```ts
await storageAction("gcs", "delete", {
  bucket: "my-gcs-bucket",
  credentials: require("./gcs-key.json"),
}, {
  key: "uploaded-sample.jpg",
});
```

---

### 4️⃣ Get Azure Blob File URL

```ts
const fileUrl = await storageAction("azure", "getUrl", {
  bucket: "my-container",
  credentials: {
    connectionString: "AZURE_CONNECTION_STRING",
  },
}, {
  key: "uploaded-sample.jpg",
});

console.log("File URL:", fileUrl);
```

---

## 📌 Supported Providers

| Provider | Operations Supported        | Required Credentials                                |
|----------|-----------------------------|-----------------------------------------------------|
| **S3**   | Upload, Delete, Get URL     | `accessKeyId`, `secretAccessKey`, `region`         |
| **GCS**  | Upload, Delete, Get URL     | `credentials` (Service Account JSON)               |
| **Azure**| Upload, Delete, Get URL     | `connectionString`                                 |

---

## 🛠 API Reference

### 🔹 `storageAction(provider, operation, config, options)`

| Parameter   | Type               | Description                                        |
|-------------|--------------------|----------------------------------------------------|
| **provider** | `"s3"` \| `"gcs"` \| `"azure"` | Choose storage provider                          |
| **operation**| `"upload"` \| `"delete"` \| `"getUrl"` | Choose action to perform                  |
| **config**   | `StorageConfig`    | Storage configuration (bucket, credentials, etc.) |
| **options**  | `FileOptions`      | File details like filePath, fileName, key, etc.    |

---

## 📂 File Options

| Field       | Required (per operation) | Description                                      |
|------------|--------------------------|--------------------------------------------------|
| `filePath` | ✅ Upload                | Local file path                                  |
| `fileName` | ✅ Upload                | Name to save in storage                          |
| `mimeType` | (Optional) Upload        | MIME type for S3                                 |
| `key`      | ✅ Delete / Get URL      | File key to delete or get URL                    |

---

## ✨ Example Project Setup

```bash
npm install npm-storage-package aws-sdk @google-cloud/storage @azure/storage-blob
```

```ts
import { storageAction } from "npm-storage-package";

(async () => {
  try {
    const url = await storageAction("s3", "upload", {
      bucket: "my-bucket",
      region: "us-east-1",
      credentials: {
        accessKeyId: "AWS_KEY",
        secretAccessKey: "AWS_SECRET",
      },
    }, {
      filePath: "./file.txt",
      fileName: "file.txt",
    });

    console.log("Uploaded:", url);
  } catch (err) {
    console.error("Error:", err);
  }
})();
```

---

## 🛡 Best Practices

✅ Store credentials in **environment variables**  
✅ Use **async/await** with `try/catch` for error handling  
✅ Avoid committing sensitive keys to GitHub  

---

## 📜 License

This package is licensed under the **MIT License**.  
Feel free to contribute and improve this project! 🚀

---

### 💡 Contribute
⭐ Star this repository if you find it useful!  
Pull requests are welcome. 💻
