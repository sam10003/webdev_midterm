import { Server } from "socket.io";
import jwt from "jsonwebtoken";
import User from "./models/User.js";
import config from "./config/index.js";

/**
 * Attach Socket.IO to `http.Server`; JWT required (`handshake.auth.token` or `Authorization: Bearer`).
 * Joins socket to room `String(user.company)`.
 */
export function attachSocketIO(httpServer, app) {
  const io = new Server(httpServer, {
    cors: {
      origin: config.corsOrigins.length ? config.corsOrigins : true,
      credentials: true,
    },
  });

  io.use(async (socket, next) => {
    try {
      let token = socket.handshake.auth?.token;
      if (!token) {
        const h = socket.handshake.headers?.authorization;
        if (h?.startsWith("Bearer ")) token = h.slice(7).trim();
      }
      if (!token) {
        return next(new Error("Unauthorized"));
      }

      const payload = jwt.verify(token, config.jwtSecret);
      const user = await User.findById(payload._id).select("company deleted");
      if (!user || user.deleted || !user.company) {
        return next(new Error("Unauthorized"));
      }

      socket.companyId = String(user.company);
      socket.userId = user._id;
      next();
    } catch {
      next(new Error("Unauthorized"));
    }
  });

  io.on("connection", (socket) => {
    socket.join(socket.companyId);
    console.log(
      `[socket] ${socket.id} joined company room ${socket.companyId}`
    );
  });

  app.set("io", io);
  return io;
}
