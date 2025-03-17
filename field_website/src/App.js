import React, { useEffect, useState } from "react";
import { Amplify } from "aws-amplify";
import { signOut } from "@aws-amplify/auth";
import getCognitoConfig from "./aws-exports";
import Login from "./components/Login";
import FileUpload from "./components/FileUpload";

function App() {
  const [configLoaded, setConfigLoaded] = useState(false);
  const [loggedIn, setLoggedIn] = useState(false);

  useEffect(() => {
    async function loadConfig() {
      try {
        console.log("🔍 Fetching Amplify Configuration...");
        const config = await getCognitoConfig();

        if (!config) {
          console.error(
            "❌ No configuration found, authentication cannot continue."
          );
          return;
        }

        console.log("✅ Amplify Config Loaded:", config);
        Amplify.configure(config);
        setConfigLoaded(true);
      } catch (error) {
        console.error("❌ Error loading AWS configuration:", error);
      }
    }
    loadConfig();
  }, []);

  const handleLogin = () => setLoggedIn(true);
  const handleLogout = async () => {
    await signOut();
    setLoggedIn(false);
  };

  if (!configLoaded) {
    return <p>Loading authentication...</p>;
  }

  return (
    <div className="app-container">
      <nav className="navbar">
        <h1>Wildlife Lab Portal</h1>
        {loggedIn && (
          <button className="logout-btn" onClick={handleLogout}>
            Logout
          </button>
        )}
      </nav>

      <div className="content-container">
        {!loggedIn ? <Login onLogin={handleLogin} /> : <FileUpload />}
      </div>
    </div>
  );
}

export default App;
