// Socket.io server for chess game
const { createServer } = require('http');
const { Server } = require('socket.io');
const { Chess } = require('chess.js');
const { MongoClient } = require('mongodb');

const httpServer = createServer();
const io = new Server(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

// MongoDB connection
let db;
const mongoUrl = process.env.MONGO_URL || 'mongodb://localhost:27017';
const dbName = process.env.DB_NAME || 'chess_royale';

async function connectDB() {
  const client = new MongoClient(mongoUrl);
  await client.connect();
  db = client.db(dbName);
  console.log('Socket.io server connected to MongoDB');
}

// Game state
const games = new Map();
const waitingPlayers = [];

io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  socket.on('find-match', async ({ userId, username, rating }) => {
    console.log('Player looking for match:', username);
    
    const existingIndex = waitingPlayers.findIndex(p => p.userId === userId);
    if (existingIndex !== -1) {
      waitingPlayers.splice(existingIndex, 1);
    }

    if (waitingPlayers.length > 0) {
      const opponent = waitingPlayers.shift();
      const gameId = require('crypto').randomUUID();
      
      const whitePlayer = Math.random() < 0.5 ? 
        { userId, username, rating, socketId: socket.id } : 
        opponent;
      const blackPlayer = whitePlayer.userId === userId ? 
        opponent : 
        { userId, username, rating, socketId: socket.id };

      const chess = new Chess();
      games.set(gameId, {
        gameId,
        chess,
        white: whitePlayer,
        black: blackPlayer,
        fen: chess.fen(),
        pgn: '',
        status: 'active',
        currentTurn: 'white',
        startTime: new Date(),
        moves: []
      });

      if (db) {
        await db.collection('games').insertOne({
          gameId,
          whitePlayer: { userId: whitePlayer.userId, username: whitePlayer.username, rating: whitePlayer.rating },
          blackPlayer: { userId: blackPlayer.userId, username: blackPlayer.username, rating: blackPlayer.rating },
          fen: chess.fen(),
          pgn: '',
          moves: [],
          status: 'active',
          result: null,
          startTime: new Date(),
          endTime: null
        });
      }

      socket.emit('match-found', {
        gameId,
        color: whitePlayer.userId === userId ? 'white' : 'black',
        opponent: whitePlayer.userId === userId ? blackPlayer : whitePlayer,
        fen: chess.fen()
      });

      io.to(opponent.socketId).emit('match-found', {
        gameId,
        color: whitePlayer.userId === opponent.userId ? 'white' : 'black',
        opponent: whitePlayer.userId === opponent.userId ? blackPlayer : whitePlayer,
        fen: chess.fen()
      });
    } else {
      waitingPlayers.push({ userId, username, rating, socketId: socket.id });
      socket.emit('waiting', { message: 'Looking for opponent...' });
    }
  });

  socket.on('cancel-match', ({ userId }) => {
    const index = waitingPlayers.findIndex(p => p.userId === userId);
    if (index !== -1) {
      waitingPlayers.splice(index, 1);
    }
  });

  socket.on('join-game', ({ gameId }) => {
    socket.join(gameId);
    console.log(`Socket ${socket.id} joined game ${gameId}`);
  });

  socket.on('make-move', async ({ gameId, move, userId }) => {
    const game = games.get(gameId);
    if (!game) {
      socket.emit('error', { message: 'Game not found' });
      return;
    }

    const playerColor = game.white.userId === userId ? 'white' : 'black';
    if (game.currentTurn !== playerColor) {
      socket.emit('error', { message: 'Not your turn' });
      return;
    }

    try {
      const result = game.chess.move(move);
      if (!result) {
        socket.emit('error', { message: 'Invalid move' });
        return;
      }

      game.fen = game.chess.fen();
      game.pgn = game.chess.pgn();
      game.currentTurn = game.chess.turn() === 'w' ? 'white' : 'black';
      game.moves.push(result);

      let gameStatus = 'active';
      let winner = null;
      
      if (game.chess.isCheckmate()) {
        gameStatus = 'checkmate';
        winner = playerColor;
      } else if (game.chess.isDraw() || game.chess.isStalemate() || game.chess.isThreefoldRepetition()) {
        gameStatus = 'draw';
      }

      game.status = gameStatus;

      if (db) {
        await db.collection('games').updateOne(
          { gameId },
          {
            $set: {
              fen: game.fen,
              pgn: game.pgn,
              status: gameStatus,
              result: winner,
              endTime: gameStatus !== 'active' ? new Date() : null
            },
            $push: { moves: result }
          }
        );

        if (gameStatus !== 'active') {
          const whiteRating = game.white.rating;
          const blackRating = game.black.rating;
          const resultStr = winner || 'draw';
          
          // Simple ELO calculation
          const K = 32;
          const expectedWhite = 1 / (1 + Math.pow(10, (blackRating - whiteRating) / 400));
          const expectedBlack = 1 - expectedWhite;
          
          const actualWhite = winner === 'white' ? 1 : (winner === 'draw' ? 0.5 : 0);
          const actualBlack = winner === 'black' ? 1 : (winner === 'draw' ? 0.5 : 0);
          
          const newWhiteRating = Math.round(whiteRating + K * (actualWhite - expectedWhite));
          const newBlackRating = Math.round(blackRating + K * (actualBlack - expectedBlack));

          await db.collection('users').updateOne(
            { userId: game.white.userId },
            {
              $set: { rating: newWhiteRating },
              $inc: { gamesPlayed: 1, ...(winner === 'white' && { wins: 1 }), ...(winner === 'draw' && { draws: 1 }), ...(winner === 'black' && { losses: 1 }) }
            }
          );

          await db.collection('users').updateOne(
            { userId: game.black.userId },
            {
              $set: { rating: newBlackRating },
              $inc: { gamesPlayed: 1, ...(winner === 'black' && { wins: 1 }), ...(winner === 'draw' && { draws: 1 }), ...(winner === 'white' && { losses: 1 }) }
            }
          );
        }
      }

      io.to(gameId).emit('move-made', {
        move: result,
        fen: game.fen,
        pgn: game.pgn,
        currentTurn: game.currentTurn,
        status: gameStatus,
        winner
      });

    } catch (error) {
      console.error('Error making move:', error);
      socket.emit('error', { message: 'Failed to make move' });
    }
  });

  socket.on('resign', async ({ gameId, userId }) => {
    const game = games.get(gameId);
    if (!game) return;

    const playerColor = game.white.userId === userId ? 'white' : 'black';
    const winner = playerColor === 'white' ? 'black' : 'white';

    game.status = 'resigned';

    if (db) {
      await db.collection('games').updateOne(
        { gameId },
        {
          $set: {
            status: 'resigned',
            result: winner,
            endTime: new Date()
          }
        }
      );

      const whiteRating = game.white.rating;
      const blackRating = game.black.rating;
      const K = 32;
      const expectedWhite = 1 / (1 + Math.pow(10, (blackRating - whiteRating) / 400));
      const expectedBlack = 1 - expectedWhite;
      
      const actualWhite = winner === 'white' ? 1 : 0;
      const actualBlack = winner === 'black' ? 1 : 0;
      
      const newWhiteRating = Math.round(whiteRating + K * (actualWhite - expectedWhite));
      const newBlackRating = Math.round(blackRating + K * (actualBlack - expectedBlack));

      await db.collection('users').updateOne(
        { userId: game.white.userId },
        {
          $set: { rating: newWhiteRating },
          $inc: { gamesPlayed: 1, ...(winner === 'white' ? { wins: 1 } : { losses: 1 }) }
        }
      );

      await db.collection('users').updateOne(
        { userId: game.black.userId },
        {
          $set: { rating: newBlackRating },
          $inc: { gamesPlayed: 1, ...(winner === 'black' ? { wins: 1 } : { losses: 1 }) }
        }
      );
    }

    io.to(gameId).emit('game-ended', {
      status: 'resigned',
      winner,
      message: `${playerColor === 'white' ? game.white.username : game.black.username} resigned`
    });

    games.delete(gameId);
  });

  socket.on('offer-draw', ({ gameId, userId }) => {
    const game = games.get(gameId);
    if (!game) return;

    const playerColor = game.white.userId === userId ? 'white' : 'black';
    const opponentSocketId = playerColor === 'white' ? game.black.socketId : game.white.socketId;

    io.to(opponentSocketId).emit('draw-offered', { userId, playerColor });
  });

  socket.on('accept-draw', async ({ gameId }) => {
    const game = games.get(gameId);
    if (!game) return;

    game.status = 'draw';

    if (db) {
      await db.collection('games').updateOne(
        { gameId },
        {
          $set: {
            status: 'draw',
            result: 'draw',
            endTime: new Date()
          }
        }
      );

      const whiteRating = game.white.rating;
      const blackRating = game.black.rating;
      const K = 32;
      const expectedWhite = 1 / (1 + Math.pow(10, (blackRating - whiteRating) / 400));
      const expectedBlack = 1 - expectedWhite;
      
      const newWhiteRating = Math.round(whiteRating + K * (0.5 - expectedWhite));
      const newBlackRating = Math.round(blackRating + K * (0.5 - expectedBlack));

      await db.collection('users').updateOne(
        { userId: game.white.userId },
        {
          $set: { rating: newWhiteRating },
          $inc: { gamesPlayed: 1, draws: 1 }
        }
      );

      await db.collection('users').updateOne(
        { userId: game.black.userId },
        {
          $set: { rating: newBlackRating },
          $inc: { gamesPlayed: 1, draws: 1 }
        }
      );
    }

    io.to(gameId).emit('game-ended', {
      status: 'draw',
      winner: 'draw',
      message: 'Game ended in a draw'
    });

    games.delete(gameId);
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
    const index = waitingPlayers.findIndex(p => p.socketId === socket.id);
    if (index !== -1) {
      waitingPlayers.splice(index, 1);
    }
  });
});

// Start server
connectDB().then(() => {
  httpServer.listen(3001, '0.0.0.0', () => {
    console.log('Socket.io server running on port 3001');
  });
}).catch(err => {
  console.error('Failed to connect to MongoDB:', err);
  process.exit(1);
});
