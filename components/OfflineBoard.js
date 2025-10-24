import { useState } from 'react';
import { Chess } from 'chess.js';
import { Chessboard } from 'react-chessboard';

const OfflineBoard = () => {
  const [game, setGame] = useState(new Chess());

  const onDrop = (sourceSquare, targetSquare) => {
    const move = game.move({ from: sourceSquare, to: targetSquare, promotion: 'q' });
    if (move) {
      setGame(new Chess(game.fen()));
    }
  };

  return (
    <div className="w-full max-w-md mx-auto">
      <Chessboard position={game.fen()} onPieceDrop={onDrop} />
      <div className="mt-4 p-4 bg-gray-800 rounded-lg text-white">
        <h3 className="text-lg font-bold">Game Status</h3>
        <p>Turn: {game.turn() === 'w' ? 'White' : 'Black'}</p>
        {game.isCheckmate() && <p className="text-red-500">Checkmate!</p>}
        {game.isDraw() && <p className="text-yellow-500">Draw!</p>}
      </div>
    </div>
  );
};

export default OfflineBoard;
