"use client";

import { io, type Socket } from "socket.io-client";

let roomSocket: Socket | null = null;

export function getRoomSocket(): Socket {
  if (roomSocket) {
    return roomSocket;
  }

  roomSocket = io(process.env.NEXT_PUBLIC_SOCKET_URL ?? "http://localhost:3001/rooms", {
    autoConnect: false,
    transports: ["websocket"],
  });

  return roomSocket;
}
