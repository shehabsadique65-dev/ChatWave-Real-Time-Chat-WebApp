require("dotenv").config();
process.on('uncaughtException', (err) => {
  console.error('CRITICAL: Uncaught Exception:', err);
});
process.on('unhandledRejection', (reason, promise) => {
  console.error('CRITICAL: Unhandled Rejection at:', promise, 'reason:', reason);
});
const dns = require("dns");
if (dns.setDefaultResultOrder) {
  dns.setDefaultResultOrder('ipv4first');
}
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
const crypto = require("crypto");
const supabase = require("./supabase");

const app = express();

const CLIENT_URL = process.env.CLIENT_URL || "http://localhost:5173";
app.use(cors({ origin: CLIENT_URL, methods: ["GET", "POST"] }));
app.use(express.json({ limit: "10kb" }));

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: CLIENT_URL,
    methods: ["GET", "POST"]
  }
});

// ─── SESSION TOKEN STORE ─────────────────────────────────────────────────────
// Maps token → { username, full_name, role } — issued at login, verified on join
const sessionTokens = new Map();
const TOKEN_TTL_MS = 30 * 1000; // token must be used within 30 seconds of login

function createSessionToken(userData) {
  const token = crypto.randomBytes(32).toString("hex");
  sessionTokens.set(token, userData);
  // Auto-expire the token so unused ones don't pile up
  setTimeout(() => sessionTokens.delete(token), TOKEN_TTL_MS);
  return token;
}

// ─── RATE LIMITER ─────────────────────────────────────────────────────────────
// Tracks per-socket event counts within a rolling window
const rateLimits = new Map();
const RATE_WINDOW_MS = 5000;   // 5-second window
const MAX_EVENTS     = 20;     // max events per window per socket

function isRateLimited(socketId, event) {
  const key = `${socketId}:${event}`;
  const now = Date.now();
  const entry = rateLimits.get(key) || { count: 0, resetAt: now + RATE_WINDOW_MS };
  if (now > entry.resetAt) {
    entry.count = 0;
    entry.resetAt = now + RATE_WINDOW_MS;
  }
  entry.count++;
  rateLimits.set(key, entry);
  return entry.count > MAX_EVENTS;
}

app.post("/api/login", async (req, res) => {
  const { fullName, username, passphrase } = req.body;

  if (!username || !passphrase || !fullName) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  // Basic input length guard
  if (fullName.length > 50 || username.length > 30 || passphrase.length > 100) {
    return res.status(400).json({ error: "Input too long" });
  }

  const ADMIN_FULLNAME   = process.env.ADMIN_FULLNAME;
  const ADMIN_USERNAME   = process.env.ADMIN_USERNAME;
  const ADMIN_PASSPHRASE = process.env.ADMIN_PASSPHRASE;

  const isRealAdminLogin = (
    fullName   === ADMIN_FULLNAME &&
    username   === ADMIN_USERNAME &&
    passphrase === ADMIN_PASSPHRASE
  );

  const normalizedName = fullName.toLowerCase();
  const normalizedUser = username.toLowerCase();

  const isRestrictedName = normalizedName.includes("shehab");
  const isRestrictedUser = normalizedUser.includes("admin");

  if ((isRestrictedName || isRestrictedUser) && !isRealAdminLogin) {
    return res.status(401).json({ error: "Access Denied. These names/usernames are reserved for the administrator." });
  }

  let userToReturn;

  if (isRealAdminLogin) {
    userToReturn = { username, full_name: fullName, role: "admin" };
  } else if (!supabase) {
    userToReturn = { username, full_name: fullName, role: "user" };
  } else {
    const { data: existingUser, error: findError } = await supabase
      .from("users")
      .select("*")
      .eq("username", username)
      .single();

    if (findError && findError.code !== "PGRST116") {
      return res.status(500).json({ error: "Database error" });
    }

    if (existingUser) {
      if (existingUser.passphrase !== passphrase) {
        return res.status(401).json({ error: "Username already exists. Please choose another username or enter the correct passphrase." });
      }
      userToReturn = { ...existingUser, role: "user" };
    } else {
      const { data: newUser, error: insertError } = await supabase
        .from("users")
        .insert([{ full_name: fullName, username, passphrase }])
        .select()
        .single();

      if (insertError) {
        return res.status(500).json({ error: "Failed to create user" });
      }
      userToReturn = { ...newUser, role: "user" };
    }
  }

  // ✅ Issue a short-lived server-side session token — role is NEVER trusted from client
  const sessionToken = createSessionToken({
    username:  userToReturn.username,
    full_name: userToReturn.full_name,
    role:      userToReturn.role       // role is set HERE by server, not by client
  });

  return res.status(200).json({ success: true, user: userToReturn, sessionToken });
});

