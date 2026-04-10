import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Pencil, Check, X, LogOut, LogIn } from 'lucide-react';
import { useAuth } from '../AuthContext';
import { supabase } from '../supabaseClient';
import ProfileMenu from './ProfileMenu';

const PROFILE_ICONS = [
  '👤', '👩', '👨', '🧑', '👧', '👦', '🧔', '👩‍💼', '👨‍💼', '🧑‍💻',
  '👩‍🎓', '👨‍🎓', '🦸', '🧑‍🚀', '🥷', '🐻', '🦊', '🐼', '🦁', '🐸',
  '👻', '🤖', '👽', '🎃', '😎', '🤠', '🥸', '🧛', '🧙', '🧑‍🎤',
  '👩‍🔬', '👨‍🍳', '👩‍🚒', '👨‍✈️', '🧑‍⚕️', '💂', '🕵️', '👷', '👸', '🤴',
  '🦄', '🐶', '🐱', '🐯', '🐨', '🐰', '🦉', '🦋', '🐙', '🐵',
];

const PROFILE_COLORS = [
  // Rossi: scuro → chiaro
  '#7b241c', '#c0392b', '#e74c3c', '#f1948a', '#f5b7b1',
  // Arancioni
  '#784212', '#d35400', '#e67e22', '#f39c12', '#fad7a0',
  // Verdi
  '#145a32', '#1e8449', '#27ae60', '#2ecc71', '#abebc6',
  // Blu
  '#1b2631', '#1a5276', '#2980b9', '#3498db', '#aed6f1',
  // Viola
  '#4a235a', '#6c3483', '#8e44ad', '#a569bd', '#d2b4de',
  // Rosa
  '#78281f', '#b03a6e', '#e84393', '#f06292', '#f8bbd0',
  // Grigi
  '#1c1c1c', '#2d3436', '#636e72', '#95a5a6', '#d5dbdb',
];

