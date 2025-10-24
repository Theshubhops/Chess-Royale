import { NextResponse } from 'next/server';
import { getDb } from '@/lib/mongodb';
import { hashPassword, verifyPassword, generateToken, getUserFromToken } from '@/lib/auth';
import { calculateRatingChanges } from '@/lib/elo';
import { v4 as uuidv4 } from 'uuid';
import { Chess } from 'chess.js';
import { AccessToken } from 'livekit-server-sdk';

// Helper function to handle CORS
function handleCORS(response) {
  response.headers.set('Access-Control-Allow-Origin', process.env.CORS_ORIGINS || '*');
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  response.headers.set('Access-Control-Allow-Credentials', 'true');
  return response;
}

// OPTIONS handler for CORS
export async function OPTIONS() {
  return handleCORS(new NextResponse(null, { status: 200 }));
}

// Route handler function
async function handleRoute(request, { params }) {
  const { path = [] } = params;
  const route = `/${path.join('/')}`;
  const method = request.method;

  try {
    const db = await getDb();

    // Root endpoint
    if (route === '/' && method === 'GET') {
      return handleCORS(NextResponse.json({ message: "Chess Royale API" }));
    }

    // Auth - Register
    if (route === '/auth/register' && method === 'POST') {
      const body = await request.json();
      const { username, password } = body;

      if (!username || !password) {
        return handleCORS(NextResponse.json({ error: 'Username and password required' }, { status: 400 }));
      }

      if (username.length < 3 || password.length < 6) {
        return handleCORS(NextResponse.json({ error: 'Username must be 3+ chars, password 6+ chars' }, { status: 400 }));
      }

      const existing = await db.collection('users').findOne({ username });
      if (existing) {
        return handleCORS(NextResponse.json({ error: 'Username already exists' }, { status: 400 }));
      }

      const userId = uuidv4();
      const hashedPassword = hashPassword(password);

      await db.collection('users').insertOne({
        userId,
        username,
        password: hashedPassword,
        rating: 1200,
        gamesPlayed: 0,
        wins: 0,
        losses: 0,
        draws: 0,
        createdAt: new Date()
      });

      const token = generateToken(userId, username);

      return handleCORS(NextResponse.json({
        token,
        user: { userId, username, rating: 1200 }
      }));
    }

    // Auth - Login
    if (route === '/auth/login' && method === 'POST') {
      const body = await request.json();
      const { username, password } = body;

      if (!username || !password) {
        return handleCORS(NextResponse.json({ error: 'Username and password required' }, { status: 400 }));
      }

      const user = await db.collection('users').findOne({ username });
      if (!user || !verifyPassword(password, user.password)) {
        return handleCORS(NextResponse.json({ error: 'Invalid credentials' }, { status: 401 }));
      }

      const token = generateToken(user.userId, user.username);

      return handleCORS(NextResponse.json({
        token,
        user: {
          userId: user.userId,
          username: user.username,
          rating: user.rating
        }
      }));
    }

    // Auth - Get current user
    if (route === '/auth/me' && method === 'GET') {
      const user = getUserFromToken(request);
      if (!user) {
        return handleCORS(NextResponse.json({ error: 'Unauthorized' }, { status: 401 }));
      }

      const userData = await db.collection('users').findOne({ userId: user.userId });
      if (!userData) {
        return handleCORS(NextResponse.json({ error: 'User not found' }, { status: 404 }));
      }

      return handleCORS(NextResponse.json({
        userId: userData.userId,
        username: userData.username,
        rating: userData.rating,
        gamesPlayed: userData.gamesPlayed || 0,
        wins: userData.wins || 0,
        losses: userData.losses || 0,
        draws: userData.draws || 0
      }));
    }

    // Profile
    if (route === '/profile' && method === 'GET') {
      const user = getUserFromToken(request);
      if (!user) {
        return handleCORS(NextResponse.json({ error: 'Unauthorized' }, { status: 401 }));
      }

      const userData = await db.collection('users').findOne({ userId: user.userId });

      return handleCORS(NextResponse.json({
        userId: userData.userId,
        username: userData.username,
        rating: userData.rating,
        gamesPlayed: userData.gamesPlayed || 0,
        wins: userData.wins || 0,
        losses: userData.losses || 0,
        draws: userData.draws || 0,
        joinDate: userData.createdAt
      }));
    }

    // Game history
    if (route === '/games/history' && method === 'GET') {
      const user = getUserFromToken(request);
      if (!user) {
        return handleCORS(NextResponse.json({ error: 'Unauthorized' }, { status: 401 }));
      }

      const games = await db.collection('games')
        .find({
          $or: [
            { 'whitePlayer.userId': user.userId },
            { 'blackPlayer.userId': user.userId }
          ],
          status: { $ne: 'active' }
        })
        .sort({ startTime: -1 })
        .limit(50)
        .toArray();

      return handleCORS(NextResponse.json({ games }));
    }

    // Get specific game
    if (route.startsWith('/games/') && method === 'GET') {
      const gameId = path[1];
      const game = await db.collection('games').findOne({ gameId });

      if (!game) {
        return handleCORS(NextResponse.json({ error: 'Game not found' }, { status: 404 }));
      }

      return handleCORS(NextResponse.json({ game }));
    }

    // LiveKit token generation
    if (route === '/livekit-token' && method === 'POST') {
      const body = await request.json();
      const { room, username } = body;

      if (!room || !username) {
        return handleCORS(NextResponse.json({ error: 'Room and username required' }, { status: 400 }));
      }

      const apiKey = process.env.LIVEKIT_API_KEY;
      const apiSecret = process.env.LIVEKIT_API_SECRET;

      if (!apiKey || !apiSecret) {
        return handleCORS(NextResponse.json({ error: 'LiveKit not configured' }, { status: 500 }));
      }

      const token = new AccessToken(apiKey, apiSecret, {
        identity: username,
      });

      token.addGrant({
        roomJoin: true,
        room,
        canPublish: true,
        canSubscribe: true,
      });

      return handleCORS(NextResponse.json(
        { token: token.toJwt() },
        { headers: { 'Cache-Control': 'no-store' } }
      ));
    }

    // Import PGN
    if (route === '/games/import-pgn' && method === 'POST') {
      const user = getUserFromToken(request);
      if (!user) {
        return handleCORS(NextResponse.json({ error: 'Unauthorized' }, { status: 401 }));
      }

      const body = await request.json();
      const { pgn } = body;
      if (!pgn) {
        return handleCORS(NextResponse.json({ error: 'PGN required' }, { status: 400 }));
      }

      try {
        const chess = new Chess();
        chess.loadPgn(pgn);

        const gameId = uuidv4();

        await db.collection('games').insertOne({
          gameId,
          whitePlayer: { userId: user.userId, username: user.username, rating: 0 },
          blackPlayer: { userId: 'imported', username: 'Imported Game', rating: 0 },
          fen: chess.fen(),
          pgn: chess.pgn(),
          moves: chess.history({ verbose: true }),
          status: 'completed',
          result: chess.isCheckmate() ? (chess.turn() === 'w' ? 'black' : 'white') : 'draw',
          startTime: new Date(),
          endTime: new Date(),
          imported: true
        });

        return handleCORS(NextResponse.json({ success: true, gameId }));
      } catch (error) {
        return handleCORS(NextResponse.json({ error: 'Invalid PGN' }, { status: 400 }));
      }
    }

    // Route not found
    return handleCORS(NextResponse.json(
      { error: `Route ${route} not found` },
      { status: 404 }
    ));

  } catch (error) {
    console.error('API Error:', error);
    return handleCORS(NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    ));
  }
}

// Export all HTTP methods
export const GET = handleRoute;
export const POST = handleRoute;
export const PUT = handleRoute;
export const DELETE = handleRoute;
export const PATCH = handleRoute;