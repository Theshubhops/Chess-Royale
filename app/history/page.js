'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Crown, ArrowLeft, Calendar, Trophy, Upload, FileText } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

function HistoryPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [games, setGames] = useState([]);
  const [loadingGames, setLoadingGames] = useState(true);
  const [showImport, setShowImport] = useState(false);
  const [pgnText, setPgnText] = useState('');

  useEffect(() => {
    if (!user) {
      router.push('/');
      return;
    }

    fetchGames();
  }, [user, router]);

  const fetchGames = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/games/history', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (res.ok) {
        const data = await res.json();
        setGames(data.games || []);
      }
    } catch (error) {
      console.error('Failed to fetch games:', error);
    } finally {
      setLoadingGames(false);
    }
  };

  const handleImportPGN = async () => {
    if (!pgnText.trim()) {
      toast.error('Please enter a PGN string');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/games/import-pgn', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ pgn: pgnText })
      });

      if (res.ok) {
        toast.success('Game imported successfully!');
        setPgnText('');
        setShowImport(false);
        fetchGames();
      } else {
        const error = await res.json();
        toast.error(error.error || 'Failed to import PGN');
      }
    } catch (error) {
      toast.error('Failed to import game');
    }
  };

  const getResultBadge = (game) => {
    if (!game.result) return <Badge variant="outline">Unknown</Badge>;
    if (game.result === 'draw') return <Badge variant="outline">Draw</Badge>;
    
    const isWhite = game.whitePlayer.userId === user.userId;
    const won = (isWhite && game.result === 'white') || (!isWhite && game.result === 'black');
    
    return won ? 
      <Badge className="bg-green-500">Win</Badge> : 
      <Badge variant="destructive">Loss</Badge>;
  };

  if (loading || loadingGames) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center">
        <div className="animate-pulse text-white text-xl">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

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
          </div>
        </div>
      </nav>

      <main className="container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-bold text-white">Game History</h1>
            <Button
              variant="outline"
              className="border-slate-700"
              onClick={() => setShowImport(!showImport)}
            >
              <Upload className="mr-2 h-4 w-4" />
              Import PGN
            </Button>
          </div>

          {showImport && (
            <Card className="border-slate-800 bg-slate-900/80 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-white">Import PGN Game</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Textarea
                  placeholder="Paste PGN notation here..."
                  value={pgnText}
                  onChange={(e) => setPgnText(e.target.value)}
                  className="bg-slate-800 border-slate-700 text-white min-h-32"
                />
                <div className="flex gap-2">
                  <Button onClick={handleImportPGN}>
                    <FileText className="mr-2 h-4 w-4" />
                    Import Game
                  </Button>
                  <Button variant="outline" onClick={() => setShowImport(false)}>
                    Cancel
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          <Card className="border-slate-800 bg-slate-900/80 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-white">
                Your Games ({games.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[600px] pr-4">
                <div className="space-y-4">
                  {games.length === 0 ? (
                    <div className="text-center py-12 text-slate-400">
                      <Trophy className="h-16 w-16 mx-auto mb-4 opacity-50" />
                      <p className="text-lg">No games played yet</p>
                      <p className="text-sm">Start playing to build your history!</p>
                    </div>
                  ) : (
                    games.map((game) => (
                      <Card key={game.gameId} className="border-slate-700 bg-slate-800/50 hover:bg-slate-800 transition-colors">
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-3 mb-2">
                                <div className="text-white font-semibold">
                                  {game.whitePlayer.username}
                                  <Badge variant="outline" className="ml-2">White</Badge>
                                </div>
                                <span className="text-slate-500">vs</span>
                                <div className="text-white font-semibold">
                                  {game.blackPlayer.username}
                                  <Badge variant="outline" className="ml-2">Black</Badge>
                                </div>
                              </div>
                              <div className="flex items-center gap-4 text-sm text-slate-400">
                                <span className="flex items-center gap-1">
                                  <Calendar className="h-4 w-4" />
                                  {format(new Date(game.startTime), 'MMM dd, yyyy HH:mm')}
                                </span>
                                {game.imported && (
                                  <Badge variant="outline" className="text-xs">Imported</Badge>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-4">
                              {getResultBadge(game)}
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => router.push(`/game/${game.gameId}`)}
                                className="border-slate-700"
                              >
                                View
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))
                  )}
                </div>
              </ScrollArea>
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
      <HistoryPage />
    </AuthProvider>
  );
}