export default function ProfilePage() {
  const navigate = useNavigate();
  const { user, isGuest, signOut } = useAuth();

  const [showPassword, setShowPassword] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showIconEditor, setShowIconEditor] = useState(false);
  const [showAllIcons, setShowAllIcons] = useState(false);
  const [editingField, setEditingField] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Profile data: source of truth is user_metadata, localStorage is a cache
  const meta = (user?.user_metadata || {}) as Record<string, string | undefined>;
  const [nome, setNome] = useState(() => meta.nome || localStorage.getItem('profile-nome') || '');
  const [cognome, setCognome] = useState(() => meta.cognome || localStorage.getItem('profile-cognome') || '');
  const [pIcon, setPIcon] = useState(() => meta.profileIcon || localStorage.getItem('profileIcon') || '👤');
  const [pColor, setPColor] = useState(() => meta.profileColor || localStorage.getItem('profileColor') || '#3498db');

  // Sync user_metadata into localStorage cache so other components stay in sync
  useEffect(() => {
    if (!user) return;
    const m = (user.user_metadata || {}) as Record<string, string | undefined>;
    if (m.nome) { localStorage.setItem('profile-nome', m.nome); setNome(m.nome); }
    if (m.cognome) { localStorage.setItem('profile-cognome', m.cognome); setCognome(m.cognome); }
    if (m.profileIcon) { localStorage.setItem('profileIcon', m.profileIcon); setPIcon(m.profileIcon); }
    if (m.profileColor) { localStorage.setItem('profileColor', m.profileColor); setPColor(m.profileColor); }
  }, [user]);
  const profileIcon = pIcon;
  const profileColor = pColor;

  const email = user?.email || '';
  const [savedPwd, setSavedPwd] = useState(() => localStorage.getItem('profile-pwd-hint') || '');
  const passwordMask = '••••••••';
  const [firstLogin, setFirstLogin] = useState(() => localStorage.getItem('rate-first-login') === 'true');

  const startEdit = (field: string, currentValue: string) => {
    setEditingField(field);
    setEditValue(currentValue);
    setError('');
    setSuccess('');
  };

  const cancelEdit = () => {
    setEditingField(null);
    setEditValue('');
    setError('');
  };

  const saveField = async (field: string) => {
    setError('');
    setSuccess('');

    if (field === 'nome') {
      setNome(editValue);
      localStorage.setItem('profile-nome', editValue);
      if (user) await supabase.auth.updateUser({ data: { nome: editValue } });
      setSuccess('Nome aggiornato');
    } else if (field === 'cognome') {
      setCognome(editValue);
      localStorage.setItem('profile-cognome', editValue);
      if (user) await supabase.auth.updateUser({ data: { cognome: editValue } });
      setSuccess('Cognome aggiornato');
    } else if (field === 'email') {
      if (!user) { setError('Devi avere un account per modificare la email'); return; }
      const { error } = await supabase.auth.updateUser({ email: editValue });
      if (error) { setError(error.message); return; }
      setSuccess('Email aggiornata. Controlla la nuova email per confermare.');
    } else if (field === 'password') {
      if (!user) { setError('Devi avere un account per modificare la password'); return; }
      if (editValue.length < 6) { setError('La password deve avere almeno 6 caratteri'); return; }
      const { error } = await supabase.auth.updateUser({ password: editValue });
      if (error) { setError(error.message); return; }
      localStorage.setItem('profile-pwd-hint', editValue);
      setSavedPwd(editValue);
      setSuccess('Password aggiornata');
    }

    setEditingField(null);
    setEditValue('');
    setTimeout(() => setSuccess(''), 3000);
  };

  const renderField = (label: string, field: string, value: string, options?: { isPassword?: boolean }) => {
    const isEditing = editingField === field;
    const displayValue = options?.isPassword ? (showPassword ? (savedPwd || 'Non salvata') : (savedPwd ? passwordMask : 'Non salvata')) : (value || 'Non impostato');
    const isDisabled = (field === 'email' || field === 'password') && isGuest;

    return (
      <div style={{ padding: '0.75rem 0', borderBottom: '1px solid #eee' }}>
        <div style={{ fontSize: '0.7rem', color: '#999', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '0.3rem' }}>{label}</div>
        {isEditing ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <input
              type={field === 'password' ? 'password' : 'text'}
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              autoFocus
              style={{ flex: 1, padding: '0.5rem', borderRadius: '0.4rem', border: '1.5px solid #3498db', fontSize: '0.9rem', outline: 'none' }}
              onKeyDown={(e) => { if (e.key === 'Enter') saveField(field); if (e.key === 'Escape') cancelEdit(); }}
            />
            <button onClick={() => saveField(field)} style={{ background: '#27ae60', border: 'none', borderRadius: '50%', width: 30, height: 30, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
              <Check size={14} color="white" />
            </button>
            <button onClick={cancelEdit} style={{ background: '#e74c3c', border: 'none', borderRadius: '50%', width: 30, height: 30, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
              <X size={14} color="white" />
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '0.95rem', color: value ? '#333' : '#ccc', fontStyle: value ? 'normal' : 'italic' }}>{displayValue}</span>
            <div style={{ display: 'flex', gap: '0.4rem' }}>
              {options?.isPassword && (
                <button onClick={() => setShowPassword(!showPassword)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0.2rem', color: '#999' }}>
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              )}
              {!isDisabled && (
                <button onClick={() => startEdit(field, options?.isPassword ? '' : value)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0.2rem', color: '#3498db' }}>
                  <Pencil size={16} />
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    );
  };

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
        {showProfileMenu && <ProfileMenu onClose={() => setShowProfileMenu(false)} variant="settings-only" />}
        <div className="sticky-bar">
          <h2 style={{ textAlign: 'center', fontSize: '1.1rem', fontWeight: 'bold', color: '#333', letterSpacing: '2px', textTransform: 'uppercase' }}>Profilo</h2>
        </div>
      </div>

      <div className="content" style={{ paddingTop: '0.5rem' }}>
        {/* AVATAR */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '1rem' }}>
          <div style={{ width: 70, height: 70, borderRadius: '50%', background: profileColor, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2rem', boxShadow: '0 2px 10px rgba(0,0,0,0.15)' }}>
            {profileIcon}
          </div>
          <button onClick={() => setShowIconEditor(true)} style={{ marginTop: '0.4rem', background: 'none', border: 'none', cursor: 'pointer', color: '#3498db', display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.75rem' }}>
            <Pencil size={13} /> Modifica
          </button>
        </div>

        {showIconEditor && (
          <div className="modal-overlay" onClick={() => setShowIconEditor(false)}>
            <div className="profile-modal" onClick={(e) => e.stopPropagation()}>
              <div className="profile-modal-header">
                <h2>Modifica icona</h2>
                <button className="profile-modal-close" onClick={() => setShowIconEditor(false)}>&times;</button>
              </div>
              <div className="profile-modal-content">
                <div className="profile-preview" style={{ background: pColor }}>
                  <span>{pIcon}</span>
                </div>
                <h3 className="profile-section-title">Scegli icona</h3>
                <div className="profile-grid">
                  {(() => {
                    const COLS = 5;
                    const VISIBLE_ROWS = 3;
                    const visibleCount = COLS * VISIBLE_ROWS;
                    const icons = showAllIcons
                      ? PROFILE_ICONS
                      : (() => {
                          const idx = PROFILE_ICONS.indexOf(pIcon);
                          if (idx < visibleCount) return PROFILE_ICONS.slice(0, visibleCount);
                          const reordered = [pIcon, ...PROFILE_ICONS.filter((i) => i !== pIcon)];
                          return reordered.slice(0, visibleCount);
                        })();
                    return icons.map((icon) => (
                      <button
                        key={icon}
                        className={`profile-grid-btn ${pIcon === icon ? 'active' : ''}`}
                        onClick={() => setPIcon(icon)}
                      >
                        {icon}
                      </button>
                    ));
                  })()}
                </div>
                <button className="profile-show-more" onClick={() => setShowAllIcons(!showAllIcons)}>
                  {showAllIcons ? 'Mostra meno' : 'Mostra di più'}
                </button>
                <h3 className="profile-section-title">Colore sfondo</h3>
                <div className="profile-colors">
                  {PROFILE_COLORS.map((color) => (
                    <button
                      key={color}
                      className={`profile-color-btn ${pColor === color ? 'active' : ''}`}
                      style={{ background: color }}
                      onClick={() => setPColor(color)}
                    />
                  ))}
                </div>
              </div>
              <div className="profile-modal-actions">
                <button className="profile-btn-back" onClick={() => { setPIcon(localStorage.getItem('profileIcon') || '👤'); setPColor(localStorage.getItem('profileColor') || '#3498db'); setShowIconEditor(false); }}>Indietro</button>
                <button className="profile-btn-save" onClick={async () => { localStorage.setItem('profileIcon', pIcon); localStorage.setItem('profileColor', pColor); if (user) await supabase.auth.updateUser({ data: { profileIcon: pIcon, profileColor: pColor } }); setShowIconEditor(false); }}>Salva</button>
              </div>
            </div>
          </div>
        )}

        {firstLogin && user && !savedPwd && (
          <>
            <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 9998 }} />
            <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', background: 'white', borderRadius: '1rem', padding: '1.5rem', zIndex: 9999, maxWidth: '85vw', width: '320px', boxShadow: '0 8px 30px rgba(0,0,0,0.2)', textAlign: 'center' }}>
              <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🔐</div>
              <h3 style={{ margin: '0 0 0.5rem', color: '#333', fontSize: '1rem' }}>Salva la tua password</h3>
              <p style={{ color: '#666', fontSize: '0.8rem', margin: '0 0 1rem', lineHeight: '1.4' }}>
                Scrivi la tua password nel campo "Password" qui sotto per poterla consultare in futuro. Verrà salvata solo su questo dispositivo.
              </p>
              <button
                onClick={() => { setFirstLogin(false); localStorage.removeItem('rate-first-login'); startEdit('password', ''); }}
                style={{ background: '#27ae60', color: 'white', border: 'none', borderRadius: '0.5rem', padding: '0.6rem 1.5rem', fontSize: '0.85rem', fontWeight: 'bold', cursor: 'pointer', width: '100%' }}
              >
                {savedPwd ? 'Ho capito' : 'Salva ora'}
              </button>
              {savedPwd && (
                <button
                  onClick={() => { setFirstLogin(false); localStorage.removeItem('rate-first-login'); }}
                  style={{ background: 'none', border: 'none', color: '#e74c3c', fontSize: '0.75rem', cursor: 'pointer', marginTop: '0.5rem' }}
                >
                  Password già salvata, chiudi
                </button>
              )}
            </div>
          </>
        )}

        {isGuest && (
          <div style={{ textAlign: 'center', background: '#fff3cd', padding: '0.5rem', borderRadius: '0.5rem', fontSize: '0.75rem', color: '#856404', marginBottom: '1rem' }}>
            Modalità ospite — Email e password non disponibili
          </div>
        )}

        <div className="card section-card">
          {error && <p style={{ color: '#e74c3c', fontSize: '0.8rem', textAlign: 'center', margin: '0 0 0.5rem' }}>{error}</p>}
          {success && <p style={{ color: '#27ae60', fontSize: '0.8rem', textAlign: 'center', margin: '0 0 0.5rem' }}>{success}</p>}

          {renderField('Nome', 'nome', nome)}
          {renderField('Cognome', 'cognome', cognome)}
          {renderField('Email', 'email', email)}
          {renderField('Password', 'password', '', { isPassword: true })}
        </div>

        <button
          onClick={() => signOut()}
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', width: '100%', padding: '0.75rem', marginTop: '1rem', borderRadius: '0.75rem', border: `1.5px solid ${isGuest ? '#3498db' : '#e74c3c'}`, background: 'white', color: isGuest ? '#3498db' : '#e74c3c', fontWeight: '600', fontSize: '0.9rem', cursor: 'pointer' }}
        >
          {isGuest ? <><LogIn size={16} /> Login</> : <><LogOut size={16} /> Logout</>}
        </button>
      </div>

    </div>
  );
}
