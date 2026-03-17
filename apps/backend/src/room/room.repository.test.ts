import { RoomRepository } from "./room.repository";

describe("RoomRepository", () => {
  function createRedisService() {
    const data = new Map<string, string>();
    const sets = new Map<string, Set<string>>();
    return {
      client: {
        set: jest.fn(async (key: string, value: string) => {
          data.set(key, value);
        }),
        get: jest.fn(async (key: string) => data.get(key) ?? null),
        sadd: jest.fn(async (key: string, value: string) => {
          const next = sets.get(key) ?? new Set<string>();
          const hadValue = next.has(value);
          next.add(value);
          sets.set(key, next);
          return hadValue ? 0 : 1;
        }),
        smembers: jest.fn(async (key: string) => Array.from(sets.get(key) ?? [])),
        sismember: jest.fn(async (key: string, value: string) => (sets.get(key) ?? new Set<string>()).has(value) ? 1 : 0),
        srem: jest.fn(async (key: string, value: string) => {
          sets.get(key)?.delete(value);
        }),
      },
    };
  }

  it("persists, indexes, and fetches rooms", async () => {
    const redisService = createRedisService();
    const repository = new RoomRepository(redisService as any);
    const room = {
      id: "room_1",
      code: "ROOM01",
      phase: "WAITING",
      players: [{ role: "PLAYER" }],
    };

    await repository.save(room as any);
    await repository.indexRoomCode(room as any);
    await repository.addPublicRoom(room.id);

    await expect(repository.findById(room.id)).resolves.toMatchObject({ id: room.id });
    await expect(repository.findByCode(room.code)).resolves.toMatchObject({ code: room.code });
    await expect(repository.findOpenPublicRoom()).resolves.toMatchObject({ id: room.id });
    await expect(repository.listAllRoomIds()).resolves.toContain(room.id);
  });

  it("returns null when rooms cannot be found", async () => {
    const repository = new RoomRepository(createRedisService() as any);
    await expect(repository.findByCode("missing")).resolves.toBeNull();
    await expect(repository.findOpenPublicRoom()).resolves.toBeNull();
  });

  it("skips missing or full public rooms while scanning for an open one", async () => {
    const redisService = createRedisService();
    const repository = new RoomRepository(redisService as any);

    await redisService.client.sadd("rooms:public", "missing_room");
    await repository.save({
      id: "room_full",
      code: "ROOM02",
      phase: "WAITING",
      players: Array.from({ length: 6 }, () => ({ role: "PLAYER" })),
    } as any);
    await redisService.client.sadd("rooms:public", "room_full");
    await repository.save({
      id: "room_open",
      code: "ROOM03",
      phase: "WAITING",
      players: [{ role: "PLAYER" }],
    } as any);
    await redisService.client.sadd("rooms:public", "room_open");

    await expect(repository.findOpenPublicRoom()).resolves.toMatchObject({ id: "room_open" });
  });

  it("reserves and releases display names in the cache", async () => {
    const repository = new RoomRepository(createRedisService() as any);

    await expect(repository.reserveDisplayName("Alice")).resolves.toBe(true);
    await expect(repository.reserveDisplayName("alice")).resolves.toBe(false);
    await repository.releaseDisplayName("Alice");
    await expect(repository.reserveDisplayName("ALICE")).resolves.toBe(true);
  });
});
