import {
  decodeAbiParameters,
  encodeAbiParameters,
  parseAbiParameters,
  type Hex,
} from "viem";

import type { Template } from "./types.js";
import type { TemplateRegistry } from "./registry.js";

const ENVELOPE_TYPES = parseAbiParameters("bytes32, bytes");

/**
 * Wrap a template's encoded payload in the canonical envelope:
 *   abi.encode(bytes32 templateId, bytes templatePayload)
 *
 * The result is exactly what gets passed to PropMarketHook.reveal as
 * revealedParams + baked into commitHash before that.
 */
export function buildRevealedParams<TParams>(args: {
  template: Template<TParams>;
  params: TParams;
}): Hex {
  const templatePayload = args.template.encodeParams(args.params);
  return encodeAbiParameters(ENVELOPE_TYPES, [args.template.id, templatePayload]);
}

export interface ParsedRevealedParams {
  templateId: Hex;
  template: Template<unknown> | null;
  decodedParams: unknown | null;
}

/**
 * Inverse of buildRevealedParams. Looks up the template in the registry;
 * if not present, `template` and `decodedParams` are null but `templateId`
 * is still returned so the caller can log unknown-template events.
 */
export function parseRevealedParams(args: {
  encoded: Hex;
  registry: TemplateRegistry;
}): ParsedRevealedParams {
  const [templateId, payload] = decodeAbiParameters(ENVELOPE_TYPES, args.encoded);
  const template = args.registry.get(templateId);
  return {
    templateId,
    template,
    decodedParams: template ? template.decodeParams(payload) : null,
  };
}
