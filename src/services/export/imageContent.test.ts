import { describe, expect, it } from "vitest";

import {
  isSafeImageDataUrl,
  isUnresolvedImageReference,
  resolveImageContent,
} from "./imageContent";

const VALID_PNG =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";

describe("imageContent", () => {
  it("accepts valid image data URLs", () => {
    expect(isSafeImageDataUrl(VALID_PNG)).toBe(true);
    expect(isUnresolvedImageReference(VALID_PNG)).toBe(false);
  });

  it("rejects malformed and unsafe references", () => {
    expect(isSafeImageDataUrl("data:text/html;base64,abc")).toBe(false);
    expect(isUnresolvedImageReference("asset://missing")).toBe(true);
    expect(isUnresolvedImageReference("blob:123")).toBe(true);
    expect(isUnresolvedImageReference("https://x.test/a.png")).toBe(true);
  });

  it("resolves asset references through injected resolver", async () => {
    const result = await resolveImageContent(
      "asset://img-1",
      async () => VALID_PNG,
      "slides[0].content",
    );
    expect(result.success).toBe(true);
  });

  it("rejects unresolved asset references", async () => {
    const result = await resolveImageContent(
      "asset://missing",
      async () => null,
      "slides[0].content",
    );
    expect(result.success).toBe(false);
  });
});
