import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { UnsplashPanel } from "./UnsplashPanel";

describe("UnsplashPanel", () => {
  it("shows configuration-required state without fake results", () => {
    render(
      <UnsplashPanel
        isConfigured={false}
        accessKey=""
        onAccessKeyChange={vi.fn()}
        onConfigure={vi.fn()}
      />,
    );

    expect(screen.getByText(/требуется настройка/i)).toBeInTheDocument();
    expect(screen.queryByRole("listitem")).not.toBeInTheDocument();
    expect(screen.queryByText(/unsplash.com\/photos/i)).not.toBeInTheDocument();
  });

  it("exposes access key field and configure callback", () => {
    const onAccessKeyChange = vi.fn();
    const onConfigure = vi.fn();

    render(
      <UnsplashPanel
        isConfigured={false}
        accessKey=""
        onAccessKeyChange={onAccessKeyChange}
        onConfigure={onConfigure}
      />,
    );

    const input = screen.getByLabelText(/ключ доступа unsplash/i);
    fireEvent.change(input, { target: { value: "demo-key" } });
    expect(onAccessKeyChange).toHaveBeenCalledWith("demo-key");

    fireEvent.click(screen.getByRole("button", { name: /сохранить ключ/i }));
    expect(onConfigure).toHaveBeenCalled();
  });
});
