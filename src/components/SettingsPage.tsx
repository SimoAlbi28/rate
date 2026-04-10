import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import ProfileMenu from './ProfileMenu';

export default function SettingsPage() {
  const navigate = useNavigate();
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const profileIcon = localStorage.getItem('profileIcon') || '👤';
  const profileColor = localStorage.getItem('profileColor') || '#3498db';

  return (
    <div className="page">
      <div className="home-sticky-top">
        <nav className="navbar">
          <div className="navbar-left">
            <img src="/rate-logo.png" alt="Logo" className="navbar-logo-img" onClick={() => navigate('/')} style={{ cursor: 'pointer' }} />
          </div>
          <div className="navbar-center">
            <h1>Rate & Pagamenti</h1>
            <p className="navbar-tagline">Tutto quello che devi pagare, qui.</p>
          </div>
          <button className="navbar-profile" style={{ background: profileColor }} onClick={() => setShowProfileMenu(!showProfileMenu)}>
            <span>{profileIcon}</span>
          </button>
        </nav>
        {showProfileMenu && <ProfileMenu onClose={() => setShowProfileMenu(false)} />}
        <div className="sticky-bar">
          <h2 style={{ textAlign: 'center', fontSize: '1.1rem', fontWeight: 'bold', color: '#333', letterSpacing: '2px', textTransform: 'uppercase' }}>Impostazioni</h2>
        </div>
      </div>

      <div className="content" style={{ paddingTop: '0.5rem' }}>
        <div className="card section-card">
          <h3 className="section-heading" style={{ textAlign: 'center', marginBottom: '0.25rem' }}>Preferenze</h3>
          <hr className="card-separator" />
          <p style={{ textAlign: 'center', color: '#999', fontSize: '0.85rem', padding: '1rem 0' }}>
            Nessuna impostazione disponibile al momento.
          </p>
        </div>
      </div>
    </div>
  );
}
