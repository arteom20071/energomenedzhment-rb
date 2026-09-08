import { describe, expect, it } from "vitest";

import { sanitizeElementStyles, toCssProperties } from "./styles";

describe("sanitizeElementStyles", () => {
  it("allows whitelisted style keys per element type", () => {
    const text = sanitizeElementStyles("text", {
      fontSize: 24,
      color: "#111",
      evil: "payload",
      onClick: "alert(1)",
    });
    expect(text).toEqual({ fontSize: 24, color: "#111" });
  });

  it("rejects non-primitive style values", () => {
    const shape = sanitizeElementStyles("shape", {
      fill: "#6366f1",
      nested: { bad: true },
      fn: () => undefined,
    });
    expect(shape).toEqual({ fill: "#6366f1" });
  });

  it("maps sanitized styles to CSS properties", () => {
    const css = toCssProperties("text", {
      fontSize: 32,
      fontFamily: "Inter",
      textAlign: "center",
    });
    expect(css).toMatchObject({
      fontSize: "32px",
      fontFamily: "Inter",
      textAlign: "center",
    });
  });

  it("maps image crop styles to objectPosition and transform scale", () => {
    const css = toCssProperties("image", {
      objectFit: "cover",
      objectPosition: "30% 70%",
      cropScale: 1.5,
    });
    expect(css.objectFit).toBe("cover");
    expect(css.objectPosition).toBe("30% 70%");
    expect(css.transform).toContain("scale(1.5)");
  });
});
