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
const supabase = require("./supabase");

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

app.post("/api/login", async (req, res) => {
  const { fullName, username, passphrase } = req.body;
  
  if (!username || !passphrase || !fullName) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  const ADMIN_FULLNAME = process.env.ADMIN_FULLNAME;
  const ADMIN_USERNAME = process.env.ADMIN_USERNAME;
  const ADMIN_PASSPHRASE = process.env.ADMIN_PASSPHRASE;

  const isRealAdminLogin = (fullName === ADMIN_FULLNAME && username === ADMIN_USERNAME && passphrase === ADMIN_PASSPHRASE);

  const normalizedName = fullName.toLowerCase();
  const normalizedUser = username.toLowerCase();

  const isRestrictedName = normalizedName.includes("shehab");
  const isRestrictedUser = normalizedUser.includes("admin");

  if ((isRestrictedName || isRestrictedUser) && !isRealAdminLogin) {
    return res.status(401).json({ error: "Access Denied. These names/usernames are reserved for the administrator." });
  }

  if (!supabase) {
    return res.status(200).json({ 
      success: true, 
      user: { username, full_name: fullName, role: isRealAdminLogin ? "admin" : "user" } 
    });
  }

  let userToReturn;

  if (isRealAdminLogin) {
    userToReturn = { username, full_name: fullName, role: "admin" };
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

  return res.status(200).json({ success: true, user: userToReturn });
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
  socket.on("user_join", async (userData) => {
    if (!userData || !userData.username) return;

    // SINGLE SESSION POLICY: Disconnect any existing session for THIS username
    const existingSessions = Array.from(users.entries()).filter(([id, u]) => u.username === userData.username);
    for (const [id, u] of existingSessions) {
      if (id !== socket.id) {
        io.to(id).emit("force_logout", { reason: "You have logged in from another device/tab." });
        const s = io.sockets.sockets.get(id);
        if (s) s.disconnect(true);
      }
    }

    users.set(socket.id, {
      username: userData.username,
      fullName: userData.full_name,
      role: userData.role || "user",
      id: socket.id,
      avatar: userData.username.charAt(0).toUpperCase(),
      joinedAt: Date.now()
    });

    if (userData.role === "admin") {
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

    if (userData.role !== "admin") {
      const joinMsg = {
        id: Date.now().toString() + Math.random(),
        type: "system",
        content: `${userData.username} joined the chat`,
        timestamp: Date.now()
      };
      io.emit("receive_message", joinMsg);
    }
  });

  socket.on("send_message", async (data) => {
    const user = users.get(socket.id);
    if (!user) return;

    const timestamp = Date.now();
    const msg = {
      id: timestamp.toString() + Math.random(),
      type: "user",
      content: data.content,
      sender: user.username,
      full_name: user.fullName,
      senderId: socket.id,
      avatar: user.avatar,
      timestamp: timestamp
    };

    if (supabase) {
      await supabase.from("messages").insert([{
        username: user.username,
        full_name: user.fullName,
        message: data.content,
        timestamp: timestamp
      }]);
    } else {
      memoryMessageHistory.push(msg);
      if (memoryMessageHistory.length > MAX_HISTORY) memoryMessageHistory.shift();
    }

    io.emit("receive_message", msg);
  });

  socket.on("admin_delete_message", async (messageId) => {
    const user = users.get(socket.id);
    if (!user || user.role !== "admin") return;

    const deletedText = "This message was deleted by the admin";
    if (supabase) {
      await supabase.from("messages").update({ message: deletedText }).eq("id", messageId);
    }
    io.emit("message_deleted", { id: messageId, newContent: deletedText });
  });

  socket.on("admin_clear_all", async () => {
    const user = users.get(socket.id);
    if (!user || user.role !== "admin") return;

    if (supabase) {
      await supabase.from("messages").delete().neq("id", "00000000-0000-0000-0000-000000000000"); 
    } else {
      memoryMessageHistory = [];
    }
    io.emit("chat_cleared");
  });

  socket.on("admin_get_users", async () => {
    const user = users.get(socket.id);
    if (!user || user.role !== "admin") return;

    if (supabase) {
      const { data, error } = await supabase.from("users").select("id, full_name, username, created_at");
      if (!error) {
        socket.emit("admin_users_list", data);
      }
    }
  });

  socket.on("admin_delete_user", async ({ userId, reason }) => {
    const admin = users.get(socket.id);
    if (!admin || admin.role !== "admin") return;

    if (supabase) {
      const { data: userToDelete } = await supabase.from("users").select("username").eq("id", userId).single();
      
      if (userToDelete) {
        const kickCandidates = Array.from(users.entries()).filter(([sid, u]) => u.username === userToDelete.username);
        for (const [sid, u] of kickCandidates) {
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
    const user = users.get(socket.id);
    if (user) {
      socket.broadcast.emit("user_typing", { username: user.username, isTyping: true });
    }
  });

  socket.on("typing_stop", () => {
    const user = users.get(socket.id);
    if (user) {
      socket.broadcast.emit("user_typing", { username: user.username, isTyping: false });
    }
  });

  socket.on("disconnect", () => {
    const user = users.get(socket.id);
    if (user) {
      users.delete(socket.id);
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
