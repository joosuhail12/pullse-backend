const { BlobServiceClient, StorageSharedKeyCredential } = require('@azure/storage-blob');

const StorageService = require("./StorageService");

class AzureStorageService extends StorageService {

  constructor() {
    this.accountName = 'pullseaipublicassets';
    this.accountKey = 'rAy43JOCKTQRL4PKIxpHet3hi+q7FCWHlZJXKhNyHlS1OrVqTKXyB0h7MpOUYGNS9ElwFLmc6YhJ+AStwJDTDQ==';
    this.containerName = 'pullse-ai-public-assets';
  }

  init() {
    this.sharedKeyCredential = new StorageSharedKeyCredential(this.accountName, this.accountKey);
    this.blobServiceClient = new BlobServiceClient(`https://${this.accountName}.blob.core.windows.net`, this.sharedKeyCredential);
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

};

module.exports = AzureStorageService;
