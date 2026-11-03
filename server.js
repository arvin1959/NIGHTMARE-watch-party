const express = require("express");
const http = require("http");
const path = require("path");
const crypto = require("crypto");
const Database = require("better-sqlite3");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: false } });
const PORT = process.env.PORT || 3000;
const db = new Database(process.env.DB_PATH || path.join(__dirname, "nightmare.sqlite"));
db.pragma("journal_mode = WAL");
db.exec(`
  CREATE TABLE IF NOT EXISTS rooms (
    code TEXT PRIMARY KEY, video_url TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE IF NOT EXISTS messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT, room_code TEXT NOT NULL,
    nickname TEXT NOT NULL, body TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );
`);

app.use(express.static(path.join(__dirname, "public")));
app.get("/health", (_req, res) => res.json({ ok: true, service: "NIGHTMARE" }));

const roomMembers = new Map();
const clean = (v, max=300) => String(v ?? "").trim().slice(0, max);
const roomCode = () => crypto.randomBytes(3).toString("hex").toUpperCase();

io.on("connection", socket => {
  socket.on("room:create", ({ nickname, videoUrl } = {}, reply = () => {}) => {
    const name = clean(nickname, 24) || "Guest";
    const url = clean(videoUrl, 1000);
    const code = roomCode();
    db.prepare("INSERT INTO rooms(code, video_url) VALUES(?, ?)").run(code, url);
    joinRoom(socket, code, name);
    reply({ ok: true, code, videoUrl: url });
  });

  socket.on("room:join", ({ code, nickname } = {}, reply = () => {}) => {
    const normalized = clean(code, 12).toUpperCase();
    const room = db.prepare("SELECT * FROM rooms WHERE code = ?").get(normalized);
    if (!room) return reply({ ok: false, error: "اتاقی با این کد پیدا نشد." });
    joinRoom(socket, normalized, clean(nickname, 24) || "Guest");
    reply({ ok: true, code: normalized, videoUrl: room.video_url });
    const history = db.prepare("SELECT nickname, body, created_at FROM messages WHERE room_code = ? ORDER BY id DESC LIMIT 60").all(normalized).reverse();
    socket.emit("chat:history", history);
  });

  socket.on("chat:send", body => {
    const code = socket.data.roomCode;
    if (!code) return;
    const message = clean(body, 500);
    if (!message) return;
    const nickname = socket.data.nickname || "Guest";
    db.prepare("INSERT INTO messages(room_code, nickname, body) VALUES(?, ?, ?)").run(code, nickname, message);
    io.to(code).emit("chat:message", { nickname, body: message, time: new Date().toISOString() });
  });

  socket.on("reaction:send", emoji => {
    if (!socket.data.roomCode) return;
    const allowed = ["👻","💀","🩸","😱","🕯️","🖤","🍿","🔥"];
    if (allowed.includes(emoji)) io.to(socket.data.roomCode).emit("reaction:new", { emoji, nickname: socket.data.nickname });
  });

  socket.on("video:update", state => {
    if (!socket.data.roomCode || !socket.data.isHost) return;
    io.to(socket.data.roomCode).emit("video:update", state);
  });

  socket.on("disconnect", () => {
    const code = socket.data.roomCode;
    if (!code) return;
    const members = roomMembers.get(code);
    if (members) {
      members.delete(socket.id);
      io.to(code).emit("presence:update", [...members.values()]);
      if (!members.size) roomMembers.delete(code);
    }
  });
});

function joinRoom(socket, code, nickname) {
  socket.join(code);
  socket.data.roomCode = code;
  socket.data.nickname = nickname;
  const members = roomMembers.get(code) || new Map();
  socket.data.isHost = members.size === 0;
  members.set(socket.id, { id: socket.id, nickname, isHost: socket.data.isHost });
  roomMembers.set(code, members);
  io.to(code).emit("presence:update", [...members.values()]);
  socket.emit("room:role", { isHost: socket.data.isHost });
}

server.listen(PORT, "0.0.0.0", () => console.log(`NIGHTMARE running on ${PORT}`));
