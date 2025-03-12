import React, { useState } from "react";
import { Auth } from "aws-amplify";

function Login({ onLogin }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const handleLogin = async () => {
    try {
      await Auth.signIn(username, password);
      onLogin(); // Switch to upload screen
    } catch (error) {
      alert("Invalid credentials");
      console.error("Login error:", error);
    }
  };

  return (
    <div className="login-container">
      <h2>Login</h2>
      <input
        type="text"
        placeholder="Username"
        onChange={(e) => setUsername(e.target.value)}
      />
      <input
        type="password"
        placeholder="Password"
        onChange={(e) => setPassword(e.target.value)}
      />
      <button onClick={handleLogin}>LOGIN</button>
    </div>
  );
}

export default Login;
