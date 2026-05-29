import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";

import HomePage from "@/app/page";

describe("homepage smoke", () => {
  it("renders the display headline", () => {
    render(<HomePage />);
    expect(
      screen.getByRole("heading", { level: 1, name: /live football prop markets/i })
    ).toBeInTheDocument();
  });

  it("renders the View Markets CTA (P18 — wallet now lives only on dApp routes)", () => {
    render(<HomePage />);
    const cta = screen.getByRole("link", { name: /view markets/i });
    expect(cta).toBeInTheDocument();
    expect(cta).toHaveAttribute("href", "/markets");
  });

  it("renders the footer copyright + MIT note", () => {
    render(<HomePage />);
    expect(screen.getByText(/© 2026 Regista 11\./i)).toBeInTheDocument();
    expect(screen.getByText(/MIT License/i)).toBeInTheDocument();
  });

  it("renders the StatBar (S2) above the remaining sections", () => {
    render(<HomePage />);
    expect(screen.getByLabelText(/live protocol stats/i)).toBeInTheDocument();
    expect(screen.getByText(/total markets/i)).toBeInTheDocument();
  });

  it("renders all P15 landing sections (S3-S7 headings)", () => {
    render(<HomePage />);
    expect(screen.getByRole("heading", { level: 2, name: /^live markets$/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 2, name: /^how it works$/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 2, name: /^the eleven$/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 2, name: /^the stack$/i })).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { level: 2, name: /watch the eleven during the 2026 tournament/i }),
    ).toBeInTheDocument();
  });
});
