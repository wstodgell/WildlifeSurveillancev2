const awsmobile = {
  Auth: {
    region: "us-east-1", // Change if needed
    userPoolId: "us-east-1_xxxxxxxxx", // Replace with your User Pool ID from CDK output
    userPoolWebClientId: "xxxxxxxxxxxxxxx", // Replace with your User Pool Client ID
    identityPoolId: "us-east-1:xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx", // Replace with your Identity Pool ID
  },
  Storage: {
    AWSS3: {
      bucket: "lab-sample-uploads", // Your S3 Bucket
      region: "us-east-1",
    },
  },
};
export default awsmobile;
