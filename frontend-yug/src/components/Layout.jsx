import { useState, useRef, useEffect } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import api from '../api/axios';
import toast from 'react-hot-toast';

export default function Layout() {
  const { user, clearAuth } = useAuthStore();
  const navigate = useNavigate();
  const [opsOpen, setOpsOpen] = useState(false);
  const [userOpen, setUserOpen] = useState(false);
  const opsRef = useRef(null);
  const userRef = useRef(null);

  useEffect(() => {
    const handleClick = (e) => {
      if (opsRef.current && !opsRef.current.contains(e.target)) setOpsOpen(false);
      if (userRef.current && !userRef.current.contains(e.target)) setUserOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const handleLogout = async () => {
    try {
      await api.post('/auth/logout');
    } catch {}
    clearAuth();
    toast.success('Logged out');
    navigate('/login');
  };

  return (
    <>
      <nav className="navbar">
        <div className="nav-brand">📦 CoreInventory</div>
        <div className="nav-links">
          <NavLink to="/dashboard" className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}>Dashboard</NavLink>

          <div className="dropdown" ref={opsRef}>
            <button className="nav-link dropdown-trigger" onClick={() => setOpsOpen(!opsOpen)} style={{ border: 'none', background: 'none' }}>
              Operations ▾
            </button>
            {opsOpen && (
              <div className="dropdown-menu">
                <button className="dropdown-item" onClick={() => { navigate('/receipts'); setOpsOpen(false); }}>Receipts</button>
                <button className="dropdown-item" onClick={() => { navigate('/deliveries'); setOpsOpen(false); }}>Deliveries</button>
              </div>
            )}
          </div>

          <NavLink to="/products" className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}>Products</NavLink>
          <NavLink to="/stock" className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}>Stock</NavLink>
          <NavLink to="/move-history" className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}>Move History</NavLink>
          <NavLink to="/settings" className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}>Settings</NavLink>
        </div>

        <div className="dropdown" ref={userRef}>
          <div className="avatar" onClick={() => setUserOpen(!userOpen)}>
            {user?.login_id?.[0] || 'U'}
          </div>
          {userOpen && (
            <div className="dropdown-menu" style={{ right: 0, left: 'auto', transform: 'none' }}>
              <div style={{ padding: '8px 16px', fontWeight: 700, fontSize: 13, borderBottom: '2px solid var(--color-border)', textTransform: 'uppercase' }}>
                {user?.login_id || 'User'}
              </div>
              <button className="dropdown-item" onClick={handleLogout}>Logout</button>
            </div>
          )}
        </div>
      </nav>
      <main>
        <Outlet />
      </main>
    </>
  );
}
