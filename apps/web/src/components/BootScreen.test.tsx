import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import axe from "axe-core";
import { afterEach, describe, expect, it, vi } from "vitest";
import { BootScreen } from "./BootScreen";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe("BootScreen", () => {
  it("wakes the API and reports it", async () => {
    const fetch = vi.fn(() => Promise.resolve(new Response("{}", { status: 200 })));
    vi.stubGlobal("fetch", fetch);
    render(<BootScreen onDone={() => undefined} />);
    expect(fetch).toHaveBeenCalledWith(expect.stringMatching(/\/health$/), expect.anything());
    expect(await screen.findByText(/Archive online/)).toBeTruthy();
  });

  it("is accessible (structure; contrast is checked in a real browser)", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() => new Promise(() => undefined)),
    );
    const { container } = render(<BootScreen onDone={() => undefined} />);
    const result = await axe.run(container, {
      rules: { "color-contrast": { enabled: false }, region: { enabled: false } },
    });
    expect(result.violations.map((v) => v.id)).toEqual([]);
  });

  it("lets the reader skip with any key", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() => new Promise(() => undefined)),
    );
    const onDone = vi.fn();
    render(<BootScreen onDone={onDone} />);
    fireEvent.keyDown(window, { key: "Enter" });
    await waitFor(() => {
      expect(onDone).toHaveBeenCalledOnce();
    });
  });

  it("doesn't wait forever for a sleeping API", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    vi.stubGlobal(
      "fetch",
      vi.fn(
        (_url: string, init: RequestInit) =>
          new Promise((_resolve, reject) => {
            init.signal?.addEventListener("abort", () => {
              reject(new DOMException("aborted", "AbortError"));
            });
          }),
      ),
    );
    const onDone = vi.fn();
    render(<BootScreen onDone={onDone} />);
    await vi.advanceTimersByTimeAsync(6500);
    await waitFor(() => {
      expect(onDone).toHaveBeenCalledOnce();
    });
  });
});
