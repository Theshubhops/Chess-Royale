'use client';

import { useEffect, useState } from 'react';
import {
  LiveKitRoom,
  GridLayout,
  ParticipantTile,
  RoomAudioRenderer,
  ControlBar,
  useTracks,
} from '@livekit/components-react';
import { Track } from 'livekit-client';
import '@livekit/components-styles';

export default function VideoChat({ roomName, playerName }) {
  const [token, setToken] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchToken = async () => {
      try {
        const response = await fetch('/api/livekit-token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ room: roomName, username: playerName }),
        });

        if (!response.ok) {
          throw new Error('Failed to fetch token');
        }

        const data = await response.json();
        setToken(data.token);
      } catch (err) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };

    if (roomName && playerName) {
      fetchToken();
    }
  }, [roomName, playerName]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full bg-slate-800 rounded-lg">
        <div className="text-white">Loading video chat...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full bg-slate-800 rounded-lg">
        <div className="text-red-500">Video chat unavailable</div>
      </div>
    );
  }

  if (!token) {
    return (
      <div className="flex items-center justify-center h-full bg-slate-800 rounded-lg">
        <div className="text-slate-400">Unable to connect</div>
      </div>
    );
  }

  return (
    <div className="h-full rounded-lg overflow-hidden bg-slate-800">
      <LiveKitRoom
        video={true}
        audio={true}
        token={token}
        serverUrl={process.env.NEXT_PUBLIC_LIVEKIT_URL}
        data-lk-theme="default"
        className="h-full"
      >
        <VideoLayout />
        <RoomAudioRenderer />
        <div className="absolute bottom-2 left-0 right-0 px-2">
          <ControlBar variation="minimal" className="bg-slate-900/80 rounded-lg" />
        </div>
      </LiveKitRoom>
    </div>
  );
}

function VideoLayout() {
  const tracks = useTracks([
    { source: Track.Source.Camera, withPlaceholder: true },
    { source: Track.Source.ScreenShare, withPlaceholder: false },
  ]);

  return (
    <div className="lk-video-conference h-full">
      <GridLayout tracks={tracks} className="h-full">
        <ParticipantTile />
      </GridLayout>
    </div>
  );
}