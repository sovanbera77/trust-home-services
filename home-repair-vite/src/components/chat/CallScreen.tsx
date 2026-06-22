import { useEffect, useRef, useState } from 'react';
import { Phone, PhoneOff, Mic, MicOff, Camera } from 'lucide-react';
import { getCurrentState, getLocalStream, toggleMute, toggleVideo, endCall, subscribeCalls, answerCall } from '../../lib/call';
import type { CallState } from '../../lib/call';

export default function CallScreen() {
  const [callState, setCallState] = useState<CallState>(getCurrentState());
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    // Initial state
    setCallState(getCurrentState());

    const unsubscribe = subscribeCalls(() => {
      setCallState(getCurrentState());
    });

    return () => unsubscribe();
  }, []);

  // Update streams when state changes
  useEffect(() => {
    if (callState.status !== 'idle' && callState.status !== 'ended') {
      const stream = getLocalStream();
      if (stream && localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }
      
      // Assuming RTCPeerConnection automatically sets remote stream via ontrack
      // in a full implementation, we'd listen for the `ontrack` event in call.ts and expose the remote stream.
      // For now, call.ts needs a getRemoteStream() export if we are showing video.
    }
  }, [callState.status]);

  if (callState.status === 'idle' || callState.status === 'ended') {
    return null;
  }

  // Actually from call.ts: We receive an event 'incoming' but need to answer it. 
  // Let's refine based on call.ts state.

  return (
    <div className="fixed inset-0 bg-black/90 z-[100] flex flex-col items-center justify-center text-white">
      {callState.status === 'incoming' ? (
        <div className="flex flex-col items-center justify-center mb-12">
          <div className="w-24 h-24 rounded-full bg-[#00a884] flex items-center justify-center text-4xl mb-4 animate-bounce">
            {callState.remoteName?.[0] || callState.remoteUsername?.[0] || '?'}
          </div>
          <h2 className="text-2xl font-semibold">{callState.remoteName || callState.remoteUsername}</h2>
          <p className="text-gray-400 mt-2">Incoming {callState.type} Call...</p>
          
          <div className="flex gap-8 mt-12">
            <button 
              onClick={() => answerCall(callState.remoteUsername, callState.sdp!, callState.type)} 
              className="p-4 rounded-full bg-green-500 text-white hover:bg-green-600 transition-colors"
            >
              <Phone size={32} />
            </button>
            <button 
              onClick={() => endCall()} 
              className="p-4 rounded-full bg-red-500 text-white hover:bg-red-600 transition-colors"
            >
              <PhoneOff size={32} />
            </button>
          </div>
        </div>
      ) : callState.type === 'video' && callState.status === 'connected' ? (
        <div className="relative w-full h-full max-w-4xl max-h-[80vh] bg-black">
          {/* Remote Video */}
          <video 
            ref={remoteVideoRef} 
            autoPlay 
            playsInline 
            className="w-full h-full object-cover"
          />
          {/* Local Video */}
          <div className="absolute bottom-4 right-4 w-32 h-48 bg-gray-800 rounded-lg overflow-hidden shadow-lg border-2 border-white/20">
            <video 
              ref={localVideoRef} 
              autoPlay 
              playsInline 
              muted 
              className="w-full h-full object-cover"
            />
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center mb-12">
          <div className="w-24 h-24 rounded-full bg-[#00a884] flex items-center justify-center text-4xl mb-4">
            {callState.remoteName?.[0] || callState.remoteUsername?.[0] || '?'}
          </div>
          <h2 className="text-2xl font-semibold">{callState.remoteName || callState.remoteUsername}</h2>
          <p className="text-gray-400 mt-2">
            {callState.status === 'calling' ? 'Calling...' : 
             callState.status === 'connected' ? 'Connected' : ''}
          </p>
        </div>
      )}

      {/* Controls (only when not incoming) */}
      {callState.status !== 'incoming' && (
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-6 bg-gray-900/80 px-8 py-4 rounded-full backdrop-blur-sm">
          <button 
            onClick={() => toggleMute()} 
            className={`p-4 rounded-full transition-colors ${callState.muted ? 'bg-white text-black' : 'bg-gray-700 text-white hover:bg-gray-600'}`}
          >
            {callState.muted ? <MicOff size={24} /> : <Mic size={24} />}
          </button>
          
          {callState.type === 'video' && (
            <button 
              onClick={() => toggleVideo()} 
              className="p-4 rounded-full bg-gray-700 text-white hover:bg-gray-600 transition-colors"
            >
              <Camera size={24} />
            </button>
          )}

          <button 
            onClick={() => endCall()} 
            className="p-4 rounded-full bg-red-500 text-white hover:bg-red-600 transition-colors"
          >
            <PhoneOff size={24} />
          </button>
        </div>
      )}
    </div>
  );
}
