import { io } from "socket.io-client";

const serverUrl = import.meta.env.VITE_SERVER_URL || "http://127.0.0.1:3040";
const socket = io(serverUrl, {
  autoConnect: false,
  reconnection: true,
  reconnectionAttempts: 10,
  reconnectionDelay: 1000
});

export default socket;
