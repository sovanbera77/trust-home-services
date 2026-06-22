import { useEffect, useRef, useState } from 'react';
import { t } from '../../lib/i18n';
import {
  endCall, toggleMute, toggleVideo, getLocalStream,
  answerCall, handleRemoteAnswer, handleRemoteIce,
  initCallService, subscribeCalls,
} from '../../lib/call';
import { Phone, PhoneOff, Mic, MicOff, Video, VideoOff, X } from 'lucide-react';

type CallType = 'audio' | 'video';

export default function CallModal() {
  const [visible, setVisible] = useState(false);
  const [status, setStatus] = useState<'idle' | 'calling' | 'ringing' | 'connected' | 'ended'>('idle');
  const [remoteName, setRemoteName] = useState('');
  const [callType, setCallType] = useState<CallType>('audio');
  const [muted, setMuted] = useState(false);
  const [videoEnabled, setVideoEnabled] = useState(false);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const incomingRef = useRef<{ from: string; callerName: string; sdp: string; type: CallType } | null>(null);
  const [incoming, setIncoming] = useState<{ from: string; callerName: string; type: CallType } | null>(null);

  useEffect(() => {
    initCallService();
    const unsub = subscribeCalls((event) => {
      switch (event.type) {
        case 'calling': {
          setRemoteName(event.targetName);
          setCallType(event.callType);
          setStatus('calling');
          setVisible(true);
          setVideoEnabled(event.callType === 'video');
          break;
        }
        case 'incoming': {
          incomingRef.current = { from: event.from, callerName: event.callerName, sdp: event.sdp, type: event.callType };
          setIncoming({ from: event.from, callerName: event.callerName, type: event.callType });
          setRemoteName(event.callerName);
          setCallType(event.callType);
          setStatus('ringing');
          setVisible(true);
          setVideoEnabled(event.callType === 'video');
          break;
        }
        case 'answered': {
          handleRemoteAnswer(event.sdp);
          setStatus('connected');
          break;
        }
        case 'ice-candidate': {
          handleRemoteIce(event.candidate);
          break;
        }
        case 'ended': {
          setStatus('ended');
          setTimeout(() => { setVisible(false); setIncoming(null); }, 2000);
          break;
        }
      }
    });
    return unsub;
  }, []);

  useEffect(() => {
    const stream = getLocalStream();
    if (localVideoRef.current && stream) {
      localVideoRef.current.srcObject = stream;
    }
  }, [visible]);

  function handleAnswer() {
    if (!incomingRef.current) return;
    answerCall(incomingRef.current.from, incomingRef.current.sdp, incomingRef.current.type);
    setStatus('connected');
    setIncoming(null);
    incomingRef.current = null;
  }

  function handleReject() {
    endCall();
    setVisible(false);
    setIncoming(null);
    incomingRef.current = null;
  }

  function handleEnd() {
    endCall();
    setVisible(false);
    setIncoming(null);
    incomingRef.current = null;
  }

  function handleToggleMute() {
    toggleMute();
    setMuted(!muted);
  }

  function handleToggleVideo() {
    toggleVideo();
    setVideoEnabled(!videoEnabled);
  }

  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
      <div className="bg-gray-900 rounded-2xl p-6 w-full max-w-md mx-4 shadow-2xl border border-white/10">
        {incoming ? (
          <div className="text-center space-y-6">
            <div className="w-20 h-20 rounded-full bg-indigo-600/30 mx-auto flex items-center justify-center">
              <Phone size={36} className="text-indigo-400" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-white">{incoming.callerName}</h3>
              <p className="text-[#94a3b8] text-sm mt-1">
                {incoming.type === 'video' ? t('call.incomingVideo') : t('call.incomingAudio')}
              </p>
            </div>
            <div className="flex items-center justify-center gap-6">
              <button
                onClick={handleReject}
                className="w-14 h-14 rounded-full bg-red-600 flex items-center justify-center hover:bg-red-700 transition"
              >
                <PhoneOff size={24} className="text-white" />
              </button>
              <button
                onClick={handleAnswer}
                className="w-14 h-14 rounded-full bg-green-600 flex items-center justify-center hover:bg-green-700 transition animate-pulse"
              >
                <Phone size={24} className="text-white" />
              </button>
            </div>
          </div>
        ) : status === 'calling' ? (
          <div className="text-center space-y-6">
            <div className="w-20 h-20 rounded-full bg-indigo-600/30 mx-auto flex items-center justify-center">
              <Phone size={36} className="text-indigo-400" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-white">{t('call.calling')}</h3>
              <p className="text-[#94a3b8] text-sm mt-1">{remoteName}</p>
            </div>
            <div className="w-12 h-12 mx-auto border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
            <button
              onClick={handleEnd}
              className="w-14 h-14 rounded-full bg-red-600 flex items-center justify-center mx-auto hover:bg-red-700 transition"
            >
              <X size={24} className="text-white" />
            </button>
          </div>
        ) : status === 'connected' ? (
          <div className="space-y-4">
            {callType === 'video' && (
              <div className="relative bg-black rounded-xl overflow-hidden aspect-video">
                <video ref={remoteVideoRef} autoPlay playsInline className="w-full h-full object-cover" />
                <video
                  ref={localVideoRef}
                  autoPlay playsInline muted
                  className="absolute bottom-3 right-3 w-24 h-32 rounded-lg object-cover border-2 border-white/20 bg-gray-800"
                />
              </div>
            )}
            {callType === 'audio' && (
              <div className="text-center py-8">
                <div className="w-24 h-24 rounded-full bg-indigo-600/30 mx-auto flex items-center justify-center mb-4">
                  <Phone size={40} className="text-indigo-400" />
                </div>
                <h3 className="text-xl font-bold text-white">{remoteName}</h3>
                <p className="text-green-400 text-sm mt-1">{t('call.connected')}</p>
                <p className="text-[#94a3b8] text-xs mt-1">{t('call.duration')} 00:00</p>
              </div>
            )}
            <div className="flex items-center justify-center gap-6 pt-2">
              <button
                onClick={handleToggleMute}
                className={`w-12 h-12 rounded-full flex items-center justify-center transition ${muted ? 'bg-red-600' : 'bg-white/10 hover:bg-white/20'}`}
              >
                {muted ? <MicOff size={20} className="text-white" /> : <Mic size={20} className="text-white" />}
              </button>
              {callType === 'video' && (
                <button
                  onClick={handleToggleVideo}
                  className={`w-12 h-12 rounded-full flex items-center justify-center transition ${!videoEnabled ? 'bg-red-600' : 'bg-white/10 hover:bg-white/20'}`}
                >
                  {videoEnabled ? <Video size={20} className="text-white" /> : <VideoOff size={20} className="text-white" />}
                </button>
              )}
              <button
                onClick={handleEnd}
                className="w-14 h-14 rounded-full bg-red-600 flex items-center justify-center hover:bg-red-700 transition"
              >
                <PhoneOff size={24} className="text-white" />
              </button>
            </div>
          </div>
        ) : status === 'ended' ? (
          <div className="text-center space-y-4 py-6">
            <div className="w-20 h-20 rounded-full bg-gray-700 mx-auto flex items-center justify-center">
              <PhoneOff size={36} className="text-[#94a3b8]" />
            </div>
            <h3 className="text-xl font-bold text-white">{t('call.ended')}</h3>
            <p className="text-[#94a3b8] text-sm">{t('call.with')} {remoteName}</p>
          </div>
        ) : null}
      </div>
    </div>
  );
}