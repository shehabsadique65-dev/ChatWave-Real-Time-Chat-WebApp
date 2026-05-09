import React from "react";

function Sidebar({ users, currentUser, isOpen, onClose, onLogout }) {
  return (
    <aside className={`sidebar ${isOpen ? "mobile-open" : ""}`}>
      <div className="sidebar-header" style={{ padding: '40px 40px 30px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 700 }}>Messages</h1>
        <button className="mobile-close" style={{ display: 'none', background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer' }} onClick={onClose}>✕</button>
      </div>

      <div className="sidebar-users" style={{ flex: 1, overflowY: 'auto', padding: '0 20px' }}>
        {/* You */}
        <div className="user-item active" style={{ background: '#f1f5f9', borderRadius: '16px', margin: '10px 0', padding: '12px', display: 'flex', alignItems: 'center' }}>
          <div className="user-avatar" style={{ background: '#1a1a1a', color: '#fff', width: '40px', height: '40px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}>{currentUser.avatar}</div>
          <div className="user-info" style={{ marginLeft: '12px' }}>
            <div className="user-name" style={{ fontWeight: 600 }}>{currentUser.username} (you)</div>
            <div className="user-status" style={{ fontSize: '0.8rem', color: '#22c55e' }}>● Online</div>
          </div>
        </div>

        {/* Others */}
        {users
          .filter(u => u.username !== currentUser.username)
          .map((u) => (
          <div key={u.id} className="user-item" style={{ padding: '12px', display: 'flex', alignItems: 'center' }}>
            <div className="user-avatar" style={{ background: '#e2e8f0', width: '40px', height: '40px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 600 }}>{u.avatar}</div>
            <div className="user-info" style={{ marginLeft: '12px' }}>
              <div className="user-name" style={{ fontWeight: 500 }}>{u.username}</div>
              <div className="user-status" style={{ fontSize: '0.8rem', color: '#71717a' }}>● Online</div>
            </div>
          </div>
        ))}
      </div>

      <div className="sidebar-footer" style={{ padding: '24px', background: '#fdfcfa', borderTop: '1px solid rgba(0,0,0,0.04)', marginTop: 'auto' }}>
        <div className="mobile-logout-wrapper" style={{ display: 'none' }}>
          <button className="logout-btn-premium" onClick={onLogout}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
            Logout Session
          </button>
        </div>
        <div className="login-signature" style={{ marginTop: '0' }}>
          <span>Crafted by <span className="sig-name">Shehab</span></span>
        </div>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        @media (max-width: 768px) {
          .mobile-close { display: block !important; }
          .mobile-logout-wrapper { display: block !important; margin-bottom: 15px; }
        }
      `}} />
    </aside>
  );
}

export default Sidebar;
