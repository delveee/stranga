import { useEffect, useRef, useState, useCallback } from 'react';
import io from 'socket.io-client';

const ICE_SERVERS = JSON.parse(import.meta.env.VITE_ICE_SERVERS || '[]');

export const useWebRTC = (serverUrl) => {
    const [socket, setSocket] = useState(null);
    const [localStream, setLocalStream] = useState(null);
    const [remoteStream, setRemoteStream] = useState(null);
    const [partnerId, setPartnerId] = useState(null);
    const [isConnected, setIsConnected] = useState(false);
    const pc = useRef(null);
    const socketRef = useRef(null);

    // Initialize Socket
    useEffect(() => {
        const s = io(serverUrl);
        socketRef.current = s;
        setSocket(s);

        s.on('connect', () => console.log('Connected to signaling server'));

        s.on('match-found', handleMatchFound);
        s.on('signal', handleSignal);
        s.on('ice-candidate', handleIceCandidate);
        s.on('partner-disconnected', handlePartnerDisconnect);

        return () => s.disconnect();
    }, [serverUrl]);

    const setupPeerConnection = useCallback((isInitiator, targetPartnerId) => {
        if (pc.current) pc.current.close();

        pc.current = new RTCPeerConnection({
            iceServers: ICE_SERVERS,
            iceTransportPolicy: "all"
        });

        // Add local tracks
        if (localStream) {
            localStream.getTracks().forEach(track => pc.current.addTrack(track, localStream));
        }

        pc.current.ontrack = (event) => {
            console.log("Remote track received");
            setRemoteStream(event.streams[0]);
        };

        pc.current.onicecandidate = (event) => {
            if (event.candidate) {
                socketRef.current.emit('ice-candidate', { to: targetPartnerId, candidate: event.candidate });
            }
        };

        pc.current.oniceconnectionstatechange = () => {
            console.log("ICE State:", pc.current.iceConnectionState);
            if (pc.current.iceConnectionState === 'connected') {
                setIsConnected(true);
            }
            if (pc.current.iceConnectionState === 'disconnected') {
                setIsConnected(false);
            }
        };

        return pc.current;
    }, [localStream]);

    const handleMatchFound = async ({ partnerId, initiator }) => {
        console.log(`Matched with ${partnerId}. Initiator: ${initiator}`);
        setPartnerId(partnerId);
        const peer = setupPeerConnection(initiator, partnerId);

        if (initiator) {
            const offer = await peer.createOffer();
            await peer.setLocalDescription(offer);
            socketRef.current.emit('signal', { to: partnerId, signal: { type: 'offer', sdp: offer } });
        }
    };

    const handleSignal = async ({ from, signal }) => {
        if (!pc.current) return;

        if (signal.type === 'offer') {
            await pc.current.setRemoteDescription(new RTCSessionDescription(signal.sdp));
            const answer = await pc.current.createAnswer();
            await pc.current.setLocalDescription(answer);
            socketRef.current.emit('signal', { to: from, signal: { type: 'answer', sdp: answer } });
        } else if (signal.type === 'answer') {
            await pc.current.setRemoteDescription(new RTCSessionDescription(signal.sdp));
        }
    };

    const handleIceCandidate = async ({ candidate }) => {
        if (pc.current) {
            try {
                await pc.current.addIceCandidate(new RTCIceCandidate(candidate));
            } catch (e) {
                console.error("Error adding received ice candidate", e);
            }
        }
    };

    const handlePartnerDisconnect = () => {
        console.log("Partner disconnected");
        setPartnerId(null);
        setRemoteStream(null);
        setIsConnected(false);
        if (pc.current) {
            pc.current.close();
            pc.current = null;
        }
        // Auto re-queue or wait for user action?
        // prompt user
    };

    const startMedia = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
            setLocalStream(stream);
            return stream;
        } catch (err) {
            console.error("Media access error:", err);
            return null;
        }
    };

    const stopMedia = () => {
        if (localStream) {
            localStream.getTracks().forEach(track => track.stop());
            setLocalStream(null);
        }
    }

    const joinPool = (interests = []) => {
        socketRef.current.emit('join-pool', { interests });
    };

    const nextMatch = () => {
        handlePartnerDisconnect(); // Cleanup current
        joinPool(); // Re-join
    };

    return {
        socket,
        localStream,
        remoteStream,
        partnerId,
        isConnected,
        startMedia,
        stopMedia,
        joinPool,
        nextMatch
    };
};
