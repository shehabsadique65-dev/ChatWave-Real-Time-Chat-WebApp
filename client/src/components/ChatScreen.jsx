import { useState, useEffect, useRef } from "react";
import socket from "../socket";
import SidebarRail from "./SidebarRail";
import Sidebar from "./Sidebar";
import MessageList from "./MessageList";
import MessageInput from "./MessageInput";
import UserManagement from "./UserManagement";
import CustomModal from "./CustomModal";

function ChatScreen({ user, onLogout }) {
  const [messages, setMessages] = useState([]);
  const [users, setUsers] = useState([]);
  const [typingUsers, setTypingUsers] = useState([]);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isAdminPanelOpen, setIsAdminPanelOpen] = useState(false);
  const isKickedRef = useRef(false);
  
  const [modalConfig, setModalConfig] = useState({ 
    isOpen: false, 
    title: "", 
    message: "", 
    type: "alert",
    onConfirm: () => {} 
  });

  const [currentUser, setCurrentUser] = useState({
    username: user.username,
    fullName: user.full_name,
    role: user.role || "user",
    avatar: user.username.charAt(0).toUpperCase(),
    id: null
  });

  useEffect(() => {
    if (isKickedRef.current) return;
    socket.connect();
    socket.emit("user_join", user);
    socket.on("connect", () => setCurrentUser((prev) => ({ ...prev, id: socket.id })));
    if (socket.connected) setCurrentUser((prev) => ({ ...prev, id: socket.id }));
    socket.on("message_history", (history) => setMessages(history));
    socket.on("receive_message", (msg) => setMessages((prev) => [...prev, msg]));
    socket.on("message_deleted", ({ id, newContent }) => {
      setMessages((prev) => prev.map(m => m.id === id ? { ...m, content: newContent } : m));
    });
    socket.on("chat_cleared", () => setMessages([]));
    socket.on("user_list", (list) => setUsers(list));
    socket.on("user_typing", ({ username: name, isTyping }) => {
      setTypingUsers((prev) => isTyping ? (prev.includes(name) ? prev : [...prev, name]) : prev.filter((u) => u !== name));
    });
    socket.on("user_kicked", ({ reason }) => {
      isKickedRef.current = true;
      socket.disconnect();
      setModalConfig({ isOpen: true, title: "Access Revoked", message: `Removed by admin. Reason: ${reason}`, type: "alert", onConfirm: () => onLogout() });
    });
    socket.on("force_logout", ({ reason }) => {
      isKickedRef.current = true;
      socket.disconnect();
      setModalConfig({ isOpen: true, title: "Session Expired", message: reason, type: "alert", onConfirm: () => onLogout() });
    });

    return () => {
      socket.off("connect");
      socket.off("message_history");
      socket.off("receive_message");
      socket.off("message_deleted");
      socket.off("chat_cleared");
      socket.off("user_list");
      socket.off("user_typing");
      socket.off("user_kicked");
      socket.off("force_logout");
      socket.disconnect();
    };
  }, [user, onLogout]);

  function handleSend(content) { socket.emit("send_message", { content }); }
  function handleLogout() { socket.disconnect(); onLogout(); }
  function handleDeleteMessage(id) { socket.emit("admin_delete_message", id); }
  function handleClearChat() {
    setModalConfig({
      isOpen: true,
      title: "Wipe Chat Data",
      message: "This will delete all messages for everyone. Continue?",
      type: "confirm",
      onConfirm: () => {
        socket.emit("admin_clear_all");
        setModalConfig(prev => ({ ...prev, isOpen: false }));
      }
    });
  }

  return (
    <div className="chat-layout">
      {sidebarOpen && <div className="mobile-overlay" onClick={() => setSidebarOpen(false)} />}
      
      <SidebarRail onLogout={handleLogout} />

      <Sidebar
        users={users}
        currentUser={currentUser}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        onLogout={handleLogout}
      />

      <main className="chat-main">
        <header className="chat-header">
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <button className="mobile-menu-toggle" style={{ display: 'none' }} onClick={() => setSidebarOpen(true)}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
            </button>
            <div className="chat-room-info">
              <h2 style={{ fontSize: '1.2rem', fontWeight: 700 }}>
                General Chat 
                {currentUser.role === 'admin' && <span className="admin-badge">ADMIN</span>}
              </h2>
              <span style={{ fontSize: '0.8rem', color: '#71717a' }}>{users.length} Online</span>
            </div>
          </div>
          
          {currentUser.role === 'admin' && (
            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={() => setIsAdminPanelOpen(true)} className="admin-btn users">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                <span>Users</span>
              </button>
              <button onClick={handleClearChat} className="admin-btn wipe">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
                <span>Wipe</span>
              </button>
            </div>
          )}
        </header>

        <MessageList
          messages={messages}
          currentUserId={socket.id}
          isAdmin={currentUser.role === 'admin'}
          onDelete={handleDeleteMessage}
        />

        <div className="typing-indicator" style={{ paddingLeft: '40px', height: '20px', fontSize: '0.8rem' }}>
          {typingUsers.length > 0 && `${typingUsers.join(", ")} ${typingUsers.length > 1 ? 'are' : 'is'} typing...`}
        </div>

        <MessageInput
          onSend={handleSend}
          onTypingStart={() => socket.emit("typing_start")}
          onTypingStop={() => socket.emit("typing_stop")}
        />
      </main>

      <UserManagement isOpen={isAdminPanelOpen} onClose={() => setIsAdminPanelOpen(false)} />
      <CustomModal {...modalConfig} onCancel={() => setModalConfig(prev => ({ ...prev, isOpen: false }))} />

      <style dangerouslySetInnerHTML={{ __html: `
        @media (max-width: 768px) {
          .mobile-menu-toggle { display: block !important; }
          .admin-btn span { display: none; }
          .admin-btn { padding: 8px !important; }
        }
      `}} />
    </div>
  );
}

export default ChatScreen;
