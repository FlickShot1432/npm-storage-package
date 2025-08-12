# 🌐 NPM Storage Package

A **powerful TypeScript-based NPM package** for seamless file uploads to **AWS S3**, **Google Cloud Storage (GCS)**, and **Azure Blob Storage** with **Express.js/Multer integration**. One unified API for all your cloud storage needs!

[![npm version](https://badge.fury.io/js/npm-storage-package.svg)](https://www.npmjs.com/package/npm-storage-package)
[![TypeScript](https://img.shields.io/badge/TypeScript-Ready-blue.svg)](https://www.typescriptlang.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

---

## 🚀 Features

✅ **Unified API** – One consistent interface for S3, GCS, and Azure  
✅ **Express.js + Multer Integration** – Drop-in replacement for standard multer  
✅ **Multiple Upload Patterns** – Single file, multiple files, multiple fields  
✅ **TypeScript Support** – Full type safety and IntelliSense  
✅ **Flexible Configuration** – Field-specific settings and validation  
✅ **Production Ready** – Error handling, file filtering, size limits  

---

## 📦 Installation

```bash
npm install npm-storage-package multer express
```

```bash
yarn add npm-storage-package multer express
```

---

## 🔧 Quick Start

### 1️⃣ Basic Setup

```javascript
import express from 'express';
import { StorageFactory } from 'npm-storage-package';

const app = express();

// Configure once, use everywhere
const storage = new StorageFactory({
  azure: {
    bucket: 'my-container',
    credentials: { connectionString: process.env.AZURE_CONNECTION_STRING }
  },
  s3: {
    bucket: 'my-bucket',
    region: 'us-east-1',
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
    }
  },
  gcs: {
    bucket: 'my-gcs-bucket',
    projectId: 'my-project-id',
    keyFilename: './serviceaccountkey.json'
  }
});
```

### 2️⃣ Single File Upload

```javascript
app.post('/upload/single', 
  storage.azureMulter({
    destination: 'uploads/',
    generateFileName: (req, file) => `${Date.now()}-${file.originalname}`
  }).single('file'), 
  (req, res) => {
    res.json({
      success: true,
      file: {
        originalName: req.file.originalname,
        cloudUrl: req.file.path,
        cloudKey: req.file.cloudKey,
        size: req.file.size
      }
    });
  }
);
```

### 3️⃣ Multiple Files Upload

```javascript
app.post('/upload/multiple', 
  storage.s3Multer({
    destination: 'gallery/',
    fileFilter: (req, file) => file.mimetype.startsWith('image/'),
    limits: { fileSize: 5 * 1024 * 1024 } // 5MB
  }).array('photos', 10), 
  (req, res) => {
    const uploadedFiles = req.files.map(file => ({
      originalName: file.originalname,
      cloudUrl: file.path,
      size: file.size
    }));
    
    res.json({
      success: true,
      totalFiles: req.files.length,
      files: uploadedFiles
    });
  }
);
```

### 4️⃣ Multiple Fields Upload

```javascript
app.post('/upload/profile', 
  storage.gcsMulter({
    fieldConfigs: {
      avatar: {
        destination: 'avatars/',
        allowedExtensions: ['.jpg', '.jpeg', '.png'],
        fileSizeLimit: 2 * 1024 * 1024, // 2MB
        generateFileName: (req, file) => `avatar-${req.user.id}-${Date.now()}.jpg`
      },
      document: {
        destination: 'documents/',
        allowedExtensions: ['.pdf', '.doc', '.docx'],
        fileSizeLimit: 10 * 1024 * 1024 // 10MB
      }
    }
  }).fields([
    { name: 'avatar', maxCount: 1 },
    { name: 'document', maxCount: 3 }
  ]), 
  (req, res) => {
    res.json({
      success: true,
      files: {
        avatar: req.files.avatar?.[0]?.path,
        documents: req.files.document?.map(f => f.path)
      }
    });
  }
);
```

---

## 📚 API Reference

### StorageFactory Class

The main class for creating configured storage instances.

```javascript
const storage = new StorageFactory({
  azure?: AzureConfig,
  s3?: S3Config,
  gcs?: GCSConfig
});
```

### Provider Methods

Each provider has a unified method that returns a configured multer instance:

#### `storage.azureMulter(options)`
#### `storage.s3Multer(options)`  
#### `storage.gcsMulter(options)`

### Upload Options

| Option | Type | Description |
|--------|------|-------------|
| `destination` | `string` | Upload destination path |
| `generateFileName` | `Function` | Custom filename generator |
| `fileFilter` | `Function` | File validation function |
| `limits` | `Object` | File size/count limits |
| `fieldConfigs` | `Object` | Field-specific configurations |

### Field Configuration

For multiple fields upload, each field can have:

| Option | Type | Description |
|--------|------|-------------|
| `destination` | `string` | Field-specific upload path |
| `allowedExtensions` | `string[]` | Allowed file extensions |
| `fileSizeLimit` | `number` | Maximum file size in bytes |
| `generateFileName` | `Function` | Custom filename for this field |

---

## 🔧 Configuration

### Azure Blob Storage

```javascript
azure: {
  bucket: 'container-name',
  credentials: {
    connectionString: 'DefaultEndpointsProtocol=https;AccountName=...'
  }
}
```

### AWS S3

```javascript
s3: {
  bucket: 'bucket-name',
  region: 'us-east-1',
  credentials: {
    accessKeyId: 'AKIA...',
    secretAccessKey: 'your-secret-key'
  }
}
```

### Google Cloud Storage

```javascript
// Option 1: Service Account Key File
gcs: {
  bucket: 'bucket-name',
  projectId: 'your-project-id',  // or auto-extracted from key file
  keyFilename: './path/to/serviceaccountkey.json'
}

// Option 2: JSON Credentials
gcs: {
  bucket: 'bucket-name',
  credentials: {
    // Service account JSON object
    type: 'service_account',
    project_id: 'your-project-id',
    private_key: '-----BEGIN PRIVATE KEY-----\n...',
    client_email: 'service-account@project.iam.gserviceaccount.com'
    // ... other fields
  }
}
```

---

## 💡 Advanced Examples

### Custom File Validation

```javascript
const imageUpload = storage.s3Multer({
  destination: 'images/',
  fileFilter: (req, file) => {
    // Only allow images
    if (!file.mimetype.startsWith('image/')) {
      throw new Error('Only image files are allowed');
    }
    
    // Custom validation logic
    if (file.originalname.length > 100) {
      throw new Error('Filename too long');
    }
    
    return true;
  },
  generateFileName: (req, file) => {
    const userId = req.user?.id || 'anonymous';
    const timestamp = Date.now();
    const extension = file.originalname.split('.').pop();
    return `${userId}-${timestamp}.${extension}`;
  }
});

app.post('/upload/image', imageUpload.single('image'), handler);
```

### Dynamic Configuration

```javascript
function createDynamicUpload(provider) {
  const configs = {
    azure: storage.azureMulter({ destination: 'azure-uploads/' }),
    s3: storage.s3Multer({ destination: 's3-uploads/' }),
    gcs: storage.gcsMulter({ destination: 'gcs-uploads/' })
  };
  
  return configs[provider];
}

app.post('/upload/:provider', (req, res, next) => {
  const upload = createDynamicUpload(req.params.provider);
  upload.single('file')(req, res, next);
}, handler);
```

### Error Handling

```javascript
app.use((error, req, res, next) => {
  if (error.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({
      success: false,
      error: 'File too large'
    });
  }
  
  if (error.code === 'LIMIT_FILE_COUNT') {
    return res.status(400).json({
      success: false,
      error: 'Too many files'
    });
  }
  
  // Handle cloud storage errors
  if (error.message.includes('bucket')) {
    return res.status(500).json({
      success: false,
      error: 'Storage configuration error'
    });
  }
  
  res.status(500).json({
    success: false,
    error: error.message
  });
});
```

---

## 🛠️ File Object Properties

After successful upload, files are available in `req.file` (single) or `req.files` (multiple):

```javascript
{
  fieldname: 'avatar',
  originalname: 'profile.jpg',
  encoding: '7bit',
  mimetype: 'image/jpeg',
  size: 15234,
  destination: 'avatars/',
  filename: 'avatar-123456789.jpg',
  path: 'https://storage.googleapis.com/bucket/avatars/avatar-123456789.jpg',
  cloudKey: 'avatars/avatar-123456789.jpg'
}
```

---

## 🧪 Testing Your Setup

Check out the complete test project in the `/test-project` directory:

```bash
cd test-project
npm install
cp .env.example .env
# Edit .env with your credentials
npm start
# Visit http://localhost:3000
```

The test project includes:
- ✅ Single file upload example
- ✅ Multiple files upload example  
- ✅ Multiple fields upload example
- ✅ HTML form for easy testing
- ✅ Error handling demonstrations

---

## 🔒 Security Best Practices

✅ **Environment Variables** – Never hardcode credentials  
✅ **File Validation** – Always validate file types and sizes  
✅ **Rate Limiting** – Implement upload rate limits  
✅ **Authentication** – Protect upload endpoints  
✅ **CORS Configuration** – Set proper CORS for web uploads  
✅ **Virus Scanning** – Consider adding virus scanning  

### Example Environment Setup

```bash
# .env file
AZURE_CONNECTION_STRING=DefaultEndpointsProtocol=https;AccountName=...
AZURE_CONTAINER_NAME=uploads

AWS_ACCESS_KEY_ID=AKIA...
AWS_SECRET_ACCESS_KEY=...
AWS_REGION=us-east-1
AWS_S3_BUCKET=my-bucket

GCS_PROJECT_ID=my-project
GCS_BUCKET_NAME=my-bucket
GCS_KEY_FILE=./serviceaccountkey.json
```

---

## 📖 More Examples

For detailed examples and advanced usage patterns, see:
- 📄 [EXAMPLES.md](./EXAMPLES.md) - Complete usage examples
- 🧪 [test-project/](./test-project/) - Working test implementation
- 📚 [TypeScript Definitions](./src/index.ts) - Full type definitions

---

## 🤝 Contributing

We welcome contributions! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 🆘 Support

- 📧 **Issues**: [GitHub Issues](https://github.com/FlickShot1432/npm-storage-package/issues)
- 📖 **Documentation**: [Examples & Guides](./EXAMPLES.md)
- 💬 **Discussions**: [GitHub Discussions](https://github.com/FlickShot1432/npm-storage-package/discussions)

---

## ⭐ Show Your Support

If this package helped you, please consider:
- ⭐ Starring the repository
- 🐛 Reporting issues
- 💡 Suggesting improvements
- 🤝 Contributing code

**Made with ❤️ for the developer community**
