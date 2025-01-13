import React, { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "../lib/supabase";
import {
  Home,
  Upload,
  User,
  LogOut,
  Music,
  Search as SearchIcon,
  Coins,
  MessageCircle,
} from "lucide-react";
import { NotificationBell } from "./NotificationBell";
import { getTokensRemaining } from "../lib/tokens";

export function Layout({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [currentUser, setCurrentUser] = useState<{
    id: string;
    username: string;
  } | null>(null);
  const [tokens, setTokens] = useState<number>(0);

  useEffect(() => {
    loadCurrentUser();
    loadTokens();
  }, []);

  const loadTokens = async () => {
    const tokens = await getTokensRemaining();
    setTokens(tokens);
  };

  const loadCurrentUser = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        navigate("/auth");
        return;
      }

      const { data: profile, error } = await supabase
        .from("profiles")
        .select("id, username")
        .eq("id", user.id)
        .single();

      if (error) {
        console.error("Error loading profile:", error);
        return;
      }

      if (profile?.username) {
        setCurrentUser({ id: profile.id, username: profile.username });
      }
    } catch (error) {
      console.error("Error loading user:", error);
    }
  };

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut();
      navigate("/auth");
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  const isActive = (path: string) => {
    if (path === "/profile" && location.pathname.startsWith("/profile/")) {
      return true;
    }
    return location.pathname === path;
  };

  const handleProfileClick = () => {
    if (currentUser?.username) {
      navigate(`/profile/${currentUser.username}`);
    } else {
      navigate("/profile");
    }
  };

  return (
    <div className='min-h-screen bg-gray-50'>
      <nav className='bg-white shadow-sm'>
        <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8'>
          <div className='flex justify-between h-16'>
            <div className='flex'>
              <div
                className='flex-shrink-0 flex items-center cursor-pointer'
                onClick={() => navigate("/")}
              >
                <Music className='h-8 w-8 text-indigo-600' />
                <span className='ml-2 text-xl font-bold text-gray-900'>
                  SoundShare
                </span>
              </div>
              <div className='hidden sm:ml-6 sm:flex sm:space-x-8'>
                <button
                  onClick={() => navigate("/")}
                  className={`inline-flex items-center px-1 pt-1 text-sm font-medium ${
                    isActive("/")
                      ? "text-indigo-600"
                      : "text-gray-900 hover:text-indigo-600"
                  }`}
                >
                  <Home className='h-5 w-5 mr-1' />
                  Home
                </button>
                <button
                  onClick={() => navigate("/search")}
                  className={`inline-flex items-center px-1 pt-1 text-sm font-medium ${
                    isActive("/search")
                      ? "text-indigo-600"
                      : "text-gray-900 hover:text-indigo-600"
                  }`}
                >
                  <SearchIcon className='h-5 w-5 mr-1' />
                  Search
                </button>
                <button
                  onClick={() => navigate("/upload")}
                  className={`inline-flex items-center px-1 pt-1 text-sm font-medium ${
                    isActive("/upload")
                      ? "text-indigo-600"
                      : "text-gray-900 hover:text-indigo-600"
                  }`}
                >
                  <Upload className='h-5 w-5 mr-1' />
                  Upload
                </button>
                <button
                  onClick={handleProfileClick}
                  className={`inline-flex items-center px-1 pt-1 text-sm font-medium ${
                    isActive("/profile")
                      ? "text-indigo-600"
                      : "text-gray-900 hover:text-indigo-600"
                  }`}
                >
                  <User className='h-5 w-5 mr-1' />
                  Profile
                </button>
              </div>
            </div>
            <div className='flex items-center space-x-4'>
              <a
                href='https://discord.gg/PUkcFrVk'
                target='_blank'
                rel='noopener noreferrer'
                className='flex items-center text-sm font-medium text-gray-700 hover:text-indigo-600 transition-colors'
              >
                <MessageCircle className='h-5 w-5 mr-1' />
                <span>Support</span>
              </a>
              <button
                onClick={() => navigate("/tokens")}
                className='flex items-center text-sm font-medium text-gray-700 hover:text-indigo-600'
              >
                <Coins className='h-4 w-4 mr-1 text-yellow-500' />
                <span>{tokens} tokens</span>
              </button>
              <NotificationBell />
              <button
                onClick={handleSignOut}
                className='inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700'
              >
                <LogOut className='h-4 w-4 mr-2' />
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className='max-w-7xl mx-auto py-6 sm:px-6 lg:px-8'>{children}</main>
    </div>
  );
}
