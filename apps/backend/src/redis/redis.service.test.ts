import { RedisService } from "./redis.service";

describe("RedisService", () => {
  it("exposes the client and quits on module destroy", async () => {
    const client = {
      quit: jest.fn().mockResolvedValue(undefined),
    };
    const service = new RedisService(client as any);

    expect(service.client).toBe(client);
    await service.onModuleDestroy();
    expect(client.quit).toHaveBeenCalled();
  });
});
