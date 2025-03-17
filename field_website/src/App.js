import React, { useEffect, useState } from "react";
import { Amplify, Auth } from "aws-amplify";
import getCognitoConfig from "./aws-exports";
import Login from "./components/Login";
import FileUpload from "./components/FileUpload";

function App() {
  const [configLoaded, setConfigLoaded] = useState(false);

  useEffect(() => {
    async function loadConfig() {
      const config = await getCognitoConfig();
      if (config) {
        Amplify.configure(config); // ✅ Dynamically load Cognito config
        setConfigLoaded(true);
      }
    }
    loadConfig();
  }, []);

  const [loggedIn, setLoggedIn] = useState(false);
  const handleLogin = () => setLoggedIn(true);
  const handleLogout = async () => {
    await Auth.signOut();
    setLoggedIn(false);
  };

  if (!configLoaded) {
    return <p>Loading authentication...</p>; // Show loading screen while fetching secrets
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
