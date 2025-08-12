# NPM Storage Package - Simple Examples

Quick and easy examples for the most common upload scenarios.

## 📦 Installation

```bash
npm install npm-storage-package express multer
```

## 🚀 Basic Setup

```javascript
import express from 'express';
import { StorageFactory } from 'npm-storage-package';

const app = express();

// Create storage factory
const storage = new StorageFactory({
  azure: {
    bucket: 'your-container-name',
    credentials: {
      connectionString: 'your-azure-connection-string'
    }
  },
  s3: {
    bucket: 'your-s3-bucket',
    region: 'us-east-1',
    credentials: {
      accessKeyId: 'your-access-key',
      secretAccessKey: 'your-secret-key'
    }
  },
  gcs: {
    bucket: 'your-gcs-bucket',
    credentials: {
      projectId: 'your-project-id',
      keyFilename: 'path/to/service-account-key.json'
    }
  }
});
```

## 1. Single File Upload

```javascript
// Azure single file
app.post('/upload/single/azure', storage.azureMulter({
  destination: 'uploads/single/',
  generateFileName: (req, file) => `${Date.now()}-${file.originalname}`
}).single('file'), (req, res) => {
  res.json({
    success: true,
    file: {
      originalName: req.file.originalname,
      cloudUrl: req.file.path,
      cloudKey: req.file.cloudKey,
      size: req.file.size
    }
  });
});

// S3 single file
app.post('/upload/single/s3', storage.s3Multer({
  destination: 'uploads/single/',
  generateFileName: (req, file) => `${Date.now()}-${file.originalname}`
}).single('file'), (req, res) => {
  res.json({
    success: true,
    file: {
      originalName: req.file.originalname,
      cloudUrl: req.file.path,
      cloudKey: req.file.cloudKey,
      size: req.file.size
    }
  });
});

// GCS single file
app.post('/upload/single/gcs', storage.gcsMulter({
  destination: 'uploads/single/',
  generateFileName: (req, file) => `${Date.now()}-${file.originalname}`
}).single('file'), (req, res) => {
  res.json({
    success: true,
    file: {
      originalName: req.file.originalname,
      cloudUrl: req.file.path,
      cloudKey: req.file.cloudKey,
      size: req.file.size
    }
  });
});
```

## 2. Multiple Files Upload

```javascript
// Azure multiple files
app.post('/upload/multiple/azure', storage.azureMulter({
  destination: 'uploads/multiple/',
  generateFileName: (req, file) => `${Date.now()}-${file.originalname}`
}).array('files', 5), (req, res) => {
  const uploadedFiles = req.files.map(file => ({
    originalName: file.originalname,
    cloudUrl: file.path,
    cloudKey: file.cloudKey,
    size: file.size
  }));

  res.json({
    success: true,
    totalFiles: req.files.length,
    files: uploadedFiles
  });
});

// S3 multiple files
app.post('/upload/multiple/s3', storage.s3Multer({
  destination: 'uploads/multiple/',
  generateFileName: (req, file) => `${Date.now()}-${file.originalname}`
}).array('files', 5), (req, res) => {
  const uploadedFiles = req.files.map(file => ({
    originalName: file.originalname,
    cloudUrl: file.path,
    cloudKey: file.cloudKey,
    size: file.size
  }));

  res.json({
    success: true,
    totalFiles: req.files.length,
    files: uploadedFiles
  });
});

// GCS multiple files
app.post('/upload/multiple/gcs', storage.gcsMulter({
  destination: 'uploads/multiple/',
  generateFileName: (req, file) => `${Date.now()}-${file.originalname}`
}).array('files', 5), (req, res) => {
  const uploadedFiles = req.files.map(file => ({
    originalName: file.originalname,
    cloudUrl: file.path,
    cloudKey: file.cloudKey,
    size: file.size
  }));

  res.json({
    success: true,
    totalFiles: req.files.length,
    files: uploadedFiles
  });
});
```

## 3. Multiple Fields Upload (Single File with Multiple Fields)

