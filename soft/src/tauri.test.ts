import { describe, expect, it } from "vitest";
import {
  secureDeleteToken,
  secureGetToken,
  secureSetToken,
} from "./tauri";

describe("secure token fallback", () => {
  it("writes, restores and clears the session token without a real Tauri keychain", async () => {
    await expect(secureGetToken()).resolves.toBe("");

    await secureSetToken("token-from-keychain-mock");
    await expect(secureGetToken()).resolves.toBe("token-from-keychain-mock");

    await secureDeleteToken();
    await expect(secureGetToken()).resolves.toBe("");
  });
});