import React, { useState } from "react";
import AWS from "aws-sdk";

//AWS.config.update({
//  accessKeyId: "YOUR_AWS_ACCESS_KEY",
//  secretAccessKey: "YOUR_AWS_SECRET_KEY",
//  region: "us-east-1",
//});

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
