'use client';

import { useState, useEffect, use } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { Chessboard } from 'react-chessboard';
import { Chess } from 'chess.js';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Crown, Flag, Download, FileText, Video, VideoOff } from 'lucide-react';
import { toast } from 'sonner';
import { io } from 'socket.io-client';
import VideoChat from '@/components/VideoChat';

function GamePage({ params }) {
  const gameId = use(params).gameId;
  const searchParams = useSearchParams();
  const playerColor = searchParams.get('color');
  const { user } = useAuth();
  const router = useRouter();

  const [socket, setSocket] = useState(null);
  const [chess] = useState(new Chess());
  const [fen, setFen] = useState(chess.fen());
  const [moves, setMoves] = useState([]);
  const [gameStatus, setGameStatus] = useState('active');
  const [currentTurn, setCurrentTurn] = useState('white');
  const [opponent, setOpponent] = useState(null);
  const [showVideo, setShowVideo] = useState(false);
  const [liveKitToken, setLiveKitToken] = useState('');
  const [drawOffered, setDrawOffered] = useState(false);

  useEffect(() => {
    if (!user) {
      router.push('/');
      return;
    }

    const newSocket = io('http://localhost:3001');
    setSocket(newSocket);

    newSocket.on('connect', () => {
      console.log('Connected to game server');
      newSocket.emit('join-game', { gameId });
    });

    newSocket.on('move-made', (data) => {
      console.log('Move received:', data);
      chess.load(data.fen);
      setFen(data.fen);
      setMoves(chess.history({ verbose: true }));
      setCurrentTurn(data.currentTurn);
      setGameStatus(data.status);

      if (data.status !== 'active') {
        toast.success(`Game Over: ${data.winner === 'draw' ? 'Draw' : data.winner + ' wins!'}`);
      }
    });

    newSocket.on('game-ended', (data) => {
      setGameStatus(data.status);
      toast.info(data.message);
    });

    newSocket.on('draw-offered', (data) => {
      setDrawOffered(true);
      toast.info(`${data.playerColor} offered a draw`);
    });

    newSocket.on('error', (data) => {
      toast.error(data.message);
    });

    const fetchGameAndToken = async () => {
      try {
        const res = await fetch(`/api/games/${gameId}`);
        if (res.ok) {
          const data = await res.json();
          const game = data.game;
          if (game.fen) {
            chess.load(game.fen);
            setFen(game.fen);
          }
          if (game.moves) {
            setMoves(game.moves);
          }
          setGameStatus(game.status || 'active');
          
          if (game.whitePlayer && game.blackPlayer) {
            const opp = playerColor === 'white' ? game.blackPlayer : game.whitePlayer;
            setOpponent(opp);
          }

          // Only fetch token for room games, not random matches
          if (!game.pgn.includes('[Event "Rated match"]')) { 
            const tokenRes = await fetch('/api/livekit-token', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ room: gameId, username: user.username })
            });
            const tokenData = await tokenRes.json();
            setLiveKitToken(tokenData.token);
            setShowVideo(true);
          }
        }
      } catch (error) {
        console.error('Failed to fetch game state or token:', error);
      }
    };

    fetchGameAndToken();

    return () => {
      newSocket.disconnect();
    };
  }, [gameId, user, router]);

  const onDrop = (sourceSquare, targetSquare) => {
    if (gameStatus !== 'active') {
      toast.error('Game has ended');
      return false;
    }

    if (currentTurn !== playerColor) {
      toast.error('Not your turn');
      return false;
    }

    try {
      const move = chess.move({
        from: sourceSquare,
        to: targetSquare,
        promotion: 'q'
      });

      if (move === null) return false;

      setFen(chess.fen());
      setMoves(chess.history({ verbose: true }));

      if (socket) {
        socket.emit('make-move', {
          gameId,
          move: { from: sourceSquare, to: targetSquare, promotion: 'q' },
          userId: user.userId
        });
      }

      return true;
    } catch (error) {
      return false;
    }
  };

  const handleResign = () => {
    if (socket && gameStatus === 'active') {
      socket.emit('resign', { gameId, userId: user.userId });
      setGameStatus('resigned');
    }
  };

  const handleOfferDraw = () => {
    if (socket && gameStatus === 'active') {
      socket.emit('offer-draw', { gameId, userId: user.userId });
      toast.info('Draw offer sent');
    }
  };

  const handleAcceptDraw = () => {
    if (socket) {
      socket.emit('accept-draw', { gameId });
      setDrawOffered(false);
    }
  };

  const exportPGN = () => {
    const pgn = chess.pgn();
    const blob = new Blob([pgn], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `game-${gameId}.pgn`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('PGN downloaded');
  };

  const exportFEN = () => {
    const fenString = chess.fen();
    navigator.clipboard.writeText(fenString);
    toast.success('FEN copied to clipboard');
  };

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
            <Badge variant={gameStatus === 'active' ? 'default' : 'secondary'}>
              {gameStatus === 'active' ? 'Active' : gameStatus}
            </Badge>
            <Button variant="ghost" size="sm" onClick={() => router.push('/')} className="text-white">
              Back to Lobby
            </Button>
          </div>
        </div>
      </nav>

      <main className="container mx-auto px-4 py-6">
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Chess Board */}
          <div className="lg:col-span-2">
            <Card className="border-slate-800 bg-slate-900/80 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-white flex items-center justify-between">
                  <span>Playing as {playerColor}</span>
                  <Badge variant={currentTurn === playerColor ? 'default' : 'outline'}>
                    {currentTurn === playerColor ? 'Your Turn' : "Opponent's Turn"}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="aspect-square w-full max-w-2xl mx-auto">
                  <Chessboard
                    position={fen}
                    onPieceDrop={onDrop}
                    boardOrientation={playerColor}
                    customBoardStyle={{
                      borderRadius: '8px',
                      boxShadow: '0 5px 15px rgba(0, 0, 0, 0.5)'
                    }}
                    customDarkSquareStyle={{ backgroundColor: '#475569' }}
                    customLightSquareStyle={{ backgroundColor: '#cbd5e1' }}
                  />
                </div>

                {/* Game Controls */}
                <div className="mt-6 flex flex-wrap gap-3 justify-center">
                  <Button
                    variant="destructive"
                    onClick={handleResign}
                    disabled={gameStatus !== 'active'}
                  >
                    <Flag className="mr-2 h-4 w-4" />
                    Resign
                  </Button>
                  <Button
                    variant="outline"
                    onClick={handleOfferDraw}
                    disabled={gameStatus !== 'active'}
                  >
                    Draw Offer
                  </Button>
                  {drawOffered && (
                    <Button
                      variant="default"
                      onClick={handleAcceptDraw}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      Accept Draw
                    </Button>
                  )}
                  <Button variant="outline" onClick={exportPGN}>
                    <Download className="mr-2 h-4 w-4" />
                    Export PGN
                  </Button>
                  <Button variant="outline" onClick={exportFEN}>
                    <FileText className="mr-2 h-4 w-4" />
                    Copy FEN
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Player Info */}
            <Card className="border-slate-800 bg-slate-900/80 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-white text-sm">Players</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-slate-800 rounded-lg">
                  <span className="text-white font-semibold">{user.username}</span>
                  <Badge>{playerColor}</Badge>
                </div>
                {opponent && (
                  <div className="flex items-center justify-between p-3 bg-slate-800 rounded-lg">
                    <span className="text-white font-semibold">{opponent.username}</span>
                    <Badge>{playerColor === 'white' ? 'black' : 'white'}</Badge>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Video Chat */}
            {liveKitToken && (
              <Card className="border-slate-800 bg-slate-900/80 backdrop-blur-sm">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-white text-sm">Video Chat</CardTitle>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowVideo(!showVideo)}
                    >
                      {showVideo ? <Video className="h-4 w-4" /> : <VideoOff className="h-4 w-4" />}
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {showVideo ? (
                    <div className="h-64 rounded-lg overflow-hidden">
                      <VideoChat token={liveKitToken} roomName={gameId} />
                    </div>
                  ) : (
                    <div className="h-64 flex items-center justify-center bg-slate-800 rounded-lg">
                      <span className="text-slate-400">Video chat hidden</span>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Move History */}
            <Card className="border-slate-800 bg-slate-900/80 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-white text-sm">Move History</CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-64">
                  <div className="space-y-1">
                    {moves.map((move, index) => (
                      <div key={index} className="flex items-center gap-2 text-sm text-slate-300">
                        <span className="text-slate-500 w-8">{Math.floor(index / 2) + 1}.</span>
                        <span>{move.san}</span>
                      </div>
                    ))}
                    {moves.length === 0 && (
                      <p className="text-slate-500 text-sm">No moves yet</p>
                    )}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}

export default function Page({ params }) {
  return (
    <AuthProvider>
      <GamePage params={params} />
    </AuthProvider>
  );
}
