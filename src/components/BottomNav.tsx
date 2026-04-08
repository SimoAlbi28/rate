import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Home } from 'lucide-react';
import { AppsListDetail24Regular } from '@fluentui/react-icons';

interface Props {
  profileIcon: string;
  profileColor: string;
}

export default function BottomNav({ profileIcon, profileColor }: Props) {
  const navigate = useNavigate();
  const location = useLocation();
  const [activeTab, setActiveTab] = useState<'riepilogo' | 'home' | 'profilo'>(() => {
    if (location.pathname === '/riepilogo') return 'riepilogo';
    if (location.pathname === '/profilo') return 'profilo';
    return 'home';
  });

  useEffect(() => {
    if (location.pathname === '/riepilogo') {
      setActiveTab('riepilogo');
    } else if (location.pathname === '/profilo') {
      setActiveTab('profilo');
    } else {
      setActiveTab('home');
    }
  }, [location.pathname]);

  const leftPos = activeTab === 'riepilogo' ? '0%' : activeTab === 'home' ? '33.33%' : '66.66%';

  return (
    <div className="bottom-nav">
      <div className="bottom-nav-highlight" style={{ left: leftPos }} />
      <button
        className={`bottom-nav-btn ${activeTab === 'riepilogo' ? 'active' : ''}`}
        onClick={() => navigate('/riepilogo')}
      >
        <div className="bottom-nav-icon" style={{ position: 'relative' }}>
          <AppsListDetail24Regular style={{ fontSize: 22, color: activeTab === 'riepilogo' ? '#2ecc71' : '#999', position: 'absolute', clipPath: 'inset(0 0 50% 0)' }} />
          <AppsListDetail24Regular style={{ fontSize: 22, color: activeTab === 'riepilogo' ? '#e74c3c' : '#999', position: 'absolute', clipPath: 'inset(50% 0 0 0)' }} />
        </div>
        <span>Panoramica</span>
      </button>
      <button
        className={`bottom-nav-btn ${activeTab === 'home' ? 'active' : ''}`}
        onClick={() => navigate('/')}
      >
        <div className="bottom-nav-icon">
          <Home size={22} />
        </div>
        <span>Home</span>
      </button>
      <button
        className={`bottom-nav-btn ${activeTab === 'profilo' ? 'active' : ''}`}
        onClick={() => navigate('/profilo')}
      >
        <div className="bottom-nav-icon">
          <div className="bottom-nav-profile" style={{ background: activeTab === 'profilo' ? profileColor : '#ccc' }}>
            <span style={{ fontSize: '0.75rem' }}>{profileIcon}</span>
          </div>
        </div>
        <span>Profilo</span>
      </button>
    </div>
  );
}
