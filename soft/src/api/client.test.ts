import { describe, expect, it, vi, beforeEach } from "vitest";
import createClient from "openapi-fetch";
import {
  VeicApiError,
  createVeicApiClient,
} from "./client";
import { secureGetToken, secureSetToken } from "../tauri";

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

describe("VeicApiClient smoke", () => {
  beforeEach(() => {
    getMock.mockReset();
    postMock.mockReset();
    vi.mocked(createClient).mockClear();
  });

  it("loads workspaces from GET /workspaces", async () => {
    const workspaces = [
      { id: "workspace-1", name: "My Home", networkId: "public/home", status: "active" },
    ];
    getMock.mockReturnValueOnce(ok(workspaces));

    const api = createVeicApiClient({ baseUrl: "https://api.veic.tech", token: "token-1" });
    await expect(api.listWorkspaces()).resolves.toEqual(workspaces);

    expect(getMock).toHaveBeenCalledWith("/api/v2/workspaces", {
      headers: { Authorization: "Bearer token-1" },
    });
  });

  it("loads workspace state with resources, members and sessions arrays", async () => {
    const state = {
      workspace: { id: "workspace-1", name: "My Home" },
      members: [{ id: "member-1", displayName: "Admin", role: "admin" }],
      resources: [{ id: "resource-1", name: "Vacuum", resourceType: "vacuum" }],
      sessions: [{ session: { id: "session-1", status: "active" }, connections: [] }],
      observations: [],
      currentRevision: 12,
    };
    getMock.mockReturnValueOnce(ok(state));

    const api = createVeicApiClient({ baseUrl: "https://api.veic.tech", token: "token-1" });
    const result = await api.getWorkspaceState("workspace-1");

    expect(Array.isArray(result.resources)).toBe(true);
    expect(Array.isArray(result.members)).toBe(true);
    expect(Array.isArray(result.sessions)).toBe(true);
    expect(result.resources?.[0]?.id).toBe("resource-1");
    expect(getMock).toHaveBeenCalledWith("/api/v2/workspaces/{workspaceId}/state", {
      headers: { Authorization: "Bearer token-1" },
      params: { path: { workspaceId: "workspace-1" }, query: { recentObservations: 20 } },
    });
  });

  it("loads capability provider policies for command precheck", async () => {
    const policies = [
      {
        provider: "mcp",
        status: "enabled",
        allowedRoles: ["owner", "admin"],
        maxRiskLevel: "medium",
        requireSession: true,
        source: "stored",
      },
    ];
    getMock.mockReturnValueOnce(ok(policies));

    const api = createVeicApiClient({ baseUrl: "https://api.veic.tech", token: "token-1" });
    await expect(api.listCapabilityProviderPolicies("workspace-1")).resolves.toEqual(policies);

    expect(getMock).toHaveBeenCalledWith("/api/v2/workspaces/{workspaceId}/policies/providers", {
      headers: { Authorization: "Bearer token-1" },
      params: { path: { workspaceId: "workspace-1" } },
    });
  });

  it("writes the registration token after POST /auth/register returns 201", async () => {
    const authResponse = {
      token: "registered-token",
      user: { id: "user-1", email: "student@example.com", username: "student" },
    };
    postMock.mockReturnValueOnce(ok(authResponse, 201));

    const api = createVeicApiClient({ baseUrl: "https://api.veic.tech" });
    const result = await api.register({
      email: "student@example.com",
      username: "student",
      password: "secure-password-123",
    }) as { token?: string };
    await secureSetToken(result.token || "");

    await expect(secureGetToken()).resolves.toBe("registered-token");
    expect(postMock).toHaveBeenCalledWith("/api/v2/auth/register", {
      body: {
        email: "student@example.com",
        username: "student",
        password: "secure-password-123",
      },
    });
  });

  it("surfaces 401 API responses as VeicApiError", async () => {
    getMock.mockReturnValueOnce(fail(401, { code: "unauthorized", message: "expired token" }));
    const api = createVeicApiClient({ baseUrl: "https://api.veic.tech", token: "expired" });

    await expect(api.me()).rejects.toMatchObject({
      status: 401,
      code: "unauthorized",
      message: "expired token",
    });
  });
});
