const awsmobile = {
  Auth: {
    region: "us-east-1",
    userPoolId: process.env.REACT_APP_USER_POOL_ID,
    userPoolWebClientId: process.env.REACT_APP_USER_POOL_CLIENT_ID,
    identityPoolId: process.env.REACT_APP_IDENTITY_POOL_ID,
  },
  Storage: {
    AWSS3: {
      bucket: "lab-sample-uploads",
      region: "us-east-1",
    },
  },
  Amplify: {
    appId: process.env.REACT_APP_AMPLIFY_APP_ID, // Pulled from CDK
  },
};

export default awsmobile;
