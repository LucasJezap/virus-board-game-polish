/**
 * @jest-environment jsdom
 */

import { useSessionStore } from "./session-store";

describe("session store", () => {
  it("updates display name and session identifiers", () => {
    useSessionStore.getState().setDisplayName("Alice");
    useSessionStore.getState().setSession({ playerId: "p1", roomId: "room_1", reconnectToken: "token_1" });

    expect(useSessionStore.getState().displayName).toBe("Alice");
    expect(useSessionStore.getState().playerId).toBe("p1");
    expect(useSessionStore.getState().roomId).toBe("room_1");
    expect(useSessionStore.getState().reconnectToken).toBe("token_1");
  });
});
