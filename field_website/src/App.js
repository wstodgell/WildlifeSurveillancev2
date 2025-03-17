// ✅ Import core React functionality
import React, { useState, useEffect } from "react";
// - `useState`: Manages local component state (e.g., login status, loading state).
// - `useEffect`: Handles side effects (e.g., fetching AWS Amplify configuration on app load).

// ✅ Import AWS Amplify library
import { Amplify } from "aws-amplify";
// - This provides methods to configure AWS Amplify in the frontend. https://docs.amplify.aws/

import getCognitoConfig from "./aws-exports";
// - Import the function that dynamically retrieves AWS Cognito & Amplify settings from AWS Secrets Manager.

import Login from "./components/Login";
// - Import the `Login` component, responsible for user authentication.

import FileUpload from "./components/FileUpload";
// - Import the `FileUpload` component, which handles file uploads to S3.

// ✅ Main React Component
function App() {
  // 🔹 `loggedIn` state: Tracks whether a user is authenticated.
  const [loggedIn, setLoggedIn] = useState(false);

  // 🔹 `loading` state: Ensures the app doesn’t load before Amplify is configured.
  const [loading, setLoading] = useState(true);

  /**
   * ✅ useEffect Hook: Runs Once ([]) - Fetch AWS Amplify Config Dynamically
   * - This runs when the component mounts.
   * - It retrieves Cognito credentials from AWS Secrets Manager.
   * - Once retrieved, it configures AWS Amplify dynamically.
   */
  useEffect(() => {
    async function loadConfig() {
      console.log("🔍 Fetching Amplify Configuration...");

      // 🔹 Call `getCognitoConfig()` to fetch AWS secrets dynamically
      const config = await getCognitoConfig();

      if (config) {
        // ✅ Configure Amplify with retrieved credentials
        Amplify.configure(config);
        console.log("✅ Amplify Config Loaded:", config);

        // 🔹 Set `loading` to false once configuration is done
        setLoading(false);
      } else {
        // ❌ Handle missing configuration case
        console.error(
          "❌ No configuration found, authentication cannot continue."
        );
      }
    }

    loadConfig(); // 🔹 Run `loadConfig()` when the app starts
  }, []); // 🔹 Empty dependency array `[]` ensures this runs only **once** on mount.

  /**
   * ✅ Handle User Login
   * - Called when the user successfully logs in.
   * - Updates `loggedIn` state to `true`.
   */
  const handleLogin = () => setLoggedIn(true);

  /**
   * ✅ Handle User Logout
   * - Calls AWS Amplify’s `Auth.signOut()` method.
   * - Updates `loggedIn` state to `false`.
   */
  const handleLogout = async () => {
    await Amplify.Auth.signOut(); // ✅ Sign the user out from Cognito
    setLoggedIn(false); // 🔹 Update UI state
  };

  /**
   * ✅ Show Loading Screen While Fetching Configuration
   * - If the app is still fetching Cognito credentials, display a loading message.
   */
  if (loading) return <div>Loading authentication...</div>;

  /**
   * ✅ App UI Rendering
   * - Displays a **Navigation Bar** with a title and logout button (if logged in).
   * - If the user is **not logged in**, show the `Login` component.
   * - If the user **is logged in**, show the `FileUpload` component.
   */
  return (
    <div className="app-container">
      {/* ✅ Navigation Bar */}
      <nav className="navbar">
        <h1>Wildlife Lab Portal</h1>

        {/* ✅ Show "Logout" button only if user is logged in */}
        {loggedIn && (
          <button className="logout-btn" onClick={handleLogout}>
            Logout
          </button>
        )}
      </nav>

      {/* ✅ Main Content Area */}
      <div className="content-container">
        {/* ✅ If user is NOT logged in, show the Login form */}
        {!loggedIn ? <Login onLogin={handleLogin} /> : <FileUpload />}
        {/* ✅ If user IS logged in, show the File Upload feature */}
      </div>
    </div>
  );
}

// ✅ Export the App Component (Required for React)
export default App;
