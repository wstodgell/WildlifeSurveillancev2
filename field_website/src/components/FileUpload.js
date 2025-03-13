import React, { useState } from "react";
import AWS from "aws-sdk";

// Function to determine if running locally
const isLocal = window.location.hostname === "localhost";

// Configure AWS SDK dynamically
if (isLocal) {
  // Running locally: Load credentials from environment variables
  AWS.config.update({
    accessKeyId: process.env.REACT_APP_AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.REACT_APP_AWS_SECRET_ACCESS_KEY,
    region: "us-east-1",
  });
} else {
  // Running in AWS: Use IAM Role (no need to set credentials manually)
  AWS.config.update({ region: "us-east-1" });
}

// Create S3 instance
const s3 = new AWS.S3();
const BUCKET_NAME = "lab-sample-uploads";

function FileUpload() {
  const [file, setFile] = useState(null);

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
  };

  const handleUpload = async () => {
    if (!file) {
      alert("Please select a file first!");
      return;
    }

    const params = {
      Bucket: BUCKET_NAME,
      Key: file.name,
      Body: file,
      ContentType: "application/zip",
    };

    try {
      await s3.upload(params).promise();
      alert("File uploaded successfully!");
    } catch (err) {
      console.error(err);
      alert("File upload failed.");
    }
  };

  return (
    <div className="upload-container">
      <h2>Upload a ZIP file</h2>
      <input type="file" accept=".zip" onChange={handleFileChange} />
      <button onClick={handleUpload}>Submit</button>
    </div>
  );
}

export default FileUpload;
