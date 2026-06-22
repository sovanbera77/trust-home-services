import { realtime } from './realtime';

export type CallType = 'audio' | 'video';

export interface CallState {
  status: 'idle' | 'calling' | 'incoming' | 'connected' | 'ended';
  remoteUsername: string;
  remoteName: string;
  type: CallType;
  muted: boolean;
  sdp?: string;
}

export type CallEventListener = (event: CallEvent) => void;

export type CallEvent =
  | { type: 'incoming'; from: string; callerName: string; sdp: string; callType: CallType }
  | { type: 'calling'; target: string; targetName: string; callType: CallType }
  | { type: 'answered'; sdp: string }
  | { type: 'ice-candidate'; candidate: string }
  | { type: 'ended'; from: string }
  | { type: 'muted'; from: string; muted: boolean };

const listeners = new Set<CallEventListener>();
let localStream: MediaStream | null = null;
let peerConnection: RTCPeerConnection | null = null;
let currentState: CallState = { status: 'idle', remoteUsername: '', remoteName: '', type: 'audio', muted: false };

const ICE_SERVERS = { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] };

function notify(event: CallEvent) {
  listeners.forEach(l => l(event));
}

function setupSocketListeners() {
  const socket = realtime.getSocket();
  if (!socket) return;

  socket.on('call:incoming', (data: { from: string; callerName: string; sdp: string; type: CallType }) => {
    currentState = { status: 'incoming', remoteUsername: data.from, remoteName: data.callerName, type: data.type || 'audio', muted: false, sdp: data.sdp };
    notify({ type: 'incoming', from: data.from, callerName: data.callerName, sdp: data.sdp, callType: data.type || 'audio' });
  });

  socket.on('call:answered', (data: { from: string; sdp: string }) => {
    handleRemoteAnswer(data.sdp);
    notify({ type: 'answered', sdp: data.sdp });
  });

  socket.on('call:ice-candidate', (data: { from: string; candidate: string }) => {
    handleRemoteIce(data.candidate);
    notify({ type: 'ice-candidate', candidate: data.candidate });
  });

  socket.on('call:ended', (data: { from: string }) => {
    cleanup();
    currentState = { ...currentState, status: 'ended' };
    notify({ type: 'ended', from: data.from });
  });

  socket.on('call:muted', (data: { from: string; muted: boolean }) => {
    notify({ type: 'muted', from: data.from, muted: data.muted });
  });
}

export function initCallService() {
  setupSocketListeners();
}

async function ensureStream(type: CallType): Promise<MediaStream> {
  if (localStream) return localStream;
  const constraints = type === 'video'
    ? { audio: true, video: { width: { ideal: 640 }, height: { ideal: 480 } } }
    : { audio: true, video: false };
  localStream = await navigator.mediaDevices.getUserMedia(constraints);
  return localStream;
}

export async function startCall(target: string, targetName: string, type: CallType) {
  try {
    const stream = await ensureStream(type);
    peerConnection = new RTCPeerConnection(ICE_SERVERS);
    stream.getTracks().forEach(track => peerConnection!.addTrack(track, stream));

    peerConnection.onicecandidate = (e) => {
      if (e.candidate) {
        const socket = realtime.getSocket();
        socket?.emit('call:ice-candidate', { target, candidate: JSON.stringify(e.candidate) });
      }
    };

    const offer = await peerConnection.createOffer();
    await peerConnection.setLocalDescription(offer);

    const socket = realtime.getSocket();
    socket?.emit('call:offer', { target, sdp: JSON.stringify(offer), type });

    currentState = { status: 'calling', remoteUsername: target, remoteName: targetName, type, muted: false };
    notify({ type: 'calling', target, targetName, callType: type });
  } catch {
    cleanup();
    throw new Error('Failed to start call');
  }
}

export async function answerCall(from: string, sdp: string, type: CallType) {
  try {
    const stream = await ensureStream(type);
    peerConnection = new RTCPeerConnection(ICE_SERVERS);
    stream.getTracks().forEach(track => peerConnection!.addTrack(track, stream));

    peerConnection.onicecandidate = (e) => {
      if (e.candidate) {
        const socket = realtime.getSocket();
        socket?.emit('call:ice-candidate', { target: from, candidate: JSON.stringify(e.candidate) });
      }
    };

    const offer = JSON.parse(sdp);
    await peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
    const answer = await peerConnection.createAnswer();
    await peerConnection.setLocalDescription(answer);

    const socket = realtime.getSocket();
    socket?.emit('call:answer', { target: from, sdp: JSON.stringify(answer) });

    currentState = { ...currentState, status: 'connected' };
  } catch {
    cleanup();
    throw new Error('Failed to answer call');
  }
}

export function handleRemoteAnswer(sdp: string) {
  if (!peerConnection) return;
  peerConnection.setRemoteDescription(new RTCSessionDescription(JSON.parse(sdp)));
  currentState = { ...currentState, status: 'connected' };
}

export function handleRemoteIce(candidate: string) {
  if (!peerConnection) return;
  peerConnection.addIceCandidate(new RTCIceCandidate(JSON.parse(candidate)));
}

export function toggleMute() {
  if (!localStream) return;
  const audioTrack = localStream.getAudioTracks()[0];
  if (audioTrack) {
    const muted = !audioTrack.enabled;
    audioTrack.enabled = !muted;
    currentState = { ...currentState, muted: !currentState.muted };
    const socket = realtime.getSocket();
    socket?.emit('call:mute', { target: currentState.remoteUsername, muted: !currentState.muted });
  }
}

export function toggleVideo() {
  if (!localStream) return;
  const videoTrack = localStream.getVideoTracks()[0];
  if (videoTrack) {
    videoTrack.enabled = !videoTrack.enabled;
  }
}

export function endCall() {
  const socket = realtime.getSocket();
  if (currentState.remoteUsername) {
    socket?.emit('call:end', { target: currentState.remoteUsername });
  }
  cleanup();
  currentState = { ...currentState, status: 'ended' };
}

function cleanup() {
  if (peerConnection) {
    peerConnection.close();
    peerConnection = null;
  }
  if (localStream) {
    localStream.getTracks().forEach(t => t.stop());
    localStream = null;
  }
}

export function getLocalStream(): MediaStream | null {
  return localStream;
}

export function getCurrentState(): CallState {
  return currentState;
}

export function setCallState(state: Partial<CallState>) {
  currentState = { ...currentState, ...state };
}

export function subscribeCalls(listener: CallEventListener): () => void {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}

export function openCall(target: string, name: string, type: CallType) {
  setCallState({ remoteUsername: target, remoteName: name, type });
  startCall(target, name, type);
}