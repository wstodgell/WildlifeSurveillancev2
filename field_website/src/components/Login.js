import React, { useState } from "react";
import { Auth } from "aws-amplify";

function Login({ onLogin }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      await Auth.signIn(username, password);
      onLogin(); // Calls the parent function to set loggedIn = true
    } catch (err) {
      console.error("Login error: ", err);
      setError(err.message || "Failed to login.");
    }
  };

  return (
    <div className="login-container">
      <h2>Login</h2>
      {error && <p className="error-message">{error}</p>}
      <form onSubmit={handleLogin}>
        <input
          type="text"
          placeholder="Username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          required
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        <button type="submit">LOGIN</button>
      </form>
    </div>
  );
}

export default Login;
