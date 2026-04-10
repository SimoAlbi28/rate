import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { LogOut, LogIn, Settings, History, User } from 'lucide-react';
import { useAuth } from '../AuthContext';

type Props = {
  onClose: () => void;
  variant?: 'full' | 'settings-only';
};

const ANIM_MS = 180;

export default function ProfileMenu({ onClose, variant = 'full' }: Props) {
  const navigate = useNavigate();
  const { isGuest, signOut } = useAuth();
  const [open, setOpen] = useState(false);
  const [closing, setClosing] = useState(false);
  const closeTimer = useRef<number | null>(null);

  // Trigger the open animation right after mount
  useEffect(() => {
    const id = window.requestAnimationFrame(() => setOpen(true));
    return () => window.cancelAnimationFrame(id);
  }, []);

  const startClose = () => {
    if (closing) return;
    setClosing(true);
    setOpen(false);
    closeTimer.current = window.setTimeout(() => onClose(), ANIM_MS);
  };

  // Close on scroll/resize so the menu doesn't drift away from the button
  useEffect(() => {
    const handler = () => startClose();
    window.addEventListener('scroll', handler, true);
    window.addEventListener('resize', handler);
    return () => {
      window.removeEventListener('scroll', handler, true);
      window.removeEventListener('resize', handler);
      if (closeTimer.current) window.clearTimeout(closeTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleNavigate = (to: string) => {
    if (closeTimer.current) window.clearTimeout(closeTimer.current);
    onClose();
    navigate(to);
  };

  const handleSignOut = () => {
    if (closeTimer.current) window.clearTimeout(closeTimer.current);
    onClose();
    signOut();
  };

  const menuStyle: React.CSSProperties = {
    position: 'fixed',
    top: '60px',
    right: '1rem',
    background: 'white',
    borderRadius: '0.75rem',
    boxShadow: '0 4px 20px rgba(0,0,0,0.18)',
    zIndex: 10000,
    width: '170px',
    overflow: 'hidden',
    transformOrigin: 'top right',
    transform: open ? 'scale(1)' : 'scale(0.2)',
    opacity: open ? 1 : 0,
    transition: `transform ${ANIM_MS}ms cubic-bezier(0.4, 0, 0.2, 1), opacity ${ANIM_MS}ms ease`,
  };

  return createPortal(
    <>
      <div
        style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'transparent' }}
        onClick={startClose}
        onTouchStart={startClose}
      />
      <div style={menuStyle}>
        {variant === 'settings-only' ? (
          <>
            <button
              onClick={() => handleNavigate('/cronologia')}
              style={{ width: '100%', padding: '0.7rem 1rem', border: 'none', background: 'none', textAlign: 'center', fontSize: '0.85rem', cursor: 'pointer', color: '#333', fontWeight: '500', borderBottom: '1px solid #eee' }}
            >
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}><History size={14} /> Cronologia</span>
            </button>
            <button
              onClick={() => handleNavigate('/impostazioni')}
              style={{ width: '100%', padding: '0.7rem 1rem', border: 'none', background: 'none', textAlign: 'center', fontSize: '0.85rem', cursor: 'pointer', color: '#333', fontWeight: '500' }}
            >
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}><Settings size={14} /> Impostazioni</span>
            </button>
          </>
        ) : (
          <>
            <button
              onClick={() => handleNavigate('/profilo')}
              style={{ width: '100%', padding: '0.7rem 1rem', border: 'none', background: 'none', textAlign: 'center', fontSize: '0.85rem', cursor: 'pointer', color: '#333', fontWeight: '500', borderBottom: '1px solid #eee' }}
            >
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}><User size={14} /> Profilo</span>
            </button>
            <button
              onClick={() => handleNavigate('/cronologia')}
              style={{ width: '100%', padding: '0.7rem 1rem', border: 'none', background: 'none', textAlign: 'center', fontSize: '0.85rem', cursor: 'pointer', color: '#333', fontWeight: '500', borderBottom: '1px solid #eee' }}
            >
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}><History size={14} /> Cronologia</span>
            </button>
            <button
              onClick={() => handleNavigate('/impostazioni')}
              style={{ width: '100%', padding: '0.7rem 1rem', border: 'none', background: 'none', textAlign: 'center', fontSize: '0.85rem', cursor: 'pointer', color: '#333', fontWeight: '500', borderBottom: '1px solid #eee' }}
            >
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}><Settings size={14} /> Impostazioni</span>
            </button>
            {isGuest ? (
              <button
                onClick={handleSignOut}
                style={{ width: '100%', padding: '0.7rem 1rem', border: 'none', background: 'none', textAlign: 'center', fontSize: '0.85rem', cursor: 'pointer', color: '#3498db', fontWeight: '600' }}
              >
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}><LogIn size={14} /> Login</span>
              </button>
            ) : (
              <button
                onClick={handleSignOut}
                style={{ width: '100%', padding: '0.7rem 1rem', border: 'none', background: 'none', textAlign: 'center', fontSize: '0.85rem', cursor: 'pointer', color: '#e74c3c', fontWeight: '600' }}
              >
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}><LogOut size={14} /> Logout</span>
              </button>
            )}
          </>
        )}
      </div>
    </>,
    document.body
  );
}
