import { useState, useRef, useEffect } from "react";

const quickEmojis = [
  "😀", "😂", "😍", "🥺", "😎", "🔥", "❤️", "👍",
  "👋", "🎉", "😊", "🤔", "💯", "✨", "😢", "🙌"
];

function MessageInput({ onSend, onTypingStart, onTypingStop }) {
  const [text, setText] = useState("");
  const [showEmoji, setShowEmoji] = useState(false);
  const inputRef = useRef(null);
  const typingRef = useRef(false);
  const typingTimerRef = useRef(null);

  function handleChange(e) {
    setText(e.target.value);
    if (!typingRef.current && e.target.value.length > 0) {
      typingRef.current = true;
      onTypingStart();
    }
    clearTimeout(typingTimerRef.current);
    typingTimerRef.current = setTimeout(() => {
      typingRef.current = false;
      onTypingStop();
    }, 1500);
  }

  function handleSubmit(e) {
    e.preventDefault();
    let trimmed = text.trim();
    if (!trimmed) return;
    onSend(trimmed);
    setText("");
    setShowEmoji(false);
    typingRef.current = false;
    clearTimeout(typingTimerRef.current);
    onTypingStop();
  }

  function handleKeyDown(e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  }

  function addEmoji(emoji) {
    setText((prev) => prev + emoji);
    setShowEmoji(false);
    if (inputRef.current) inputRef.current.focus();
  }

  return (
    <div className="message-input-area">
      <form onSubmit={handleSubmit} style={{ width: '100%' }}>
        <div className="input-container" style={{ position: 'relative' }}>
          <button 
            type="button" 
            className="emoji-btn" 
            title="Emojis"
            onClick={() => setShowEmoji(!showEmoji)}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/></svg>
          </button>
          
          {showEmoji && (
            <div className="emoji-picker" style={{ left: '0', right: 'auto', bottom: '60px' }}>
              {quickEmojis.map((em) => (
                <button type="button" key={em} onClick={() => addEmoji(em)}>{em}</button>
              ))}
            </div>
          )}

          <textarea
            ref={inputRef}
            className="message-input"
            placeholder="Write a Message"
            value={text}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            rows={1}
          />
          <button type="submit" className="send-btn" disabled={!text.trim()} title="Send">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
          </button>
        </div>
      </form>
    </div>
  );
}

export default MessageInput;
