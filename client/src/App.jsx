import { useState, useEffect } from "react";
import LoginScreen from "./components/LoginScreen";
import ChatScreen from "./components/ChatScreen";

function App() {
  const [user, setUser] = useState(() => {
    // Use sessionStorage instead of localStorage to allow multiple tabs
    // while still persisting across refreshes.
    const saved = sessionStorage.getItem("chat_user");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed && parsed.username) return parsed;
      } catch (e) {
        return null;
      }
    }
    return null;
  });

  function handleLogin(userData) {
    setUser(userData);
    sessionStorage.setItem("chat_user", JSON.stringify(userData));
  }

  function handleLogout() {
    setUser(null);
    sessionStorage.removeItem("chat_user");
  }

  if (!user) {
    return <LoginScreen onJoin={handleLogin} />;
  }

  return (
    <ChatScreen
      user={user}
      onLogout={handleLogout}
    />
  );
}

export default App;
