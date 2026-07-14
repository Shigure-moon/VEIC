import { render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import App from "./App";

const getMock = vi.hoisted(() => vi.fn());
const postMock = vi.hoisted(() => vi.fn());

vi.mock("openapi-fetch", () => ({
  default: vi.fn(() => ({
    GET: getMock,
    POST: postMock,
  })),
}));

function ok<T>(data: T, status = 200) {
  return Promise.resolve({
    data,
    response: new Response(JSON.stringify(data), { status }),
  });
}

function fail(status: number, body: Record<string, unknown>) {
  return Promise.resolve({
    error: body,
    response: new Response(JSON.stringify(body), { status }),
  });
}

describe("App auth bootstrap smoke", () => {
  beforeEach(() => {
    getMock.mockReset();
    postMock.mockReset();
    vi.stubGlobal("fetch", vi.fn(async () => new Response("OK", { status: 200 })));
  });

  it("clears a restored token when /auth/me returns 401", async () => {
    sessionStorage.setItem("veic.runtime.sessionToken", "expired-token");
    localStorage.setItem("veic.runtime.cache", JSON.stringify({
      apiBaseUrl: "https://api.veic.tech",
      lastWorkspaceId: "workspace-1",
    }));

    getMock.mockImplementation((path: string) => {
      if (path === "/health/ready") {
        return ok({ status: "ready", database: "ok" });
      }
      if (path === "/api/v2/auth/me") {
        return fail(401, { code: "unauthorized", message: "expired token" });
      }
      return ok({});
    });

    render(<App />);

    await waitFor(() => {
      expect(sessionStorage.getItem("veic.runtime.sessionToken")).toBeNull();
    });

    expect(screen.getByRole("button", { name: "登录" })).toBeInTheDocument();
    expect(screen.queryByText("Logout")).not.toBeInTheDocument();
  });
});