import { useEffect, useState } from 'react';
import { useWebRTC } from './hooks/useWebRTC';
import { VideoContainer } from './components/VideoContainer';
import { Play, Square, MessageSquare } from 'lucide-react';

// Use environment variable for server URL
const SERVER_URL = import.meta.env.VITE_SERVER_URL || "http://localhost:3000";


function App() {
  const {
    localStream,
    remoteStream,
    isConnected,
    startMedia,
    stopMedia,
    joinPool,
    nextMatch
  } = useWebRTC(SERVER_URL);

  const [started, setStarted] = useState(false);

  const handleStart = async () => {
    const stream = await startMedia();
    if (stream) {
      setStarted(true);
      joinPool(['general']); // Default interest
    }
  };

  const handleNext = () => {
    nextMatch();
  };

  const handleStop = () => {
    stopMedia();
    setStarted(false);
    // TODO: Disconnect socket or leave pool
  };

  return (
    <div className="w-screen h-screen bg-zinc-950 flex flex-col overflow-hidden">
      {!started ? (
        <div className="flex-1 flex flex-col items-center justify-center space-y-8 glass m-4 rounded-3xl p-10 max-w-2xl mx-auto my-auto relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-purple-500/20 to-blue-500/20 pointer-events-none" />
          <h1 className="text-6xl font-black bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-pink-600 z-10">STRANGA</h1>
          <p className="text-xl text-zinc-300 text-center max-w-md z-10">
            Anonymous 1-on-1 video chat. <br />
            Connect with strangers safely and instantly.
          </p>
          <button
            onClick={handleStart}
            className="z-10 group relative px-8 py-4 bg-white text-black font-bold text-xl rounded-full hover:bg-zinc-200 transition-all active:scale-95 shadow-[0_0_20px_rgba(255,255,255,0.3)] hover:shadow-[0_0_40px_rgba(255,255,255,0.5)]"
          >
            Start Chat
          </button>
        </div>
      ) : (
        <div className="flex-1 relative">
          <VideoContainer
            localStream={localStream}
            remoteStream={remoteStream}
            isConnected={isConnected}
          />

          {/* Controls Bar */}
          <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex items-center space-x-4">
            <button
              onClick={handleStop}
              className="p-4 rounded-full bg-red-500/80 hover:bg-red-600 backdrop-blur text-white shadow-lg transition-all active:scale-95"
            >
              <Square className="w-6 h-6 fill-current" />
            </button>
            <button
              onClick={handleNext}
              className="px-8 py-4 rounded-full bg-white/90 hover:bg-white text-black font-bold shadow-xl transition-all active:scale-95 flex items-center space-x-2"
            >
              <span>NEXT</span>
              <Play className="w-5 h-5 fill-current" />
            </button>
            <button
              className="p-4 rounded-full bg-zinc-800/80 hover:bg-zinc-700 backdrop-blur text-white shadow-lg transition-all"
            >
              <MessageSquare className="w-6 h-6" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
