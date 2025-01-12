import React, { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { supabase } from './lib/supabase';
import { AuthForm } from './components/AuthForm';
import { Home } from './pages/Home';
import { Upload } from './pages/Upload';
import { Profile } from './pages/Profile';
import { SoundDetails } from './pages/SoundDetails';
import { Feed } from './pages/Feed';
import { Search } from './pages/Search';
import { Notifications } from './pages/Notifications';
import { TokenPurchase } from './pages/TokenPurchase';

function App() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) {
        loadCurrentUser(session.user.id);
      }
      setLoading(false);
    });

    supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) {
        loadCurrentUser(session.user.id);
      } else {
        setCurrentUser(null);
      }
    });
  }, []);

  const loadCurrentUser = async (userId: string) => {
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (profile) {
        setCurrentUser(profile);
      }
    } catch (error) {
      console.error('Error loading user profile:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600" />
      </div>
    );
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/auth"
          element={session ? <Navigate to="/" /> : <AuthForm />}
        />
        <Route
          path="/"
          element={session ? <Home /> : <Navigate to="/auth" />}
        />
        <Route
          path="/feed"
          element={session ? <Feed /> : <Navigate to="/auth" />}
        />
        <Route
          path="/search"
          element={session ? <Search /> : <Navigate to="/auth" />}
        />
        <Route
          path="/notifications"
          element={session ? <Notifications /> : <Navigate to="/auth" />}
        />
        <Route
          path="/tokens"
          element={session ? <TokenPurchase /> : <Navigate to="/auth" />}
        />
        <Route
          path="/upload"
          element={session ? <Upload /> : <Navigate to="/auth" />}
        />
        <Route
          path="/profile"
          element={
            session
              ? currentUser
                ? <Navigate to={`/profile/${currentUser.username}`} />
                : <div className="min-h-screen flex items-center justify-center">
                    <div className="text-center">
                      <p className="text-gray-600">Loading profile...</p>
                    </div>
                  </div>
              : <Navigate to="/auth" />
          }
        />
        <Route
          path="/profile/:username"
          element={session ? <Profile /> : <Navigate to="/auth" />}
        />
        <Route
          path="/sound/:id"
          element={session ? <SoundDetails /> : <Navigate to="/auth" />}
        />
      </Routes>
    </BrowserRouter>
  );
}

export default App;