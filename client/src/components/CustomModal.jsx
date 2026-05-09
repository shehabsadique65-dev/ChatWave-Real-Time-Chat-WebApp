import React from "react";

function CustomModal({ isOpen, title, message, type, onConfirm, onCancel, showInput, inputValue, setInputValue }) {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-box">
        <div className="modal-header">
          <h3>{title}</h3>
        </div>
        <div className="modal-body">
          <p>{message}</p>
          {showInput && (
            <input 
              type="text" 
              className="modal-input" 
              value={inputValue} 
              onChange={(e) => setInputValue(e.target.value)}
              autoFocus
            />
          )}
        </div>
        <div className="modal-footer">
          {type === "confirm" || type === "prompt" ? (
            <>
              <button className="modal-btn secondary" onClick={onCancel}>Cancel</button>
              <button className="modal-btn primary" onClick={onConfirm}>Confirm</button>
            </>
          ) : (
            <button className="modal-btn primary" onClick={onConfirm}>OK</button>
          )}
        </div>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.7);
          backdrop-filter: blur(5px);
          display: flex;
          justify-content: center;
          align-items: center;
          z-index: 9999;
          animation: fadeIn 0.2s ease;
        }

        .modal-box {
          background: #1e1e1e;
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 16px;
          width: 90%;
          max-width: 400px;
          padding: 24px;
          box-shadow: 0 20px 40px rgba(0,0,0,0.4);
          animation: scaleUp 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
        }

        .modal-header h3 {
          margin: 0 0 12px 0;
          color: #fff;
          font-size: 1.25rem;
        }

        .modal-body p {
          color: rgba(255, 255, 255, 0.7);
          margin: 0 0 20px 0;
          line-height: 1.5;
        }

        .modal-input {
          width: 100%;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 8px;
          padding: 12px;
          color: white;
          margin-bottom: 20px;
          outline: none;
        }

        .modal-input:focus {
          border-color: #ffd700;
        }

        .modal-footer {
          display: flex;
          justify-content: flex-end;
          gap: 12px;
        }

        .modal-btn {
          padding: 10px 20px;
          border-radius: 8px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
          border: none;
        }

        .modal-btn.primary {
          background: #ffd700;
          color: #000;
        }

        .modal-btn.primary:hover {
          background: #ffec8b;
          transform: translateY(-2px);
        }

        .modal-btn.secondary {
          background: rgba(255, 255, 255, 0.1);
          color: #fff;
        }

        .modal-btn.secondary:hover {
          background: rgba(255, 255, 255, 0.2);
        }

        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        @keyframes scaleUp {
          from { transform: scale(0.9); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }
      `}} />
    </div>
  );
}

export default CustomModal;
