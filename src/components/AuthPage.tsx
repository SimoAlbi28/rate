import { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../AuthContext';

export default function AuthPage() {
  const { signIn, signUp, continueAsGuest } = useAuth();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [nome, setNome] = useState('');
  const [cognome, setCognome] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    setError('');
    setSuccess('');

    if (mode === 'register' && (!nome.trim() || !cognome.trim())) {
      setError('Inserisci nome e cognome');
      return;
    }

    if (!email.trim() || !password.trim()) {
      setError('Inserisci email e password');
      return;
    }

    if (mode === 'register' && password !== confirmPassword) {
      setError('Le password non coincidono');
      return;
    }

    if (password.length < 6) {
      setError('La password deve avere almeno 6 caratteri');
      return;
    }

    setLoading(true);

    if (mode === 'login') {
      const { error } = await signIn(email, password);
      if (error) {
        setError(error === 'Invalid login credentials' ? 'Credenziali non valide' : error);
      } else {
        localStorage.setItem('profile-pwd-hint', password);
      }
    } else {
      const { error } = await signUp(email, password, nome.trim(), cognome.trim());
      if (error) {
        setError(error);
      } else {
        localStorage.setItem('rate-first-login', 'true');
        setSuccess('Registrazione avvenuta con successo');
        setLoading(false);
        setTimeout(() => {
          setMode('login');
          // Keep email and password prefilled so user only has to click "Accedi"
          setNome('');
          setCognome('');
          setConfirmPassword('');
          setSuccess('');
        }, 2000);
        return;
      }
    }

    setLoading(false);
  };

  return (
    <div className="page">
      <div className="home-sticky-top">
        <nav className="navbar">
          <div className="navbar-left">
            <img src="/rate-logo.png" alt="Logo" className="navbar-logo-img" />
          </div>
          <div className="navbar-center">
            <h1>RATE & PAGAMENTI</h1>
            <p className="navbar-tagline">TUTTO QUELLO CHE DEVI PAGARE, QUI.</p>
          </div>
          <div className="navbar-profile" style={{ background: '#3498db', opacity: 0.3, pointerEvents: 'none' }}>
            <span>👤</span>
          </div>
        </nav>
      </div>

      <div className="content">
        <div className="card section-card" style={{ maxWidth: 400, margin: '0 auto' }}>
          <h3 className="section-heading" style={{ textAlign: 'center', marginBottom: '0.5rem', fontSize: '1.1rem' }}>
            {mode === 'login' ? 'Accedi' : 'Registrati'}
          </h3>
          <hr className="card-separator" />

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '0.75rem' }}>
            {mode === 'register' && (
              <div style={{ display: 'flex', gap: '0.5rem', minWidth: 0 }}>
                <input
                  type="text"
                  placeholder="Nome"
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  style={{ flex: 1, minWidth: 0, padding: '0.6rem 0.8rem', borderRadius: '0.5rem', border: '1.5px solid #ccc', fontSize: '0.9rem', outline: 'none', boxSizing: 'border-box' }}
                />
                <input
                  type="text"
                  placeholder="Cognome"
                  value={cognome}
                  onChange={(e) => setCognome(e.target.value)}
                  style={{ flex: 1, minWidth: 0, padding: '0.6rem 0.8rem', borderRadius: '0.5rem', border: '1.5px solid #ccc', fontSize: '0.9rem', outline: 'none', boxSizing: 'border-box' }}
                />
              </div>
            )}
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={{ padding: '0.6rem 0.8rem', borderRadius: '0.5rem', border: '1.5px solid #ccc', fontSize: '0.9rem', outline: 'none' }}
              onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
            />
            <div style={{ position: 'relative' }}>
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={{ width: '100%', padding: '0.6rem 2.4rem 0.6rem 0.8rem', borderRadius: '0.5rem', border: '1.5px solid #ccc', fontSize: '0.9rem', outline: 'none', boxSizing: 'border-box' }}
                onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{ position: 'absolute', right: '0.6rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', padding: '0.2rem', display: 'flex', alignItems: 'center', color: '#888' }}
                title={showPassword ? 'Nascondi password' : 'Mostra password'}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            {mode === 'register' && (
              <div style={{ position: 'relative' }}>
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  placeholder="Conferma password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  style={{ width: '100%', padding: '0.6rem 2.4rem 0.6rem 0.8rem', borderRadius: '0.5rem', border: '1.5px solid #ccc', fontSize: '0.9rem', outline: 'none', boxSizing: 'border-box' }}
                  onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  style={{ position: 'absolute', right: '0.6rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', padding: '0.2rem', display: 'flex', alignItems: 'center', color: '#888' }}
                  title={showConfirmPassword ? 'Nascondi password' : 'Mostra password'}
                >
                  {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            )}

            {error && <p style={{ color: '#e74c3c', fontSize: '0.8rem', textAlign: 'center', margin: 0 }}>{error}</p>}

            <button
              onClick={handleSubmit}
              disabled={loading}
              style={{
                padding: '0.7rem',
                borderRadius: '0.5rem',
                border: 'none',
                background: '#27ae60',
                color: 'white',
                fontWeight: 'bold',
                fontSize: '0.9rem',
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.6 : 1,
              }}
            >
              {loading ? '...' : mode === 'login' ? 'Accedi' : 'Registrati'}
            </button>

            <hr className="card-separator" />

            <button
              onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError(''); setSuccess(''); }}
              style={{
                padding: '0.6rem',
                borderRadius: '0.5rem',
                border: '1.5px solid #3498db',
                background: 'white',
                color: '#3498db',
                fontWeight: 'bold',
                fontSize: '0.85rem',
                cursor: 'pointer',
              }}
            >
              {mode === 'login' ? 'Non hai un account? Registrati' : 'Hai già un account? Accedi'}
            </button>

            <button
              onClick={continueAsGuest}
              style={{
                padding: '0.6rem',
                borderRadius: '0.5rem',
                border: '1.5px solid #999',
                background: 'white',
                color: '#666',
                fontSize: '0.8rem',
                cursor: 'pointer',
              }}
            >
              Continua senza account
            </button>
            <p style={{ color: '#999', fontSize: '0.65rem', textAlign: 'center', margin: '-0.25rem 0 0' }}>
              I dati verranno salvati solo su questo dispositivo
            </p>
          </div>
        </div>
        {success && (
          <p style={{ color: '#27ae60', fontSize: '0.9rem', fontWeight: 700, textAlign: 'center', margin: '1rem auto 0', maxWidth: 400 }}>
            {success}
          </p>
        )}
      </div>
    </div>
  );
}
