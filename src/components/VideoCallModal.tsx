import { useRef, useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Video, VideoOff, Mic, MicOff, Phone, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createSignalingSocket } from "@/lib/signalingSocket";
import type { Socket } from "socket.io-client";

const ICE_SERVERS: RTCConfiguration = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:global.stun.twilio.com:3478" },
    {
      urls: "turn:openrelay.metered.ca:80",
      username: "openrelayproject",
      credential: "openrelayproject",
    },
    {
      urls: "turn:openrelay.metered.ca:443",
      username: "openrelayproject",
      credential: "openrelayproject",
    },
  ],
};

export interface VideoCallModalProps {
  open: boolean;
  remoteName: string;
  remoteAvatar: string;
  onEnd: () => void;
  /** Same id on both peers, e.g. `appointment-<mongoId>` or `consultation-<mongoId>` */
  roomId: string | null;
}

const VideoCallModal = ({ open, remoteName, remoteAvatar, onEnd, roomId }: VideoCallModalProps) => {
  const localRef = useRef<HTMLVideoElement>(null);
  const remoteRef = useRef<HTMLVideoElement>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const socketRef = useRef<Socket | null>(null);
  const icePendingRef = useRef<RTCIceCandidateInit[]>([]);

  const [muted, setMuted] = useState(false);
  const [videoOn, setVideoOn] = useState(true);
  const [elapsed, setElapsed] = useState(0);
  const [status, setStatus] = useState<"idle" | "connecting" | "live" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  const fmt = (s: number) => `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

  const cleanup = useCallback(() => {
    icePendingRef.current = [];
    if (socketRef.current) {
      if (roomId) socketRef.current.emit("webrtc:leave", { roomId });
      socketRef.current.removeAllListeners();
      socketRef.current.disconnect();
      socketRef.current = null;
    }
    if (pcRef.current) {
      pcRef.current.close();
      pcRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (localRef.current) localRef.current.srcObject = null;
    if (remoteRef.current) remoteRef.current.srcObject = null;
    setStatus("idle");
    setElapsed(0);
  }, [roomId]);

  useEffect(() => {
    if (!open) {
      cleanup();
      return;
    }
    if (!roomId) {
      setStatus("error");
      setErrorMsg("No room id — cannot start WebRTC.");
      return;
    }

    let cancelled = false;
    const socket = createSignalingSocket();
    socketRef.current = socket;

    const flushIce = (pc: RTCPeerConnection) => {
      while (icePendingRef.current.length && pc.remoteDescription) {
        const c = icePendingRef.current.shift();
        if (c) pc.addIceCandidate(new RTCIceCandidate(c)).catch(() => {});
      }
    };

    (async () => {
      try {
        setStatus("connecting");
        setErrorMsg("");
        let stream: MediaStream | null = null;
        try {
          stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        } catch (e) {
          console.warn("Could not get media stream, joining receive-only:", e);
        }

        if (cancelled) return;
        streamRef.current = stream;
        if (localRef.current && stream) localRef.current.srcObject = stream;

        const pc = new RTCPeerConnection(ICE_SERVERS);
        pcRef.current = pc;

        if (stream) {
          stream.getTracks().forEach((t) => pc.addTrack(t, stream!));
        } else {
          // add transceivers to receive video and audio even if we don't have local tracks
          pc.addTransceiver("video", { direction: "recvonly" });
          pc.addTransceiver("audio", { direction: "recvonly" });
        }

        pc.ontrack = (ev) => {
          if (remoteRef.current) {
            if (ev.streams && ev.streams.length > 0) {
              remoteRef.current.srcObject = ev.streams[0];
            } else {
              let inboundStream = remoteRef.current.srcObject as MediaStream | null;
              if (!inboundStream) {
                inboundStream = new MediaStream();
                remoteRef.current.srcObject = inboundStream;
              }
              inboundStream.addTrack(ev.track);
            }
          }
          setStatus("live");
        };

        pc.onicecandidate = (ev) => {
          if (ev.candidate && socket.connected) {
            socket.emit("webrtc:ice", { roomId, candidate: ev.candidate.toJSON() });
          }
        };

        socket.on("webrtc:negotiate", async ({ isOfferer }: { isOfferer: boolean }) => {
          if (cancelled || !pcRef.current) return;
          const p = pcRef.current;
          try {
            if (isOfferer) {
              const offer = await p.createOffer();
              await p.setLocalDescription(offer);
              socket.emit("webrtc:offer", { roomId, sdp: p.localDescription });
            }
          } catch {
            setStatus("error");
            setErrorMsg("Could not start offer");
          }
        });

        socket.on("webrtc:offer", async ({ sdp }: { sdp: RTCSessionDescriptionInit }) => {
          if (cancelled || !pcRef.current) return;
          const p = pcRef.current;
          try {
            await p.setRemoteDescription(new RTCSessionDescription(sdp));
            const answer = await p.createAnswer();
            await p.setLocalDescription(answer);
            socket.emit("webrtc:answer", { roomId, sdp: p.localDescription });
            flushIce(p);
          } catch {
            setStatus("error");
            setErrorMsg("Could not answer call");
          }
        });

        socket.on("webrtc:answer", async ({ sdp }: { sdp: RTCSessionDescriptionInit }) => {
          if (cancelled || !pcRef.current) return;
          const p = pcRef.current;
          try {
            await p.setRemoteDescription(new RTCSessionDescription(sdp));
            flushIce(p);
          } catch {
            setStatus("error");
            setErrorMsg("Could not complete handshake");
          }
        });

        socket.on("webrtc:ice", async ({ candidate }: { candidate: RTCIceCandidateInit }) => {
          if (cancelled || !pcRef.current) return;
          const p = pcRef.current;
          if (!p.remoteDescription) {
            icePendingRef.current.push(candidate);
            return;
          }
          try {
            await p.addIceCandidate(new RTCIceCandidate(candidate));
          } catch {
            icePendingRef.current.push(candidate);
          }
        });

        socket.on("webrtc:peer-left", () => {
          setErrorMsg("The other participant left.");
          setStatus("error");
        });

        await new Promise<void>((resolve, reject) => {
          socket.once("connect", () => resolve());
          socket.once("connect_error", reject);
          if (socket.connected) resolve();
        });

        if (cancelled) return;
        socket.emit("webrtc:join", { roomId }, (resp?: { ok?: boolean; error?: string }) => {
          if (cancelled) return;
          if (!resp?.ok) {
            setStatus("error");
            setErrorMsg(resp?.error || "Could not join call room");
          }
        });
      } catch (e) {
        if (!cancelled) {
          setStatus("error");
          setErrorMsg(e instanceof Error ? e.message : "Camera/mic permission denied?");
        }
      }
    })();

    return () => {
      cancelled = true;
      cleanup();
    };
  }, [open, roomId, cleanup]);

  useEffect(() => {
    if (status !== "live") return;
    const iv = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => clearInterval(iv);
  }, [status]);

  useEffect(() => {
    const s = streamRef.current;
    if (!s) return;
    s.getAudioTracks().forEach((t) => (t.enabled = !muted));
  }, [muted]);

  useEffect(() => {
    const s = streamRef.current;
    if (!s) return;
    s.getVideoTracks().forEach((t) => (t.enabled = videoOn));
  }, [videoOn]);

  const handleEnd = () => {
    cleanup();
    onEnd();
  };

  if (!open) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] bg-black/90 flex flex-col items-center justify-center"
      >
        <div className="relative w-full max-w-4xl aspect-video rounded-2xl overflow-hidden bg-slate-900 flex items-center justify-center">
          <video
            ref={remoteRef}
            autoPlay
            playsInline
            className="absolute inset-0 w-full h-full object-cover bg-slate-800"
          />
          {status === "connecting" && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/50 z-10">
              <div className="w-16 h-16 rounded-full border-4 border-primary/50 border-t-primary animate-spin mb-4" />
              <p className="text-white/90 text-sm">Connecting to {remoteName}…</p>
            </div>
          )}
          {status === "error" && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/70 z-10 p-6 text-center">
              <p className="text-white font-medium mb-2">{errorMsg || "Connection issue"}</p>
              <p className="text-white/60 text-xs mb-4">Both users must open the call with the same appointment or consultation. Use HTTPS or localhost for camera access.</p>
              <Button variant="secondary" onClick={handleEnd}>
                Close
              </Button>
            </div>
          )}

          <div className="absolute bottom-4 right-4 w-36 h-28 rounded-xl border-2 border-white/30 overflow-hidden bg-black shadow-lg z-20">
            <video ref={localRef} autoPlay playsInline muted className="w-full h-full object-cover" />
            {!videoOn && (
              <div className="absolute inset-0 flex items-center justify-center bg-slate-800">
                <VideoOff className="w-8 h-8 text-white/50" />
              </div>
            )}
          </div>

          <div className="absolute top-4 left-4 flex items-center gap-3 z-20">
            <div className="w-10 h-10 rounded-full bg-primary/30 flex items-center justify-center text-white text-sm font-bold border border-white/20">
              {remoteAvatar}
            </div>
            <div>
              <p className="text-white font-medium text-sm shadow-black drop-shadow-md">{remoteName}</p>
              <div className="flex items-center gap-2 text-white/80 text-xs">
                <Clock className="w-3 h-3" />
                <span>{fmt(elapsed)}</span>
                {status === "live" && <span className="text-primary">● Live</span>}
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6 flex items-center gap-4">
          <Button
            variant="outline"
            size="icon"
            className={`rounded-full w-12 h-12 ${muted ? "bg-destructive/20 border-destructive" : "bg-white/10 border-white/20"}`}
            onClick={() => setMuted((m) => !m)}
          >
            {muted ? <MicOff className="w-5 h-5 text-destructive" /> : <Mic className="w-5 h-5 text-white" />}
          </Button>
          <Button
            variant="outline"
            size="icon"
            className={`rounded-full w-12 h-12 ${!videoOn ? "bg-destructive/20 border-destructive" : "bg-white/10 border-white/20"}`}
            onClick={() => setVideoOn((v) => !v)}
          >
            {videoOn ? <Video className="w-5 h-5 text-white" /> : <VideoOff className="w-5 h-5 text-destructive" />}
          </Button>
          <Button size="icon" className="rounded-full w-14 h-14 bg-destructive hover:bg-destructive/90" onClick={handleEnd}>
            <Phone className="w-6 h-6 text-white rotate-[135deg]" />
          </Button>
        </div>

        <p className="text-white/40 text-xs mt-4 max-w-lg text-center px-4">
          Video visits can be joined on the appointment day (or near the booked time). WebRTC uses STUN; strict networks may need TURN.
        </p>
      </motion.div>
    </AnimatePresence>
  );
};

export default VideoCallModal;
