import { Server } from "socket.io";
import jwt from "jsonwebtoken";
import { User } from "../models/User.js";
import { Appointment } from "../models/Appointment.js";
import { Consultation } from "../models/Consultation.js";
import { isPatientWithinVideoCallWindow } from "../utils/appointmentCallWindow.js";

/**
 * Socket.IO signaling for WebRTC (offer/answer/ICE). Rooms match VideoCallModal roomId (e.g. appointment-<id>).
 */
export function attachSignaling(httpServer) {
  const io = new Server(httpServer, {
    cors: {
      origin: process.env.CLIENT_ORIGIN?.split(",").map((s) => s.trim()) || true,
      credentials: true,
    },
    path: "/socket.io",
  });

  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      if (!token) throw new Error("no token");
      const payload = jwt.verify(token, process.env.JWT_SECRET);
      if (payload.role === "doctor") {
        const user = await User.findById(payload.sub).select("approved role");
        if (!user || user.approved === false) {
          return next(new Error("not_approved"));
        }
      }
      next();
    } catch {
      next(new Error("unauthorized"));
    }
  });

  io.on("connection", (socket) => {
    socket.on("webrtc:join", async ({ roomId }, ack) => {
      try {
        if (!roomId || typeof roomId !== "string") return;
        const payload = jwt.verify(socket.handshake.auth?.token, process.env.JWT_SECRET);
        const callerId = String(payload.sub || "");
        const callerRole = String(payload.role || "");
        if (roomId.startsWith("appointment-")) {
          const appointmentId = roomId.slice("appointment-".length);
          const apt = await Appointment.findById(appointmentId);
          if (!apt) {
            ack?.({ ok: false, error: "Appointment not found" });
            return;
          }
          const isDoctor = apt.doctorId && String(apt.doctorId) === callerId;
          const isPatient = apt.patientId && String(apt.patientId) === callerId;
          if (!isDoctor && !isPatient) {
            ack?.({ ok: false, error: "Not authorized for this room" });
            return;
          }
          if (!["confirmed", "pending"].includes(apt.status)) {
            ack?.({ ok: false, error: "Appointment is not active" });
            return;
          }
          if (callerRole === "patient" && !isPatientWithinVideoCallWindow(apt)) {
            ack?.({ ok: false, error: "Patient can join only at appointment time" });
            return;
          }
        } else if (roomId.startsWith("consultation-")) {
          const consultationId = roomId.slice("consultation-".length);
          const c = await Consultation.findById(consultationId);
          if (!c) {
            ack?.({ ok: false, error: "Consultation not found" });
            return;
          }
          const isDoctor = c.doctorId && String(c.doctorId) === callerId;
          const isPatient = c.patientId && String(c.patientId) === callerId;
          if (!isDoctor && !isPatient) {
            ack?.({ ok: false, error: "Not authorized for this room" });
            return;
          }
          if (!["Ongoing", "Waiting"].includes(c.status)) {
            ack?.({ ok: false, error: "Consultation is not active" });
            return;
          }
        }
        await socket.join(roomId);
        const sockets = await io.in(roomId).fetchSockets();
        if (sockets.length >= 2) {
          const peer = sockets.find((s) => s.id !== socket.id);
          if (peer) {
            // Always negotiate between the most recent joiner and one existing peer.
            socket.emit("webrtc:negotiate", { isOfferer: true });
            peer.emit("webrtc:negotiate", { isOfferer: false });
          }
        }
        ack?.({ ok: true, peerCount: sockets.length });
      } catch (e) {
        ack?.({ ok: false, error: String(e) });
      }
    });

    socket.on("webrtc:offer", ({ roomId, sdp }) => {
      if (roomId && sdp) socket.to(roomId).emit("webrtc:offer", { sdp });
    });

    socket.on("webrtc:answer", ({ roomId, sdp }) => {
      if (roomId && sdp) socket.to(roomId).emit("webrtc:answer", { sdp });
    });

    socket.on("webrtc:ice", ({ roomId, candidate }) => {
      if (roomId && candidate) socket.to(roomId).emit("webrtc:ice", { candidate });
    });

    socket.on("webrtc:leave", ({ roomId }) => {
      if (roomId) {
        socket.leave(roomId);
        socket.to(roomId).emit("webrtc:peer-left");
      }
    });

    socket.on("disconnecting", () => {
      for (const room of socket.rooms) {
        if (room !== socket.id) socket.to(room).emit("webrtc:peer-left");
      }
    });
  });

  return io;
}
