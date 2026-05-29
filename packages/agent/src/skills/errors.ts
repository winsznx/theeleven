import type { Address, Hex } from "viem";

export class SkillError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SkillError";
  }
}

export class HookMinerExhaustedError extends SkillError {
  readonly iterations: bigint;
  readonly targetBitmap: number;
  constructor(opts: { iterations: bigint; targetBitmap: number }) {
    super(
      `HookMiner: exhausted ${opts.iterations.toString()} iterations without finding a salt for bitmap 0x${opts.targetBitmap.toString(16)}`
    );
    this.name = "HookMinerExhaustedError";
    this.iterations = opts.iterations;
    this.targetBitmap = opts.targetBitmap;
  }
}

export class WrongChainError extends SkillError {
  readonly expected: number;
  readonly actual: number;
  constructor(opts: { expected: number; actual: number }) {
    super(`WrongChain: expected ${opts.expected}, got ${opts.actual}`);
    this.name = "WrongChainError";
    this.expected = opts.expected;
    this.actual = opts.actual;
  }
}

export class AgentNotRegisteredError extends SkillError {
  readonly agent: Address;
  readonly factory: Address;
  constructor(opts: { agent: Address; factory: Address }) {
    super(`Agent ${opts.agent} not registered with factory ${opts.factory}`);
    this.name = "AgentNotRegisteredError";
    this.agent = opts.agent;
    this.factory = opts.factory;
  }
}

export class FactoryNotDeployedError extends SkillError {
  readonly factory: Address;
  constructor(factory: Address) {
    super(`Factory ${factory} has no bytecode at this address`);
    this.name = "FactoryNotDeployedError";
    this.factory = factory;
  }
}

export interface RevertedReceiptShape {
  txHash: Hex;
  blockNumber: bigint;
  gasUsed: bigint;
}

export class TransactionRevertedError extends SkillError {
  readonly receipt: RevertedReceiptShape;
  constructor(receipt: RevertedReceiptShape) {
    super(`Transaction reverted: tx=${receipt.txHash} block=${receipt.blockNumber}`);
    this.name = "TransactionRevertedError";
    this.receipt = receipt;
  }
}
