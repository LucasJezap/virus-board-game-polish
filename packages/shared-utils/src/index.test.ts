import { assertNever } from "./index";

describe("shared-utils", () => {
  it("throws on unexpected values", () => {
    expect(() => assertNever("unexpected" as never)).toThrow("Unexpected value: unexpected");
  });
});
