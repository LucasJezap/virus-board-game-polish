import { RandomService } from "./random.service";

describe("RandomService", () => {
  it("returns an item and rejects empty arrays", () => {
    const service = new RandomService();
    expect([1, 2, 3]).toContain(service.pickOne([1, 2, 3]));
    expect(() => service.pickOne([])).toThrow("empty collection");
  });
});
