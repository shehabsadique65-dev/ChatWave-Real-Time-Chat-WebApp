import { useEffect, useState } from "react";
import socket from "../socket";
import CustomModal from "./CustomModal";

function UserManagement({ isOpen, onClose }) {
  const [users, setUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [modalConfig, setModalConfig] = useState({ 
    isOpen: false, 
    title: "", 
    message: "", 
    type: "alert",
    showInput: false,
    onConfirm: () => {} 
  });
  const [reasonInput, setReasonInput] = useState("Violation of chat rules");
  const [targetUserId, setTargetUserId] = useState(null);

  useEffect(() => {
    if (isOpen) {
      setIsLoading(true);
      socket.emit("admin_get_users");
    }

    socket.on("admin_users_list", (data) => {
      setUsers(data);
      setIsLoading(false);
    });

    return () => {
      socket.off("admin_users_list");
    };
  }, [isOpen]);

  function handleDeleteClick(id, name) {
    setTargetUserId(id);
    setReasonInput("Violation of chat rules");
    setModalConfig({
      isOpen: true,
      title: "Remove User",
      message: `Enter a reason for removing "${name}":`,
      type: "prompt",
      showInput: true,
      onConfirm: () => {
        socket.emit("admin_delete_user", { userId: id, reason: reasonInput });
        setModalConfig(prev => ({ ...prev, isOpen: false }));
      }
    });
  }

  if (!isOpen) return null;

  return (
    <div className="admin-modal-overlay">
      <div className="admin-modal-content">
        <div className="admin-modal-header">
          <h2>User Management</h2>
          <button className="close-modal-btn" onClick={onClose}>✕</button>
        </div>

        <div className="admin-modal-body">
          {isLoading ? (
            <div className="loading-state">Loading users...</div>
          ) : (
            <div className="user-table-wrapper">
              <table className="user-table">
                <thead>
                  <tr>
                    <th>Full Name</th>
                    <th>Username</th>
                    <th>Joined</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => (
                    <tr key={user.id}>
                      <td>{user.full_name}</td>
                      <td>@{user.username}</td>
                      <td>{new Date(user.created_at).toLocaleDateString()}</td>
                      <td>
                        <button 
                          className="delete-user-btn"
                          onClick={() => handleDeleteClick(user.id, user.full_name)}
                        >
                          Remove
                        </button>
                      </td>
                    </tr>
                  ))}
                  {users.length === 0 && (
                    <tr>
                      <td colSpan="4" style={{ textAlign: 'center', padding: '20px' }}>No users found.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      <CustomModal 
        {...modalConfig}
        inputValue={reasonInput}
        setInputValue={setReasonInput}
        onCancel={() => setModalConfig(prev => ({ ...prev, isOpen: false }))}
      />

      <style dangerouslySetInnerHTML={{ __html: `
        .admin-modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.85);
          backdrop-filter: blur(8px);
          display: flex;
          justify-content: center;
          align-items: center;
          z-index: 1000;
        }

        .admin-modal-content {
          background: #1a1a1a;
          width: 90%;
          max-width: 800px;
          border-radius: 20px;
          border: 1px solid rgba(255, 255, 255, 0.1);
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
          overflow: hidden;
        }

        .admin-modal-header {
          padding: 20px 30px;
          background: rgba(255, 255, 255, 0.03);
          display: flex;
          justify-content: space-between;
          align-items: center;
          border-bottom: 1px solid rgba(255, 255, 255, 0.05);
        }

        .admin-modal-header h2 {
          font-size: 1.25rem;
          color: #fff;
          margin: 0;
        }

        .close-modal-btn {
          background: none;
          border: none;
          color: rgba(255, 255, 255, 0.5);
          font-size: 1.5rem;
          cursor: pointer;
        }

        .admin-modal-body {
          padding: 30px;
          max-height: 70vh;
          overflow-y: auto;
        }

        .user-table {
          width: 100%;
          border-collapse: collapse;
          text-align: left;
        }

        .user-table th {
          padding: 15px;
          color: rgba(255, 255, 255, 0.4);
          font-weight: 500;
          font-size: 0.85rem;
          text-transform: uppercase;
          border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        }

        .user-table td {
          padding: 15px;
          color: rgba(255, 255, 255, 0.8);
          border-bottom: 1px solid rgba(255, 255, 255, 0.05);
        }

        .delete-user-btn {
          background: rgba(255, 68, 68, 0.1);
          color: #ff4444;
          border: 1px solid rgba(255, 68, 68, 0.2);
          padding: 6px 12px;
          border-radius: 6px;
          font-size: 0.8rem;
          cursor: pointer;
        }

        .loading-state {
          text-align: center;
          padding: 40px;
          color: rgba(255, 255, 255, 0.5);
        }

        @media (max-width: 600px) {
          .admin-modal-header {
            padding: 15px 20px;
          }
          .admin-modal-body {
            padding: 10px;
          }
          .user-table th:nth-child(1), .user-table td:nth-child(1) {
             max-width: 100px;
             overflow: hidden;
             text-overflow: ellipsis;
             white-space: nowrap;
          }
          .user-table th:nth-child(3), .user-table td:nth-child(3) {
            display: none; /* Hide 'Joined' date on mobile */
          }
          .user-table td, .user-table th {
            padding: 10px 5px;
            font-size: 0.75rem;
          }
        }
      `}} />
    </div>
  );
}

export default UserManagement;
