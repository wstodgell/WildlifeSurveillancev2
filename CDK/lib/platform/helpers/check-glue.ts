/*import { S3Client, HeadObjectCommand } from '@aws-sdk/client-s3';

export async function checkFileExists(
  bucketName: string,
  filePath: string,
  region: string
): Promise<boolean> {
  const s3Client = new S3Client({ region });

  try {
    const command = new HeadObjectCommand({
      Bucket: bucketName,
      Key: filePath,
    });
    await s3Client.send(command);
    console.log(`File exists: s3://${bucketName}/${filePath}`);
    return true;
  } catch (error: any) {
    if (error.name === 'NotFound') {
      console.error(`File does not exist: s3://${bucketName}/${filePath}`);
      return false;
    } else {
      console.error(`Error checking file existence:`, error);
      throw error;
    }
  }
}*/
