import AWS from "aws-sdk";

// ✅ AWS SDK Configuration (No Hardcoded Credentials)
AWS.config.update({ region: "us-east-1" });

const secretsManager = new AWS.SecretsManager();
const SECRET_NAME = "AmplifyUserCredentials"; // Stored in AWS Secrets Manager

async function getCognitoConfig() {
  try {
    const data = await secretsManager
      .getSecretValue({ SecretId: SECRET_NAME })
      .promise();
    const secrets = JSON.parse(data.SecretString);

    return {
      Auth: {
        region: "us-east-1",
        userPoolId: secrets.userPoolId,
        userPoolWebClientId: secrets.userPoolClientId,
        identityPoolId: secrets.identityPoolId,
      },
      Storage: {
        AWSS3: {
          bucket: "lab-sample-uploads",
          region: "us-east-1",
        },
      },
      Amplify: {
        appId: secrets.amplifyAppId, // Retrieved dynamically
      },
    };
  } catch (error) {
    console.error("Error retrieving Cognito Secrets:", error);
    return null;
  }
}

export default getCognitoConfig;
