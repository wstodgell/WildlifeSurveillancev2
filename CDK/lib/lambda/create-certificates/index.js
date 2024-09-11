const AWS = require("aws-sdk");
const iot = new AWS.Iot();
const s3 = new AWS.S3();
const fs = require("fs");

exports.handler = async function (event) {
  const { certificatePem, keyPair } = await iot
    .createKeysAndCertificate({ setAsActive: true })
    .promise();

  const bucketName = process.env.BUCKET_NAME;

  // Upload the certificate and keys to S3
  await s3
    .putObject({
      Bucket: bucketName,
      Key: "certs/certificate.pem.crt",
      Body: certificatePem,
    })
    .promise();

  await s3
    .putObject({
      Bucket: bucketName,
      Key: "certs/private-key.pem",
      Body: keyPair.PrivateKey,
    })
    .promise();

  await s3
    .putObject({
      Bucket: bucketName,
      Key: "certs/public-key.pem",
      Body: keyPair.PublicKey,
    })
    .promise();

  // You can download the AmazonRootCA1.pem from a public URL and upload it too
  await s3
    .putObject({
      Bucket: bucketName,
      Key: "certs/AmazonRootCA1.pem",
      Body: fs.readFileSync("/path/to/AmazonRootCA1.pem"), // You can bundle this in Lambda or fetch it
    })
    .promise();

  return {
    statusCode: 200,
    body: "Certificates created and uploaded to S3",
  };
};
