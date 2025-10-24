import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

const RoomLobby = ({ onJoinRoom, onCreateRoom }) => {
  const [roomId, setRoomId] = useState('');

  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-2xl font-bold">Game Rooms</h2>
      <div className="flex items-center gap-2">
        <Input
          type="text"
          placeholder="Enter Room ID"
          value={roomId}
          onChange={(e) => setRoomId(e.target.value)}
        />
        <Button onClick={() => onJoinRoom(roomId)}>Join Room</Button>
      </div>
      <Button onClick={onCreateRoom}>Create New Room</Button>
    </div>
  );
};

export default RoomLobby;
