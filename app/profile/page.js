'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Crown, Calendar, Trophy, Target, TrendingUp, ArrowLeft } from 'lucide-react';
import { format } from 'date-fns';

function ProfilePage() {
  const { user, loading, logout } = useAuth();
  const router = useRouter();
  const [profile, setProfile] = useState(null);
  const [loadingProfile, setLoadingProfile] = useState(true);

  useEffect(() => {
    if (!user) {
      router.push('/');
      return;
    }

    fetchProfile();
  }, [user, router]);

  const fetchProfile = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/profile', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (res.ok) {
        const data = await res.json();
        setProfile(data);
      }
    } catch (error) {
      console.error('Failed to fetch profile:', error);
    } finally {
      setLoadingProfile(false);
    }
  };

  if (loading || loadingProfile) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center">
        <div className="animate-pulse text-white text-xl">Loading...</div>
      </div>
    );
  }

  if (!user || !profile) {
    return null;
  }

  const winRate = profile.gamesPlayed > 0 
    ? ((profile.wins / profile.gamesPlayed) * 100).toFixed(1) 
    : 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      <nav className="border-b border-slate-800 bg-slate-900/50 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Crown className="h-6 w-6 text-amber-500" />
            <span className="text-xl font-bold text-white">Chess Royale</span>
          </div>
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={() => router.push('/')} className="text-white">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Lobby
            </Button>
            <Button variant="outline" size="sm" onClick={logout} className="border-slate-700">
              Logout
            </Button>
          </div>
        </div>
      </nav>

      <main className="container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto space-y-8">
          {/* Profile Header */}
          <Card className="border-slate-800 bg-slate-900/80 backdrop-blur-sm overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-amber-500/10 to-purple-500/10" />
            <CardHeader className="relative z-10 text-center pb-4">
              <div className="flex justify-center mb-4">
                <div className="h-24 w-24 rounded-full bg-gradient-to-r from-amber-500 to-amber-600 flex items-center justify-center">
                  <Crown className="h-12 w-12 text-white" />
                </div>
              </div>
              <CardTitle className="text-4xl font-bold text-white mb-2">
                {profile.username}
              </CardTitle>
              <div className="flex items-center justify-center gap-2 text-slate-400">
                <Calendar className="h-4 w-4" />
                <span>Joined {format(new Date(profile.joinDate), 'MMM dd, yyyy')}</span>
              </div>
            </CardHeader>
          </Card>

          {/* Stats Grid */}
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="border-slate-800 bg-slate-900/80 backdrop-blur-sm">
              <CardContent className="p-6 text-center">
                <TrendingUp className="h-8 w-8 text-amber-500 mx-auto mb-2" />
                <p className="text-sm text-slate-400 mb-1">ELO Rating</p>
                <p className="text-3xl font-bold text-amber-500">{profile.rating}</p>
              </CardContent>
            </Card>

            <Card className="border-slate-800 bg-slate-900/80 backdrop-blur-sm">
              <CardContent className="p-6 text-center">
                <Target className="h-8 w-8 text-blue-500 mx-auto mb-2" />
                <p className="text-sm text-slate-400 mb-1">Games Played</p>
                <p className="text-3xl font-bold text-white">{profile.gamesPlayed}</p>
              </CardContent>
            </Card>

            <Card className="border-slate-800 bg-slate-900/80 backdrop-blur-sm">
              <CardContent className="p-6 text-center">
                <Trophy className="h-8 w-8 text-green-500 mx-auto mb-2" />
                <p className="text-sm text-slate-400 mb-1">Wins</p>
                <p className="text-3xl font-bold text-green-500">{profile.wins}</p>
              </CardContent>
            </Card>

            <Card className="border-slate-800 bg-slate-900/80 backdrop-blur-sm">
              <CardContent className="p-6 text-center">
                <div className="h-8 w-8 rounded-full bg-purple-500/20 flex items-center justify-center mx-auto mb-2">
                  <span className="text-purple-500 font-bold">%</span>
                </div>
                <p className="text-sm text-slate-400 mb-1">Win Rate</p>
                <p className="text-3xl font-bold text-purple-500">{winRate}%</p>
              </CardContent>
            </Card>
          </div>

          {/* Detailed Stats */}
          <div className="grid md:grid-cols-2 gap-6">
            <Card className="border-slate-800 bg-slate-900/80 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-white">Game Results</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-slate-800 rounded-lg">
                  <span className="text-slate-300">Wins</span>
                  <Badge className="bg-green-500">{profile.wins || 0}</Badge>
                </div>
                <div className="flex items-center justify-between p-4 bg-slate-800 rounded-lg">
                  <span className="text-slate-300">Losses</span>
                  <Badge variant="destructive">{profile.losses || 0}</Badge>
                </div>
                <div className="flex items-center justify-between p-4 bg-slate-800 rounded-lg">
                  <span className="text-slate-300">Draws</span>
                  <Badge variant="outline">{profile.draws || 0}</Badge>
                </div>
              </CardContent>
            </Card>

            <Card className="border-slate-800 bg-slate-900/80 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-white">Performance</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-slate-800 rounded-lg">
                  <span className="text-slate-300">Current Rating</span>
                  <Badge className="bg-amber-500">{profile.rating}</Badge>
                </div>
                <div className="flex items-center justify-between p-4 bg-slate-800 rounded-lg">
                  <span className="text-slate-300">Win Rate</span>
                  <Badge className="bg-purple-500">{winRate}%</Badge>
                </div>
                <div className="flex items-center justify-between p-4 bg-slate-800 rounded-lg">
                  <span className="text-slate-300">Total Games</span>
                  <Badge variant="outline">{profile.gamesPlayed}</Badge>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Quick Actions */}
          <Card className="border-slate-800 bg-slate-900/80 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-white">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-4">
              <Button
                variant="outline"
                className="border-slate-700"
                onClick={() => router.push('/history')}
              >
                View Game History
              </Button>
              <Button
                variant="outline"
                className="border-slate-700"
                onClick={() => router.push('/')}
              >
                Find New Match
              </Button>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}

export default function Page() {
  return (
    <AuthProvider>
      <ProfilePage />
    </AuthProvider>
  );
}