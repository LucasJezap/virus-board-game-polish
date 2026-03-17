"use client";

import { useEffect } from "react";
import type { ChatMessage, RoomLobbyEntry, RoomProjection } from "@wirus/shared-types";

import { getRoomSocket } from "../lib/socket";
import { useRoomStore } from "../store/room-store";
import { useSessionStore } from "../store/session-store";

export function useRoomSocket() {
  const setConnected = useRoomStore((state) => state.setConnected);
  const setError = useRoomStore((state) => state.setError);
  const setLobbyRooms = useRoomStore((state) => state.setLobbyRooms);
  const setRoom = useRoomStore((state) => state.setRoom);
  const appendChat = useRoomStore((state) => state.appendChat);
  const setSession = useSessionStore((state) => state.setSession);
  const roomId = useSessionStore((state) => state.roomId);
  const reconnectToken = useSessionStore((state) => state.reconnectToken);

  useEffect(() => {
    const socket = getRoomSocket();

    const onConnect = () => {
      setConnected(true);
      socket.emit("ROOM_LIST");
      if (roomId && reconnectToken) {
        socket.emit("PLAYER_RECONNECT", {
          roomId,
          reconnectToken,
        });
      }
    };
    const onDisconnect = () => setConnected(false);
    const onRoomList = (rooms: RoomLobbyEntry[]) => setLobbyRooms(rooms);
    const onRoomState = (room: RoomProjection) => {
      setRoom(room);
      setSession({
        playerId: room.viewerPlayerId,
        roomId: room.viewerPlayerId ? room.id : null,
        reconnectToken: room.viewerReconnectToken,
      });
    };
    const onChat = (message: ChatMessage) => appendChat(message);
    const onError = (payload: { code: string; message: string }) => setError(payload.message);

    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);
    socket.on("ROOM_LIST_UPDATE", onRoomList);
    socket.on("ROOM_STATE_UPDATE", onRoomState);
    socket.on("ROOM_CHAT_MESSAGE", onChat);
    socket.on("ROOM_ERROR", onError);

    if (!socket.connected) {
      socket.connect();
    }

    return () => {
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
      socket.off("ROOM_LIST_UPDATE", onRoomList);
      socket.off("ROOM_STATE_UPDATE", onRoomState);
      socket.off("ROOM_CHAT_MESSAGE", onChat);
      socket.off("ROOM_ERROR", onError);
    };
  }, [appendChat, reconnectToken, roomId, setConnected, setError, setLobbyRooms, setRoom, setSession]);
}
