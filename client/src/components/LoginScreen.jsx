import { useState } from "react";
import Background3D from "./Background3D";

function LoginScreen({ onJoin }) {
  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [passphrase, setPassphrase] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    let trimFull = fullName.trim();
    let trimUser = username.trim();
    let trimPass = passphrase.trim();

    if (trimFull.length < 2 || trimUser.length < 2 || trimPass.length < 2) {
      setError("All fields must be at least 2 characters long.");
      return;
    }

    setIsLoading(true);
    try {
      const serverUrl = import.meta.env.VITE_SERVER_URL || "http://127.0.0.1:3040";
      const res = await fetch(`${serverUrl}/api/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: trimFull,
          username: trimUser,
          passphrase: trimPass
        })
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Login failed");
        setIsLoading(false);
        return;
      }

      onJoin(data.user);
    } catch (err) {
      setError("Network error. Is the server running?");
      setIsLoading(false);
    }
  }

  return (
    <div className="login-wrapper">
      <Background3D />
      <div className="login-card" style={{ height: "auto", paddingBottom: "40px" }}>
        <div className="login-logo" style={{ display: 'flex', justifyContent: 'center', marginBottom: '10px', position: 'relative', zIndex: 2 }}>
          <svg width="36" height="36" viewBox="0 0 24 24" fill="#1a1a1a">
            <circle cx="12" cy="6" r="4"/>
            <circle cx="6" cy="16" r="4"/>
            <circle cx="18" cy="16" r="4"/>
          </svg>
        </div>
        <h1 className="login-title">ChatWave</h1>
        <p className="login-subtitle">Connect with the world instantly</p>

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "10px", marginTop: "20px" }}>
          {error && <div style={{ color: "#ff4444", fontSize: "0.9rem", textAlign: "center" }}>{error}</div>}
          
          <input
            className="login-input"
            type="text"
            placeholder="Full Name"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            maxLength={30}
            style={{ marginBottom: "0" }}
          />
          <input
            className="login-input"
            type="text"
            placeholder="Unique Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            maxLength={20}
            style={{ marginBottom: "0" }}
          />
          <input
            className="login-input"
            type="password"
            placeholder="Passphrase (e.g. favorite pet)"
            value={passphrase}
            onChange={(e) => setPassphrase(e.target.value)}
            maxLength={30}
            style={{ marginBottom: "0" }}
          />

          <button
            className="login-btn"
            type="submit"
            disabled={isLoading || fullName.trim().length < 2 || username.trim().length < 2 || passphrase.trim().length < 2}
            style={{ marginTop: "10px" }}
          >
            {isLoading ? "Connecting..." : "Enter Chat"}
          </button>
        </form>

        <div className="login-signature" style={{ bottom: "10px" }}>
          <span>Crafted by <span className="sig-name">Shehab</span></span>
        </div>
      </div>
    </div>
  );
}

export default LoginScreen;
