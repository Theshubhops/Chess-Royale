'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Trophy, Users, Swords, Crown, TrendingUp } from 'lucide-react';
import { toast } from 'sonner';
import { io } from 'socket.io-client';

function HomePage() {
  const { user, loading, login, register, logout } = useAuth();
  const [authMode, setAuthMode] = useState('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [searching, setSearching] = useState(false);
  const router = useRouter();
  const [socket, setSocket] = useState(null);

  useEffect(() => {
    if (user && !socket) {
      const newSocket = io('http://localhost:3001');
      setSocket(newSocket);

      newSocket.on('connect', () => {
        console.log('Connected to socket server');
      });

      newSocket.on('waiting', (data) => {
        toast.info(data.message);
      });

      newSocket.on('match-found', (data) => {
        console.log('Match found!', data);
        toast.success(`Match found! You're playing as ${data.color}`);
        setSearching(false);
        router.push(`/game/${data.gameId}?color=${data.color}`);
      });

      return () => {
        newSocket.disconnect();
      };
    }
  }, [user, router, socket]);

  const handleAuth = async (e) => {
    e.preventDefault();
    try {
      if (authMode === 'login') {
        await login(username, password);
        toast.success('Logged in successfully!');
      } else {
        await register(username, password);
        toast.success('Account created successfully!');
      }
    } catch (error) {
      toast.error(error.message);
    }
  };

  const handleFindMatch = () => {
    if (!socket) {
      toast.error('Not connected to game server');
      return;
    }

    setSearching(true);
    socket.emit('find-match', {
      userId: user.userId,
      username: user.username,
      rating: user.rating || 1200
    });
  };

  const handleCancelSearch = () => {
    if (socket) {
      socket.emit('cancel-match', { userId: user.userId });
    }
    setSearching(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center">
        <div className="animate-pulse text-white text-xl">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-[url('/grid.svg')] bg-center [mask-image:linear-gradient(180deg,white,rgba(255,255,255,0))]" />
        
        <Card className="w-full max-w-md relative z-10 border-slate-800 bg-slate-900/80 backdrop-blur-sm">
          <CardHeader className="space-y-1 text-center">
            <div className="flex justify-center mb-4">
              <Crown className="h-16 w-16 text-amber-500" />
            </div>
            <CardTitle className="text-3xl font-bold text-white">Chess Royale</CardTitle>
            <CardDescription className="text-slate-400">
              Master the board, dominate the competition
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs value={authMode} onValueChange={setAuthMode} className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-6">
                <TabsTrigger value="login">Login</TabsTrigger>
                <TabsTrigger value="register">Register</TabsTrigger>
              </TabsList>
              <TabsContent value="login">
                <form onSubmit={handleAuth} className="space-y-4">
                  <div className="space-y-2">
                    <Input
                      type="text"
                      placeholder="Username"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      className="bg-slate-800 border-slate-700 text-white"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Input
                      type="password"
                      placeholder="Password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="bg-slate-800 border-slate-700 text-white"
                      required
                    />
                  </div>
                  <Button type="submit" className="w-full bg-amber-600 hover:bg-amber-700">
                    Login
                  </Button>
                </form>
              </TabsContent>
              <TabsContent value="register">
                <form onSubmit={handleAuth} className="space-y-4">
                  <div className="space-y-2">
                    <Input
                      type="text"
                      placeholder="Username (3+ characters)"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      className="bg-slate-800 border-slate-700 text-white"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Input
                      type="password"
                      placeholder="Password (6+ characters)"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="bg-slate-800 border-slate-700 text-white"
                      required
                    />
                  </div>
                  <Button type="submit" className="w-full bg-amber-600 hover:bg-amber-700">
                    Create Account
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      <div className="absolute inset-0 bg-[url('/grid.svg')] bg-center [mask-image:linear-gradient(180deg,white,rgba(255,255,255,0))]" />
      
      <nav className="relative z-10 border-b border-slate-800 bg-slate-900/50 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Crown className="h-8 w-8 text-amber-500" />
            <span className="text-2xl font-bold text-white">Chess Royale</span>
          </div>
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2 text-white">
              <Trophy className="h-5 w-5 text-amber-500" />
              <span className="font-semibold">{user.rating || 1200}</span>
            </div>
            <span className="text-slate-400">{user.username}</span>
            <Button variant="outline" size="sm" onClick={logout} className="border-slate-700">
              Logout
            </Button>
          </div>
        </div>
      </nav>

      <main className="relative z-10 container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto space-y-8">
          <Card className="border-slate-800 bg-slate-900/80 backdrop-blur-sm overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-amber-500/10 to-purple-500/10" />
            <CardHeader className="relative z-10 text-center pb-4">
              <CardTitle className="text-4xl font-bold text-white mb-2">
                Ready for Battle?
              </CardTitle>
              <CardDescription className="text-slate-400 text-lg">
                Find an opponent and prove your chess mastery
              </CardDescription>
            </CardHeader>
            <CardContent className="relative z-10 flex flex-col items-center pb-8">
              {!searching ? (
                <Button
                  size="lg"
                  onClick={handleFindMatch}
                  className="bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-700 hover:to-amber-600 text-white font-bold px-12 py-6 text-xl shadow-lg shadow-amber-500/30"
                >
                  <Swords className="mr-3 h-6 w-6" />
                  Find Match
                </Button>
              ) : (
                <div className="text-center space-y-4">
                  <div className="flex items-center justify-center gap-3 text-white">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-amber-500" />
                    <span className="text-lg">Searching for opponent...</span>
                  </div>
                  <Button
                    variant="outline"
                    onClick={handleCancelSearch}
                    className="border-slate-700"
                  >
                    Cancel Search
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          <div className="grid md:grid-cols-3 gap-4">
            <Card className="border-slate-800 bg-slate-900/80 backdrop-blur-sm">
              <CardContent className="p-6 flex items-center justify-between">
                <div>
                  <p className="text-slate-400 text-sm">Games Played</p>
                  <p className="text-3xl font-bold text-white">{user.gamesPlayed || 0}</p>
                </div>
                <Users className="h-10 w-10 text-blue-500" />
              </CardContent>
            </Card>
            <Card className="border-slate-800 bg-slate-900/80 backdrop-blur-sm">
              <CardContent className="p-6 flex items-center justify-between">
                <div>
                  <p className="text-slate-400 text-sm">Wins</p>
                  <p className="text-3xl font-bold text-green-500">{user.wins || 0}</p>
                </div>
                <Trophy className="h-10 w-10 text-green-500" />
              </CardContent>
            </Card>
            <Card className="border-slate-800 bg-slate-900/80 backdrop-blur-sm">
              <CardContent className="p-6 flex items-center justify-between">
                <div>
                  <p className="text-slate-400 text-sm">ELO Rating</p>
                  <p className="text-3xl font-bold text-amber-500">{user.rating || 1200}</p>
                </div>
                <TrendingUp className="h-10 w-10 text-amber-500" />
              </CardContent>
            </Card>
          </div>

          <Card className="border-slate-800 bg-slate-900/80 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-white">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="grid md:grid-cols-2 gap-4">
              <Button
                variant="outline"
                className="border-slate-700 justify-start h-auto py-4"
                onClick={() => router.push('/history')}
              >
                <div className="text-left">
                  <div className="font-semibold">Game History</div>
                  <div className="text-sm text-slate-400">View past games and replays</div>
                </div>
              </Button>
              <Button
                variant="outline"
                className="border-slate-700 justify-start h-auto py-4"
                onClick={() => router.push('/profile')}
              >
                <div className="text-left">
                  <div className="font-semibold">Profile & Stats</div>
                  <div className="text-sm text-slate-400">Detailed statistics and achievements</div>
                </div>
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
      <HomePage />
    </AuthProvider>
  );
}