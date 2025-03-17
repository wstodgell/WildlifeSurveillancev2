import { fetchAuthSession } from "@aws-amplify/auth";
import { Amplify } from "aws-amplify";
import AWS from "aws-sdk";
import awsExports from "./aws-exports"; // ✅ Ensure Amplify is configured before fetching credentials

// ✅ Ensure Amplify is initialized before fetching credentials
Amplify.configure(awsExports);

AWS.config.update({ region: "us-east-1" });

const SECRET_NAME = "AmplifyUserCredentials"; // Stored in AWS Secrets Manager

async function getCognitoConfig() {
  try {
    console.log(
      "🔍 Fetching Cognito Config using authenticated credentials..."
    );

    // ✅ Ensure Amplify is configured before fetching session
    const session = await fetchAuthSession().catch((error) => {
      console.error("❌ Error fetching session:", error);
      return null;
    });

    if (!session || !session.credentials) {
      throw new Error("❌ Unable to retrieve AWS credentials.");
    }

    // ✅ Set AWS SDK credentials dynamically
    AWS.config.credentials = session.credentials;

    const secretsManager = new AWS.SecretsManager();

    const data = await secretsManager
      .getSecretValue({ SecretId: SECRET_NAME })
      .promise();
    if (!data || !data.SecretString) {
      console.error("❌ Error: SecretString is empty!");
      return null;
    }

    console.log("✅ Retrieved Secret Data:", data.SecretString);
    const secrets = JSON.parse(data.SecretString);

    return {
      Auth: {
        region: "us-east-1",
        userPoolId: secrets.userPoolId || "MISSING_USER_POOL_ID",
        userPoolWebClientId: secrets.userPoolClientId || "MISSING_CLIENT_ID",
        identityPoolId: secrets.identityPoolId || "MISSING_IDENTITY_POOL_ID",
      },
      Storage: {
        AWSS3: {
          bucket: "lab-sample-uploads",
          region: "us-east-1",
        },
      },
      Amplify: {
        appId: secrets.amplifyAppId || "MISSING_APP_ID",
      },
    };
  } catch (error) {
    console.error("❌ Error retrieving Cognito Secrets:", error);
    return null;
  }
}

export default getCognitoConfig;
