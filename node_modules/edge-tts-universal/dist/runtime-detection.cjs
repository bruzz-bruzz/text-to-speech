'use strict';

var __require = /* @__PURE__ */ ((x) => typeof require !== "undefined" ? require : typeof Proxy !== "undefined" ? new Proxy(x, {
  get: (a, b) => (typeof require !== "undefined" ? require : a)[b]
}) : x)(function(x) {
  if (typeof require !== "undefined") return require.apply(this, arguments);
  throw Error('Dynamic require of "' + x + '" is not supported');
});

// src/runtime-detection.ts
function detectRuntime() {
  const info = {
    name: "unknown",
    isNode: false,
    isDeno: false,
    isBun: false,
    isBrowser: false,
    isWebWorker: false
  };
  if (typeof globalThis.Deno !== "undefined") {
    info.name = "deno";
    info.isDeno = true;
    info.version = globalThis.Deno.version?.deno;
    return info;
  }
  if (typeof globalThis.Bun !== "undefined") {
    info.name = "bun";
    info.isBun = true;
    info.version = globalThis.Bun.version;
    return info;
  }
  if (typeof process !== "undefined" && process.versions && process.versions.node) {
    info.name = "node";
    info.isNode = true;
    info.version = process.versions.node;
    return info;
  }
  if (typeof globalThis.importScripts === "function" && typeof globalThis.WorkerGlobalScope !== "undefined") {
    info.name = "webworker";
    info.isWebWorker = true;
    return info;
  }
  if (typeof window !== "undefined") {
    info.name = "browser";
    info.isBrowser = true;
    return info;
  }
  return info;
}
function getFetch() {
  const runtime = detectRuntime();
  if (runtime.isDeno || runtime.isBrowser || runtime.isWebWorker) {
    return globalThis.fetch;
  }
  if (runtime.isNode || runtime.isBun) {
    try {
      if (typeof globalThis.fetch !== "undefined") {
        return globalThis.fetch;
      }
      return __require("cross-fetch");
    } catch {
      throw new Error("No fetch implementation available. Please install cross-fetch.");
    }
  }
  throw new Error("Unsupported runtime environment");
}
function getWebSocket() {
  const runtime = detectRuntime();
  if (runtime.isDeno || runtime.isBrowser || runtime.isWebWorker) {
    return globalThis.WebSocket;
  }
  if (runtime.isNode || runtime.isBun) {
    try {
      return __require("isomorphic-ws");
    } catch {
      throw new Error("No WebSocket implementation available. Please install isomorphic-ws.");
    }
  }
  throw new Error("Unsupported runtime environment");
}
function getCrypto() {
  const runtime = detectRuntime();
  if (runtime.isDeno || runtime.isBrowser || runtime.isWebWorker) {
    return globalThis.crypto;
  }
  if (runtime.isNode || runtime.isBun) {
    if (typeof globalThis.crypto !== "undefined") {
      return globalThis.crypto;
    }
    throw new Error("No crypto implementation available. Please upgrade to Node.js 18.17+.");
  }
  throw new Error("Unsupported runtime environment");
}

exports.detectRuntime = detectRuntime;
exports.getCrypto = getCrypto;
exports.getFetch = getFetch;
exports.getWebSocket = getWebSocket;
//# sourceMappingURL=runtime-detection.cjs.map
//# sourceMappingURL=runtime-detection.cjs.map