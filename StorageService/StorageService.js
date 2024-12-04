const { BlobServiceClient, StorageSharedKeyCredential } = require('@azure/storage-blob');

class StorageService {

  constructor() {
  }

  init() {
  }

  async listBlobs() {
    return [];
  }

  async streamToString(readableStream) {
    return new Promise((resolve, reject) => {
      const chunks = [];
      readableStream.on('data', (data) => {
        chunks.push(data.toString());
      });
      readableStream.on('end', () => {
        resolve(chunks.join(''));
      });
      readableStream.on('error', reject);
    });
  }

  async getFileContent(fileName) {
    return fileName;
  }

  async uploadFileStream(localFilePath, fileName) {
    return {};
  }

  async uploadFile(fileName, data) {
  }

};

module.exports = StorageService;
