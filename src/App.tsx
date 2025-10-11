import { useEffect } from 'react';
import { RouterProvider } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import { router } from './routes/router';

function App() {
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading && !user && !window.location.pathname.startsWith('/avatar/') && window.location.pathname !== '/auth') {
      window.location.href = '/auth';
    }
  }, [user, loading]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-600">Loading...</div>
      </div>
    );
  }

  return <RouterProvider router={router} />;
}

export default App;
