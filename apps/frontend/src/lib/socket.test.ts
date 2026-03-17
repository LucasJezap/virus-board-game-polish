/**
 * @jest-environment jsdom
 */

const io = jest.fn(() => ({
  connected: false,
  connect: jest.fn(),
  on: jest.fn(),
  off: jest.fn(),
}));

jest.mock("socket.io-client", () => ({
  io,
}));

describe("socket factory", () => {
  it("creates and caches the room socket", () => {
    jest.isolateModules(() => {
      const { getRoomSocket } = require("./socket");
      const first = getRoomSocket();
      const second = getRoomSocket();

      expect(io).toHaveBeenCalledTimes(1);
      expect(first).toBe(second);
    });
  });
});
