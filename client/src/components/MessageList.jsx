import { useEffect, useRef } from "react";

function MessageList({ messages, currentUserId, isAdmin, onDelete }) {
  const bottomRef = useRef(null);

  useEffect(() => {
    if (bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  function formatTime(ts) {
    let d = new Date(ts);
    let h = d.getHours();
    let m = d.getMinutes();
    let ampm = h >= 12 ? "PM" : "AM";
    h = h % 12 || 12;
    return h + ":" + (m < 10 ? "0" + m : m) + " " + ampm;
  }

  return (
    <div className="messages-container">
      {messages.map((msg) => {
        if (msg.type === "system") {
          return (
            <div className="system-message" key={msg.id}>
              <span>{msg.content}</span>
            </div>
          );
        }

        let isOwn = msg.senderId === currentUserId;
        const isDeleted = msg.content === "This message was deleted by the admin";

        return (
          <div
            className={"message-wrapper " + (isOwn ? "own" : "other")}
            key={msg.id}
          >
            <div className="msg-sender" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>{isOwn ? "You" : msg.sender}</span>
              {isAdmin && !isDeleted && (
                <button 
                  onClick={() => onDelete(msg.id)}
                  style={{ background: 'none', border: 'none', color: '#ff4444', fontSize: '0.7rem', cursor: 'pointer', padding: '0 5px' }}
                  title="Delete message"
                >
                  ✕
                </button>
              )}
            </div>
            <div className={"msg-content " + (isDeleted ? "deleted-text" : "")} style={isDeleted ? { fontStyle: 'italic', opacity: 0.7 } : {}}>
              {msg.content}
            </div>
            <div className="msg-time">{formatTime(msg.timestamp)}</div>
          </div>
        );
      })}
      <div ref={bottomRef}></div>
    </div>
  );
}

export default MessageList;