```javascript
// Azure multiple fields
app.post('/upload/fields/azure', storage.azureMulter({
  fieldConfigs: {
    avatar: {
      destination: 'uploads/avatars/',
      allowedExtensions: ['.jpg', '.jpeg', '.png'],
      generateFileName: (req, file) => `avatar-${Date.now()}-${file.originalname}`
    },
    document: {
      destination: 'uploads/documents/',
      allowedExtensions: ['.pdf', '.doc', '.docx'],
      generateFileName: (req, file) => `doc-${Date.now()}-${file.originalname}`
    }
  }
}).fields([
  { name: 'avatar', maxCount: 1 },
  { name: 'document', maxCount: 1 }
]), (req, res) => {
  res.json({
    success: true,
    files: {
      avatar: req.files.avatar?.[0] || null,
      document: req.files.document?.[0] || null
    }
  });
});

// S3 multiple fields
app.post('/upload/fields/s3', storage.s3Multer({
  fieldConfigs: {
    avatar: {
      destination: 'uploads/avatars/',
      allowedExtensions: ['.jpg', '.jpeg', '.png'],
      generateFileName: (req, file) => `avatar-${Date.now()}-${file.originalname}`
    },
    document: {
      destination: 'uploads/documents/',
      allowedExtensions: ['.pdf', '.doc', '.docx'],
      generateFileName: (req, file) => `doc-${Date.now()}-${file.originalname}`
    }
  }
}).fields([
  { name: 'avatar', maxCount: 1 },
  { name: 'document', maxCount: 1 }
]), (req, res) => {
  res.json({
    success: true,
    files: {
      avatar: req.files.avatar?.[0] || null,
      document: req.files.document?.[0] || null
    }
  });
});

// GCS multiple fields
app.post('/upload/fields/gcs', storage.gcsMulter({
  fieldConfigs: {
    avatar: {
      destination: 'uploads/avatars/',
      allowedExtensions: ['.jpg', '.jpeg', '.png'],
      generateFileName: (req, file) => `avatar-${Date.now()}-${file.originalname}`
    },
    document: {
      destination: 'uploads/documents/',
      allowedExtensions: ['.pdf', '.doc', '.docx'],
      generateFileName: (req, file) => `doc-${Date.now()}-${file.originalname}`
    }
  }
}).fields([
  { name: 'avatar', maxCount: 1 },
  { name: 'document', maxCount: 1 }
]), (req, res) => {
  res.json({
    success: true,
    files: {
      avatar: req.files.avatar?.[0] || null,
      document: req.files.document?.[0] || null
    }
  });
});
```

## 4. Error Handling

```javascript
app.use((error, req, res, next) => {
  console.error('Upload error:', error);
  
  if (error.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({
      success: false,
      error: 'File size too large'
    });
  }
  
  if (error.code === 'LIMIT_FILE_COUNT') {
    return res.status(400).json({
      success: false,
      error: 'Too many files'
    });
  }
  
  res.status(500).json({
    success: false,
    error: error.message || 'Upload failed'
  });
});
```

## 5. Start Server

```javascript
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log('Available endpoints:');
  console.log('- POST /upload/single/{azure|s3|gcs}');
  console.log('- POST /upload/multiple/{azure|s3|gcs}');
  console.log('- POST /upload/fields/{azure|s3|gcs}');
});
```

## 🧪 Testing with curl

```bash
# Single file
curl -X POST -F "file=@test.jpg" http://localhost:3000/upload/single/azure

# Multiple files
curl -X POST -F "files=@test1.jpg" -F "files=@test2.jpg" http://localhost:3000/upload/multiple/s3

# Multiple fields
curl -X POST -F "avatar=@avatar.jpg" -F "document=@resume.pdf" http://localhost:3000/upload/fields/gcs
```

## 📝 Environment Variables

Create a `.env` file:

```env
# Azure
AZURE_CONNECTION_STRING=your_azure_connection_string
AZURE_CONTAINER_NAME=your_container_name

# AWS S3
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key
AWS_S3_BUCKET=your_s3_bucket
AWS_REGION=us-east-1

# Google Cloud Storage
GCS_PROJECT_ID=your_project_id
GCS_BUCKET=your_gcs_bucket
GCS_KEY_FILE=path/to/service-account-key.json
```

That's it! These examples cover the three main upload scenarios with clean, simple code.
