import { describe, expect, it } from "vitest";

import { sanitizeElementStyles, toCssProperties, toImageInnerStyles } from "./styles";

describe("sanitizeElementStyles", () => {
  it("allows whitelisted style keys per element type", () => {
    const text = sanitizeElementStyles("text", {
      fontSize: 24,
      color: "#111827",
      evil: "payload",
      onClick: "alert(1)",
    });
    expect(text).toEqual({ fontSize: 24, color: "#111827" });
  });

  it("rejects non-primitive style values", () => {
    const shape = sanitizeElementStyles("shape", {
      fill: "#6366f1",
      nested: { bad: true },
      fn: () => undefined,
    });
    expect(shape).toEqual({ fill: "#6366f1" });
  });

  it("coerces and clamps opacity to 0..1", () => {
    expect(sanitizeElementStyles("text", { opacity: 1.5 })).toEqual({ opacity: 1 });
    expect(sanitizeElementStyles("text", { opacity: -0.2 })).toEqual({ opacity: 0 });
    expect(sanitizeElementStyles("text", { opacity: "0.6" })).toEqual({ opacity: 0.6 });
  });

  it("validates textAlign and objectFit enums", () => {
    expect(sanitizeElementStyles("text", { textAlign: "center" })).toEqual({ textAlign: "center" });
    expect(sanitizeElementStyles("text", { textAlign: "bogus" })).toEqual({});
    expect(sanitizeElementStyles("image", { objectFit: "cover" })).toEqual({ objectFit: "cover" });
    expect(sanitizeElementStyles("image", { objectFit: "stretchy" })).toEqual({});
  });

  it("rejects dangerous url/expression/javascript style strings", () => {
    expect(
      sanitizeElementStyles("text", {
        color: "url(javascript:alert(1))",
        fontFamily: "expression(evil)",
      }),
    ).toEqual({});
    expect(
      sanitizeElementStyles("shape", {
        fill: "javascript:alert(1)",
        borderColor: "rgb(0, 0, 0)",
      }),
    ).toEqual({ borderColor: "rgb(0, 0, 0)" });
  });

  it("requires finite numeric sizes", () => {
    expect(sanitizeElementStyles("text", { fontSize: Number.NaN })).toEqual({});
    expect(sanitizeElementStyles("shape", { borderWidth: Number.POSITIVE_INFINITY })).toEqual({});
    expect(sanitizeElementStyles("text", { fontSize: 32 })).toEqual({ fontSize: 32 });
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

  it("maps image crop styles to inner img without wrapper transform", () => {
    const css = toImageInnerStyles({
      objectFit: "cover",
      objectPosition: "30% 70%",
      cropScale: 1.5,
    });
    expect(css.objectFit).toBe("cover");
    expect(css.objectPosition).toBe("30% 70%");
    expect(css.transform).toBe("scale(1.5)");
    expect(css.transformOrigin).toBe("30% 70%");
  });

  it("maps image wrapper opacity and rounding", () => {
    const css = toCssProperties("image", {
      opacity: 0.4,
      borderRadius: 16,
    });
    expect(css.opacity).toBe(0.4);
    expect(css.borderRadius).toBe("16px");
    expect(css.overflow).toBe("hidden");
  });

  it("maps ellipse shapes to a circular border radius", () => {
    const css = toCssProperties("shape", {
      fill: "#0284c7",
      shapeKind: "ellipse",
      borderRadius: 8,
    });
    expect(css.backgroundColor).toBe("#0284c7");
    expect(css.borderRadius).toBe("50%");
  });
});
