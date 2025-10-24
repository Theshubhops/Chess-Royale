import { useEffect, useState } from 'react';
import { Room, RoomEvent } from 'livekit-client';
import { useLiveKitRoom, VideoConference } from '@livekit/components-react';
import '@livekit/components-styles';

const VideoChat = ({ token, roomName }) => {
  const [room] = useState(() => new Room());

  useEffect(() => {
    const connect = async () => {
      await room.connect(process.env.NEXT_PUBLIC_LIVEKIT_URL, token);
      await room.localParticipant.setCameraEnabled(true);
      await room.localParticipant.setMicrophoneEnabled(true);
    };
    connect();

    return () => {
      room.disconnect();
    };
  }, [room, token]);

  return (
    <div data-lk-theme="default">
      <VideoConference room={room} />
    </div>
  );
};

export default VideoChat;
