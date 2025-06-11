const { BlobServiceClient, StorageSharedKeyCredential } = require('@azure/storage-blob');

const StorageService = require("./StorageService");
const fs = require('fs').promises;
class AzureStorageService extends StorageService {

  constructor() {
    super();
    this.accountName = 'pullseaipublicassets';
    this.accountKey = 'rAy43JOCKTQRL4PKIxpHet3hi+q7FCWHlZJXKhNyHlS1OrVqTKXyB0h7MpOUYGNS9ElwFLmc6YhJ+AStwJDTDQ==';
    this.containerName = 'pullse-ai-public-assets';
    this.init();
  }

  init() {
    const cred = new StorageSharedKeyCredential(this.accountName, this.accountKey);
    this.blobServiceClient = new BlobServiceClient(
      `https://${this.accountName}.blob.core.windows.net`,
      cred
    );
  }

  async listBlobs() {
    const containerClient = this.blobServiceClient.getContainerClient(this.containerName);
    for await (const blob of containerClient.listBlobsFlat()) {
      console.log(`Blob: ${blob.name} Type: ${blob.properties.ResourceType}`);
    }
    return blob;
  }

  async getFileContent(blobName) {
    const containerClient = this.blobServiceClient.getContainerClient(this.containerName);
    const blockBlobClient = containerClient.getBlockBlobClient(blobName);

    try {
      const downloadBlockBlobResponse = await blockBlobClient.download(0); // Start from the beginning of the blob
      const blobContent = await this.streamToString(downloadBlockBlobResponse.readableStreamBody);
      console.log(`Blob Content: ${blobContent}`);
      return blobContent;
    } catch (error) {
      console.error(`Error getting blob content: ${error.message}`);
      throw error;
    }
  }

  async uploadFileStream(localFilePath, blobName) {
    const containerClient = this.blobServiceClient.getContainerClient(this.containerName);
    const blockBlobClient = containerClient.getBlockBlobClient(blobName);

    try {
      const readStream = fs.createReadStream(localFilePath);

      // Upload the file as a stream
      const uploadBlobResponse = await blockBlobClient.uploadStream(
        readStream,
        4 * 1024 * 1024, // 4MB block size for better performance
        20, // Number of parallel uploads
        { blobHTTPHeaders: { blobContentType: 'application/octet-stream' } }
      );

      console.log(`File uploaded to Blob: ${uploadBlobResponse.requestId}`);
      return uploadBlobResponse;
    } catch (error) {
      console.error(`Error uploading file to Blob: ${error.message}`);
      throw error;
    }
  }

  async uploadFile(blobName, data) {
    const containerClient = this.blobServiceClient.getContainerClient(this.containerName);
    const blockBlobClient = containerClient.getBlockBlobClient(blobName);

    const uploadBlobResponse = await blockBlobClient.upload(data, data.length);
    console.log(`Blob uploaded: ${uploadBlobResponse.requestId}`);
    return uploadBlobResponse;
  }

  async uploadToBlob(fileBuffer, originalName) {  
    const containerClient = this.blobServiceClient.getContainerClient(this.containerName);
  
    const blockBlobClient = containerClient.getBlockBlobClient(originalName);
  
    await blockBlobClient.uploadData(fileBuffer);
    return blockBlobClient.url;
  }

  async uploadSnippet(title, description, content) {  
    const containerClient = this.blobServiceClient.getContainerClient(this.containerName);
  
    const blockBlobClient = containerClient.getBlockBlobClient(title);
    // create buffer for the provided data
    const buffer = Buffer.from(content);
    await blockBlobClient.uploadData(buffer);
    return blockBlobClient.url;
  }

};

module.exports = AzureStorageService;
