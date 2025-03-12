import React, { useState } from "react";
import Login from "./components/Login";
import FileUpload from "./components/FileUpload";
import { Auth } from "aws-amplify";

function App() {
  const [loggedIn, setLoggedIn] = useState(false);

  const handleLogin = () => setLoggedIn(true);
  const handleLogout = async () => {
    await Auth.signOut();
    setLoggedIn(false);
  };

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
