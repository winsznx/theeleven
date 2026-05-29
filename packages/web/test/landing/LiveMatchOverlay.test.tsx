import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";

import {
  LiveMatchOverlay,
  type LiveMatch,
} from "@/components/landing/pitch/LiveMatchOverlay";

const SAMPLE_MATCH: LiveMatch = {
  home: { name: "CRYSTAL PALACE", score: 1 },
  away: { name: "RAYO VALLECANO", score: 1 },
  minute: 67,
  period: "2H",
};

describe("LiveMatchOverlay", () => {
  it("null-renders when match=null (no banner above the pitch)", () => {
    const { container } = render(<LiveMatchOverlay match={null} />);
    expect(container.firstChild).toBeNull();
  });

  it("renders home name, away name, scores, minute, and period when match provided", () => {
    render(<LiveMatchOverlay match={SAMPLE_MATCH} />);
    expect(screen.getByText("CRYSTAL PALACE")).toBeInTheDocument();
    expect(screen.getByText("RAYO VALLECANO")).toBeInTheDocument();
    const scores = screen.getAllByText("1");
    expect(scores.length).toBeGreaterThanOrEqual(2);
    expect(screen.getByText(/67' · 2H/i)).toBeInTheDocument();
  });

  it("renders the LIVE eyebrow chip when match is bound", () => {
    render(<LiveMatchOverlay match={SAMPLE_MATCH} />);
    expect(screen.getByText(/^live$/i)).toBeInTheDocument();
  });
});
