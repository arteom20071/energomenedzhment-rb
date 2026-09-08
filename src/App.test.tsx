import { render, screen } from "@testing-library/react";

import { App } from "./App";

describe("App", () => {
  it("renders the editor scaffold", () => {
    render(<App />);

    expect(
      screen.getByRole("heading", { name: "Presentation editor scaffold" }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Canvas workspace")).toBeInTheDocument();
    expect(screen.getByLabelText("Slides")).toBeInTheDocument();
    expect(screen.getByLabelText("Inspector")).toBeInTheDocument();
  });
});
