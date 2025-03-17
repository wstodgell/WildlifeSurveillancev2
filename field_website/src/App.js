import React, { useState, useEffect } from "react";
import { Amplify } from "aws-amplify";
import getCognitoConfig from "./aws-exports";
import Login from "./components/Login";
import FileUpload from "./components/FileUpload";

function App() {
  const [loggedIn, setLoggedIn] = useState(false);
  const [loading, setLoading] = useState(true);

  // ✅ Fetch Amplify config dynamically before using it
  useEffect(() => {
    async function loadConfig() {
      console.log("🔍 Fetching Amplify Configuration...");
      const config = await getCognitoConfig();
      if (config) {
        Amplify.configure(config);
        console.log("✅ Amplify Config Loaded:", config);
        setLoading(false);
      } else {
        console.error(
          "❌ No configuration found, authentication cannot continue."
        );
      }
    }
    loadConfig();
  }, []);

  const handleLogin = () => setLoggedIn(true);
  const handleLogout = async () => {
    await Amplify.Auth.signOut();
    setLoggedIn(false);
  };

  if (loading) return <div>Loading authentication...</div>;

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