const users = new Map();
let memoryMessageHistory = [];
const MAX_HISTORY = 100;

async function loadMessageHistory() {
  if (!supabase) return memoryMessageHistory;
  const { data, error } = await supabase
    .from("messages")
    .select("*")
    .order("timestamp", { ascending: false })
    .limit(MAX_HISTORY);
  
  if (error) {
    console.error("Error loading messages:", error);
    return memoryMessageHistory;
  }
  return data.reverse();
}

function emitUserList() {
  const allUsers = Array.from(users.values());
  const filteredUsers = allUsers.filter(u => u.role !== "admin");

  io.to("admins").emit("user_list", allUsers);
  io.to("users").emit("user_list", filteredUsers);
}

io.on("connection", (socket) => {
  socket.on("user_join", async (payload) => {
    // ✅ SECURITY: Verify the server-issued session token — NEVER trust role from client
    if (!payload || !payload.sessionToken) {
      socket.emit("force_logout", { reason: "Invalid session. Please log in again." });
      socket.disconnect(true);
      return;
    }

    const verified = sessionTokens.get(payload.sessionToken);
    if (!verified) {
      socket.emit("force_logout", { reason: "Session expired or invalid. Please log in again." });
      socket.disconnect(true);
      return;
    }

    // Consume the token immediately — one-time use only
    sessionTokens.delete(payload.sessionToken);

    const { username, full_name, role } = verified; // role comes from SERVER, not client

    // SINGLE SESSION POLICY: Disconnect any existing session for THIS username
    const existingSessions = Array.from(users.entries()).filter(([id, u]) => u.username === username);
    for (const [id] of existingSessions) {
      if (id !== socket.id) {
        io.to(id).emit("force_logout", { reason: "You have logged in from another device/tab." });
        const s = io.sockets.sockets.get(id);
        if (s) s.disconnect(true);
      }
    }

    users.set(socket.id, {
      username,
      fullName: full_name,
      role,
      id: socket.id,
      avatar: username.charAt(0).toUpperCase(),
      joinedAt: Date.now()
    });

    if (role === "admin") {
      socket.join("admins");
    } else {
      socket.join("users");
    }

    const history = await loadMessageHistory();
    socket.emit("message_history", history.map(msg => ({
      id: msg.id,
      type: "user",
      content: msg.message,
      sender: msg.username,
      full_name: msg.full_name,
      avatar: msg.username.charAt(0).toUpperCase(),
      timestamp: msg.timestamp
    })));

    emitUserList();

    if (role !== "admin") {
      const joinMsg = {
        id: Date.now().toString() + Math.random(),
        type: "system",
        content: `${username} joined the chat`,
        timestamp: Date.now()
      };
      io.emit("receive_message", joinMsg);
    }
  });

  socket.on("send_message", async (data) => {
    if (isRateLimited(socket.id, "send_message")) return;
    const user = users.get(socket.id);
    if (!user) return;

    // Validate and sanitize content
    if (!data || typeof data.content !== "string") return;
    const content = data.content.trim().slice(0, 1000); // max 1000 chars
    if (!content) return;

    const timestamp = Date.now();
    const msg = {
      id: timestamp.toString() + Math.random(),
      type: "user",
      content,
      sender: user.username,
      full_name: user.fullName,
      senderId: socket.id,
      avatar: user.avatar,
      timestamp
    };

    if (supabase) {
      await supabase.from("messages").insert([{
        username: user.username,
        full_name: user.fullName,
        message: content,
        timestamp
      }]);
    } else {
      memoryMessageHistory.push(msg);
      if (memoryMessageHistory.length > MAX_HISTORY) memoryMessageHistory.shift();
    }

    io.emit("receive_message", msg);
  });

  socket.on("admin_delete_message", async (messageId) => {
    if (isRateLimited(socket.id, "admin_delete_message")) return;
    const user = users.get(socket.id);
    // ✅ Role verified against server-side users Map (never client-supplied)
    if (!user || user.role !== "admin") {
      socket.emit("force_logout", { reason: "Unauthorized action detected." });
      socket.disconnect(true);
      return;
    }
    if (typeof messageId !== "string") return;

    const deletedText = "This message was deleted by the admin";
    if (supabase) {
      await supabase.from("messages").update({ message: deletedText }).eq("id", messageId);
    }
    io.emit("message_deleted", { id: messageId, newContent: deletedText });
  });

  socket.on("admin_clear_all", async () => {
    if (isRateLimited(socket.id, "admin_clear_all")) return;
    const user = users.get(socket.id);
    if (!user || user.role !== "admin") {
      socket.emit("force_logout", { reason: "Unauthorized action detected." });
      socket.disconnect(true);
      return;
    }

    if (supabase) {
      await supabase.from("messages").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    } else {
      memoryMessageHistory = [];
    }
    io.emit("chat_cleared");
  });

  socket.on("admin_get_users", async () => {
    if (isRateLimited(socket.id, "admin_get_users")) return;
    const user = users.get(socket.id);
    if (!user || user.role !== "admin") {
      socket.emit("force_logout", { reason: "Unauthorized action detected." });
      socket.disconnect(true);
      return;
    }

    if (supabase) {
      const { data, error } = await supabase.from("users").select("id, full_name, username, created_at");
      if (!error) socket.emit("admin_users_list", data);
    }
  });

  socket.on("admin_delete_user", async ({ userId, reason }) => {
    if (isRateLimited(socket.id, "admin_delete_user")) return;
    const admin = users.get(socket.id);
    if (!admin || admin.role !== "admin") {
      socket.emit("force_logout", { reason: "Unauthorized action detected." });
      socket.disconnect(true);
      return;
    }
    if (typeof userId !== "string") return;

    if (supabase) {
      const { data: userToDelete } = await supabase.from("users").select("username").eq("id", userId).single();

      if (userToDelete) {
        const kickCandidates = Array.from(users.entries()).filter(([sid, u]) => u.username === userToDelete.username);
        for (const [sid] of kickCandidates) {
          io.to(sid).emit("user_kicked", { reason: reason || "No reason specified" });
          const s = io.sockets.sockets.get(sid);
          if (s) s.disconnect(true);
        }
      }

      await supabase.from("users").delete().eq("id", userId);
      const { data } = await supabase.from("users").select("id, full_name, username, created_at");
      socket.emit("admin_users_list", data);
    }
  });

  socket.on("typing_start", () => {
    if (isRateLimited(socket.id, "typing")) return;
    const user = users.get(socket.id);
    if (user) socket.broadcast.emit("user_typing", { username: user.username, isTyping: true });
  });

  socket.on("typing_stop", () => {
    const user = users.get(socket.id);
    if (user) socket.broadcast.emit("user_typing", { username: user.username, isTyping: false });
  });

  socket.on("disconnect", () => {
    const user = users.get(socket.id);
    if (user) {
      users.delete(socket.id);
      rateLimits.forEach((_, key) => { if (key.startsWith(socket.id)) rateLimits.delete(key); });
      emitUserList();

      if (user.role !== "admin") {
        const leaveMsg = {
          id: Date.now().toString() + Math.random(),
          type: "system",
          content: `${user.username} left the chat`,
          timestamp: Date.now()
        };
        io.emit("receive_message", leaveMsg);
      }
    }
  });
});

const PORT = process.env.PORT || 3010;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
