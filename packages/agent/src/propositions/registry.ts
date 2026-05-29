import type { Hex } from "viem";
import type { Template } from "./types.js";

export class TemplateRegistry {
  private readonly byId = new Map<Hex, Template<unknown>>();

  register<T>(t: Template<T>): void {
    if (this.byId.has(t.id)) {
      throw new Error(`Duplicate templateId ${t.id} (${t.name})`);
    }
    this.byId.set(t.id, t as Template<unknown>);
  }

  get(id: Hex): Template<unknown> | null {
    return this.byId.get(id) ?? null;
  }

  all(): Template<unknown>[] {
    return Array.from(this.byId.values());
  }

  /** Test-only escape hatch. */
  clear(): void {
    this.byId.clear();
  }
}

/** Default singleton populated by side-effects in src/propositions/index.ts. */
export const templateRegistry = new TemplateRegistry();
