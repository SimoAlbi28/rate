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
  const getTab = (path: string): 'riepilogo' | 'home' | 'profilo' | null => {
    if (path === '/riepilogo') return 'riepilogo';
    if (path === '/profilo') return 'profilo';
    if (path === '/') return 'home';
    return null;
  };

  const [activeTab, setActiveTab] = useState<'riepilogo' | 'home' | 'profilo' | null>(() => getTab(location.pathname));
  const [prevTab, setPrevTab] = useState<'riepilogo' | 'home' | 'profilo' | null>(activeTab);
  const [skipTransition, setSkipTransition] = useState(false);

  useEffect(() => {
    const newTab = getTab(location.pathname);
    const wasNull = activeTab === null;
    setPrevTab(activeTab);
    if (wasNull && newTab !== null) {
      setSkipTransition(true);
      setActiveTab(newTab);
      requestAnimationFrame(() => {
        requestAnimationFrame(() => setSkipTransition(false));
      });
    } else {
      setActiveTab(newTab);
    }
  }, [location.pathname]);

  const getLeft = (tab: 'riepilogo' | 'home' | 'profilo' | null) => {
    if (tab === 'riepilogo') return '0%';
    if (tab === 'home') return '33.33%';
    if (tab === 'profilo') return '66.66%';
    return '33.33%';
  };

  return (
    <div className="bottom-nav">
      <div className="bottom-nav-highlight" style={{
        left: getLeft(activeTab),
        opacity: activeTab ? 1 : 0,
        transform: activeTab ? 'scaleY(1)' : 'scaleY(0)',
        transition: skipTransition ? 'opacity 0.3s ease, transform 0.3s ease' : undefined,
      }} />
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
