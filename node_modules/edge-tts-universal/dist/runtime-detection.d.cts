/**
 * Runtime detection utilities for cross-platform compatibility
 */
interface RuntimeInfo {
    name: 'node' | 'deno' | 'bun' | 'browser' | 'webworker' | 'unknown';
    version?: string;
    isNode: boolean;
    isDeno: boolean;
    isBun: boolean;
    isBrowser: boolean;
    isWebWorker: boolean;
}
/**
 * Detect the current JavaScript runtime environment
 */
declare function detectRuntime(): RuntimeInfo;
/**
 * Get the appropriate fetch implementation for the current runtime
 */
declare function getFetch(): typeof fetch;
/**
 * Get the appropriate WebSocket implementation for the current runtime
 */
declare function getWebSocket(): any;
/**
 * Get runtime-specific crypto implementation
 * Note: Node.js 16+ (and our minimum version of 18.17+) has native globalThis.crypto support
 */
declare function getCrypto(): Crypto;

export { type RuntimeInfo, detectRuntime, getCrypto, getFetch, getWebSocket };
