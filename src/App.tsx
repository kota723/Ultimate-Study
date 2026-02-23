import { useEffect, useState } from 'react';
import { Home, Calendar as CalendarIcon, Clock, BarChart2, Users, Layout, Zap, ArrowRight, ShieldCheck, Globe } from 'lucide-react';
import { useAppContext } from './AppContext';
import DashboardScreen from './screens/DashboardScreen';
import CalendarScreen from './screens/CalendarScreen';
import TimerScreen from './screens/TimerScreen';
import StatsScreen from './screens/StatsScreen';
import SocialScreen from './screens/SocialScreen';
import clsx from 'clsx';
import NotificationHandler from './NotificationHandler';

const logoImg = '/logo.png';

function App() {
  const { activeTab, setActiveTab, followRequests, user, userProfile, signIn, sendFollowRequest, joinGroupById, getGroupInfo } = useAppContext();

  const [pendingJoinGroup, setPendingJoinGroup] = useState<{ id: string, name: string } | null>(null);
  const [pendingAddFriend, setPendingAddFriend] = useState<string | null>(null);

  useEffect(() => {
    if (user && userProfile) {
      const urlParams = new URLSearchParams(window.location.search);
      const addId = urlParams.get('add');
      const groupId = urlParams.get('group');

      if (addId && addId !== user.uid) {
        setTimeout(() => {
          setPendingAddFriend(addId);
          window.history.replaceState({}, document.title, window.location.pathname);
        }, 800);
      } else if (groupId) {
        setTimeout(async () => {
          const info = await getGroupInfo(groupId);
          if (info) {
            setPendingJoinGroup({ id: groupId, name: info.name });
          } else {
            alert('グループが見つかりませんでした。');
          }
          window.history.replaceState({}, document.title, window.location.pathname);
        }, 800);
      } else if (addId === user.uid) {
        window.history.replaceState({}, document.title, window.location.pathname);
      }
    }
  }, [user, userProfile]);

  if (!user) {
    return (
      <div className="login-screen-v2">
        <div className="login-bg-decoration">
          <div className="blob blob-1"></div>
          <div className="blob blob-2"></div>
        </div>

        <header className="login-header">
          <div className="logo-container">
            <img src={logoImg} alt="Logo" className="pulse-logo" />
            <div className="logo-text">
              <span className="brand-name">Ultimate</span>
              <span className="brand-sub">Study Sync</span>
            </div>
          </div>
        </header>

        <main className="login-content">
          <section className="hero-section">
            <h1 className="hero-title">限界を超えろ。<br /><span className="gradient-text">最高の学習体験</span>を。</h1>
            <p className="hero-subtitle">一人じゃないから続けられる。友達と競い、励まし合い、<br />目標への最短ルートを駆け抜けよう。</p>

            <div className="login-actions">
              <button onClick={signIn} className="google-login-btn">
                <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" />
                <span>Googleアカウントでログイン</span>
                <ArrowRight size={20} className="arrow-icon" />
              </button>
              <p className="login-disclaimer">※連携にはGoogleアカウントが必要です。</p>
            </div>
          </section>

          <section className="feature-grid">
            <div className="feature-card">
              <div className="icon-box purple"><Layout size={24} /></div>
              <h3>リアルタイム共有</h3>
              <p>勉強中のステータスが友達に即座に通知されます。</p>
            </div>
            <div className="feature-card">
              <div className="icon-box blue"><BarChart2 size={24} /></div>
              <h3>高度な分析</h3>
              <p>学習時間の推移や科目の偏りをAIが視覚化します。</p>
            </div>
            <div className="feature-card">
              <div className="icon-box gold"><Zap size={24} /></div>
              <h3>学校コード連携</h3>
              <p>学校独自の予定や課題をワンタップでインポート。</p>
            </div>
          </section>
        </main>

        <footer className="login-footer">
          <div className="footer-links">
            <span><ShieldCheck size={14} /> セキュリティ保護</span>
            <span><Globe size={14} /> クラウド同期</span>
          </div>
          <p>© 2026 Ultimate Study Sync Team.</p>
        </footer>

        <style>{`
            .login-screen-v2 {
                position: fixed;
                top: 0; left: 0; right: 0; bottom: 0;
                background-color: var(--bg-main);
                color: var(--text-main);
                font-family: 'Outfit', sans-serif;
                overflow-x: hidden;
                overflow-y: auto;
                -webkit-overflow-scrolling: touch;
                display: flex;
                flex-direction: column;
            }

            .login-bg-decoration {
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                pointer-events: none;
                z-index: 0;
            }

            .blob {
                position: absolute;
                border-radius: 50%;
                filter: blur(80px);
                opacity: 0.15;
                animation: float 20s infinite alternate;
            }

            .blob-1 {
                width: 400px;
                height: 400px;
                background: #4f46e5;
                top: -100px;
                right: -100px;
            }

            .blob-2 {
                width: 300px;
                height: 300px;
                background: #ec4899;
                bottom: -50px;
                left: -50px;
                animation-delay: -5s;
            }

            @keyframes float {
                from { transform: translate(0, 0) scale(1); }
                to { transform: translate(50px, 50px) scale(1.1); }
            }

            .login-header {
                padding: 40px;
                position: relative;
                z-index: 10;
            }

            .logo-container {
                display: flex;
                align-items: center;
                gap: 16px;
            }

            .pulse-logo {
                width: 56px;
                height: 56px;
                filter: drop-shadow(0 4px 10px rgba(79, 70, 229, 0.2));
                animation: pulse 2s infinite;
            }

            @keyframes pulse {
                0% { transform: scale(1); opacity: 1; }
                50% { transform: scale(1.05); opacity: 0.9; }
                100% { transform: scale(1); opacity: 1; }
            }

            .logo-text {
                display: flex;
                flex-direction: column;
            }

            .brand-name {
                font-size: clamp(1.5rem, 4vw, 2rem);
                font-weight: 900;
                letter-spacing: -0.5px;
                line-height: 1;
                color: var(--text-main);
            }

            .brand-sub {
                font-size: clamp(0.9rem, 2vw, 1.1rem);
                font-weight: 600;
                color: var(--text-muted);
            }

            .login-content {
                flex: 1;
                padding: 0 clamp(20px, 5vw, 40px);
                max-width: 1000px;
                margin: 0 auto;
                position: relative;
                z-index: 10;
                display: flex;
                flex-direction: column;
                justify-content: center;
            }

            .hero-section {
                margin-top: clamp(20px, 5vh, 60px);
                margin-bottom: clamp(30px, 5vh, 60px);
                text-align: center;
            }

            .hero-title {
                font-size: clamp(2.5rem, 6vw, 4.5rem);
                font-weight: 900;
                line-height: 1.1;
                margin-bottom: 24px;
                letter-spacing: -1.5px;
                color: var(--text-main);
            }

            .gradient-text {
                background: linear-gradient(135deg, #4f46e5 0%, #ec4899 100%);
                -webkit-background-clip: text;
                -webkit-text-fill-color: transparent;
            }

            .hero-subtitle {
                font-size: clamp(1rem, 2.5vw, 1.25rem);
                color: var(--text-muted);
                max-width: 650px;
                margin: 0 auto 40px auto;
                line-height: 1.6;
            }

            .google-login-btn {
                background: var(--text-main);
                color: var(--bg-main);
                border: none;
                padding: clamp(14px, 3vh, 18px) clamp(20px, 5vw, 32px);
                border-radius: 20px;
                font-size: clamp(0.95rem, 3vw, 1.1rem);
                font-weight: 800;
                display: flex;
                align-items: center;
                gap: clamp(8px, 2vw, 16px);
                cursor: pointer;
                transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
                box-shadow: 0 20px 40px rgba(15, 23, 42, 0.15);
                margin: 0 auto;
                white-space: nowrap;
                max-width: 100%;
            }

            .google-login-btn:hover {
                transform: translateY(-5px);
                box-shadow: 0 30px 60px rgba(15, 23, 42, 0.2);
                background: #1e293b;
            }

            .google-login-btn img {
                width: 24px;
                height: 24px;
                filter: brightness(0) invert(1);
            }

            .arrow-icon {
                transition: transform 0.3s ease;
            }

            .google-login-btn:hover .arrow-icon {
                transform: translateX(5px);
            }

            .login-disclaimer {
                margin-top: 16px;
                font-size: 0.8rem;
                color: #94a3b8;
            }

            .feature-grid {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
                gap: clamp(16px, 4vw, 24px);
                margin-top: 5vh;
                padding-bottom: 40px;
            }

            .feature-card {
                background: var(--bg-card);
                border: 1px solid var(--border-light);
                padding: 32px;
                border-radius: 32px;
                transition: all 0.3s ease;
                box-shadow: var(--shadow-sm);
            }

            .feature-card:hover {
                transform: translateY(-5px);
                box-shadow: var(--shadow-md);
                border-color: var(--primary-light);
            }

            .feature-card:hover .icon-box {
                transform: scale(1.1) rotate(5deg);
            }

            @media (max-width: 768px) {
                .login-header {
                    padding: 24px 20px;
                }
                .pulse-logo {
                    width: 40px; height: 40px;
                }
                .hero-section {
                    margin-top: 10px;
                    margin-bottom: 30px;
                }
                .hero-title {
                    font-size: 2.2rem;
                    margin-bottom: 16px;
                }
                .hero-subtitle {
                    font-size: 0.95rem;
                    margin-bottom: 24px;
                }
                .feature-grid {
                    grid-template-columns: 1fr;
                    gap: 12px;
                    margin-top: 10px;
                    padding-bottom: 80px; /* space for scrolling */
                }
                .feature-card {
                    padding: 16px;
                    display: flex;
                    align-items: center;
                    text-align: left;
                    gap: 16px;
                }
                .feature-card .icon-box {
                    margin-bottom: 0;
                    width: 40px;
                    height: 40px;
                    flex-shrink: 0;
                }
                .google-login-btn {
                    width: 100%;
                    justify-content: center;
                }
            }

            .icon-box {
                width: 48px;
                height: 48px;
                border-radius: 14px;
                display: flex;
                align-items: center;
                justify-content: center;
                margin-bottom: 20px;
            }

            .icon-box.purple { background: rgba(139, 92, 246, 0.2); color: #a78bfa; }
            .icon-box.blue { background: rgba(59, 130, 246, 0.2); color: #60a5fa; }
            .icon-box.gold { background: rgba(245, 158, 11, 0.2); color: #fbbf24; }

            .feature-card h3 {
                margin: 0 0 12px 0;
                font-size: 1.25rem;
                font-weight: 800;
            }

            .feature-card p {
                margin: 0;
                font-size: 0.9rem;
                color: #94a3b8;
                line-height: 1.5;
            }

            .login-footer {
                padding: 40px;
                text-align: center;
                border-top: 1px solid #f1f5f9;
                position: relative;
                z-index: 10;
            }

            .footer-links {
                display: flex;
                justify-content: center;
                gap: 24px;
                margin-bottom: 12px;
                color: #94a3b8;
                font-size: 0.85rem;
                font-weight: 600;
            }

            .footer-links span {
                display: flex;
                align-items: center;
                gap: 6px;
            }

            .login-footer p {
                margin: 0;
                font-size: 0.75rem;
                color: #cbd5e1;
            }

            @media (max-width: 640px) {
                .hero-title { font-size: 2.5rem; }
                .login-header { padding: 24px; }
                .login-content { padding: 0 24px; }
                .feature-grid { grid-template-columns: 1fr; }
            }
        `}</style>
      </div>
    );
  }

  const renderScreen = () => {
    switch (activeTab) {
      case 'home': return <DashboardScreen />;
      case 'calendar': return <CalendarScreen />;
      case 'timer': return <TimerScreen />;
      case 'stats': return <StatsScreen />;
      case 'social': return <SocialScreen />;
      default: return <DashboardScreen />;
    }
  };

  const tabs = [
    { id: 'home', icon: Home, label: 'ホーム' },
    { id: 'calendar', icon: CalendarIcon, label: '計画' },
    { id: 'timer', icon: Clock, label: '学習' },
    { id: 'stats', icon: BarChart2, label: '分析' },
    { id: 'social', icon: Users, label: 'SNS' },
  ];

  return (
    <div className="app-container">
      <div className="content-area">
        {renderScreen()}
      </div>
      <NotificationHandler />

      <nav className="bottom-nav">
        {tabs.map(tab => (
          <button
            key={tab.id}
            className={clsx('nav-item', activeTab === tab.id && 'active')}
            onClick={() => setActiveTab(tab.id)}
            style={{ position: 'relative' }}
          >
            <tab.icon size={24} />
            <span>{tab.label}</span>
            {tab.id === 'social' && followRequests.length > 0 && (
              <div style={{ position: 'absolute', top: '10px', right: '15px', background: 'var(--danger)', width: '8px', height: '8px', borderRadius: '50%', border: '1px solid white' }} />
            )}
          </button>
        ))}
      </nav>

      {/* Styled Modals for URL Invitations */}
      {(pendingJoinGroup || pendingAddFriend) && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '20px' }}>
          <div style={{ background: 'var(--bg-card)', padding: '30px 24px', borderRadius: '24px', width: '100%', maxWidth: '400px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)', textAlign: 'center', animation: 'scaleUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)' }}>

            {pendingJoinGroup && (
              <>
                <div style={{ width: '64px', height: '64px', background: 'linear-gradient(135deg, #4f46e5 0%, #ec4899 100%)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px auto', color: 'white' }}>
                  <Users size={32} />
                </div>
                <h3 style={{ fontSize: '1.4rem', fontWeight: 800, marginBottom: '10px', color: 'var(--text-main)' }}>グループ招待</h3>
                <p style={{ color: 'var(--text-muted)', marginBottom: '24px', lineHeight: 1.6 }}>「<span style={{ fontWeight: 800, color: 'var(--primary)' }}>{pendingJoinGroup.name}</span>」から招待が届いています。<br />グループに参加しますか？</p>
                <div style={{ display: 'flex', gap: '12px' }}>
                  <button onClick={() => setPendingJoinGroup(null)} style={{ flex: 1, padding: '14px', borderRadius: '14px', background: 'var(--bg-main)', border: '1px solid var(--border-light)', color: 'var(--text-muted)', fontWeight: 600, cursor: 'pointer' }}>キャンセル</button>
                  <button onClick={async () => {
                    await joinGroupById(pendingJoinGroup.id, true);
                    setPendingJoinGroup(null);
                    setActiveTab('social');
                    alert('グループに参加しました！');
                  }} style={{ flex: 1, padding: '14px', borderRadius: '14px', background: 'var(--primary)', color: 'white', border: 'none', fontWeight: 600, cursor: 'pointer', boxShadow: '0 10px 15px -3px rgba(79, 70, 229, 0.3)' }}>参加する</button>
                </div>
              </>
            )}

            {pendingAddFriend && (
              <>
                <div style={{ width: '64px', height: '64px', background: 'linear-gradient(135deg, #10b981 0%, #3b82f6 100%)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px auto', color: 'white' }}>
                  <Users size={32} />
                </div>
                <h3 style={{ fontSize: '1.4rem', fontWeight: 800, marginBottom: '10px', color: 'var(--text-main)' }}>友達追加の招待</h3>
                <p style={{ color: 'var(--text-muted)', marginBottom: '24px', lineHeight: 1.6 }}>友達追加機能のリンクを開きました。<br />フォローリクエストを送信しますか？</p>
                <div style={{ display: 'flex', gap: '12px' }}>
                  <button onClick={() => setPendingAddFriend(null)} style={{ flex: 1, padding: '14px', borderRadius: '14px', background: 'var(--bg-main)', border: '1px solid var(--border-light)', color: 'var(--text-muted)', fontWeight: 600, cursor: 'pointer' }}>キャンセル</button>
                  <button onClick={() => {
                    sendFollowRequest(pendingAddFriend);
                    setPendingAddFriend(null);
                    setActiveTab('social');
                    alert('友達リクエストを送信しました！SNSタブから確認できます。');
                  }} style={{ flex: 1, padding: '14px', borderRadius: '14px', background: 'var(--primary)', color: 'white', border: 'none', fontWeight: 600, cursor: 'pointer', boxShadow: '0 10px 15px -3px rgba(79, 70, 229, 0.3)' }}>リクエスト送信</button>
                </div>
              </>
            )}

          </div>
          <style>{`
            @keyframes scaleUp {
              from { opacity: 0; transform: scale(0.95) translateY(10px); }
              to { opacity: 1; transform: scale(1) translateY(0); }
            }
          `}</style>
        </div>
      )}
    </div>
  );
}

export default App;
