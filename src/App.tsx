import { useState } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import AuthPage from './pages/AuthPage';
import Layout from './components/Layout';
import FeedPage from './pages/FeedPage';
import NetworkPage from './pages/NetworkPage';
import MessagesPage from './pages/MessagesPage';
import ProfilePage from './pages/ProfilePage';

type Page = 'feed' | 'network' | 'messages' | 'profile';

function AppInner() {
  const { user, profile, loading } = useAuth();
  const [page, setPage] = useState<Page>('feed');
  const [viewingUserId, setViewingUserId] = useState<string | null>(null);
  const [messageUserId, setMessageUserId] = useState<string | null>(null);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 bg-blue-500 rounded-xl flex items-center justify-center">
            <span className="text-white font-black text-xl">T1</span>
          </div>
          <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  if (!user || !profile) {
    return <AuthPage />;
  }

  function navigate(p: Page) {
    setPage(p);
    if (p !== 'profile') setViewingUserId(null);
    if (p !== 'messages') {
      setMessageUserId(null);
    }
  }

  function handleViewProfile(userId: string) {
    setViewingUserId(userId);
    setPage('profile');
  }

  function handleMessage(userId: string) {
    setMessageUserId(userId);
    setPage('messages');
  }

  return (
    <Layout currentPage={page} onNavigate={navigate}>
      {page === 'feed' && (
        <FeedPage onViewProfile={handleViewProfile} />
      )}
      {page === 'network' && (
        <NetworkPage onViewProfile={handleViewProfile} onMessage={handleMessage} />
      )}
      {page === 'messages' && (
        <MessagesPage
          initialUserId={messageUserId}
          onClearInitial={() => setMessageUserId(null)}
        />
      )}
      {page === 'profile' && (
        <ProfilePage
          userId={viewingUserId || user.id}
          onMessage={handleMessage}
        />
      )}
    </Layout>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppInner />
    </AuthProvider>
  );
}
