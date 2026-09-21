import { describe, expect, it } from "vitest";
import { createDefaultAuthFlowConfig } from "@/modules/auth-config";
import type { ApplicationClient, ApplicationClientStore } from "./contracts";
import { ApplicationClientOriginError, ApplicationClientService } from "./service";

class MemoryStore implements ApplicationClientStore {
  clients: ApplicationClient[] = [];
  async create(input: Omit<ApplicationClient, "id" | "createdAt" | "updatedAt"> & { ownerId: string }) {
    const client = { ...input, id: crypto.randomUUID(), createdAt: new Date(), updatedAt: new Date() };
    this.clients.push(client);
    return client;
  }
  async list(_ownerId: string, projectId: string) { return this.clients.filter((client) => client.projectId === projectId); }
  async remove(_ownerId: string, _projectId: string, id: string) { const before = this.clients.length; this.clients = this.clients.filter((client) => client.id !== id); return before !== this.clients.length; }
  async getPublic(clientId: string) {
    const client = this.clients.find((item) => item.clientId === clientId);
    return client ? { ...client, config: createDefaultAuthFlowConfig({ appName: "Example", accountType: "Customer" }), projectActive: true } : null;
  }
}

describe("ApplicationClientService", () => {
  it("creates normalized public clients without secrets", async () => {
    const service = new ApplicationClientService(new MemoryStore());
    const projectId = crypto.randomUUID();
    const client = await service.create("owner", projectId, { name: "Java API", redirectUris: ["https://app.example/callback"], allowedOrigins: ["https://app.example/"] });
    expect(client.clientId).toMatch(/^af_pk_/);
    expect(client.allowedOrigins).toEqual(["https://app.example"]);
    expect(client).not.toHaveProperty("secret");
  });

  it("rejects insecure non-local redirect URIs", async () => {
    const service = new ApplicationClientService(new MemoryStore());
    await expect(service.create("owner", crypto.randomUUID(), { name: "Unsafe", redirectUris: ["http://app.example/callback"], allowedOrigins: ["http://app.example"] })).rejects.toThrow();
  });

  it("enforces exact browser origins and exposes portable endpoints", async () => {
    const service = new ApplicationClientService(new MemoryStore());
    const client = await service.create("owner", crypto.randomUUID(), { name: "React", redirectUris: ["https://app.example/callback"], allowedOrigins: ["https://app.example"] });
    const result = await service.getPublic(client.clientId, "https://app.example", "https://auth.example");
    expect(result.endpoints.signIn).toContain("/api/runtime/projects/");
    await expect(service.getPublic(client.clientId, "https://evil.example", "https://auth.example")).rejects.toBeInstanceOf(ApplicationClientOriginError);
  });
});
