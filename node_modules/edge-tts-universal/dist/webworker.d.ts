import { V as Voice, a as VoicesManagerFind, b as VoicesManagerVoice } from './exceptions-CYMdhZkL.js';
export { C as CommunicateState, E as EdgeTTSException, N as NoAudioReceived, c as SkewAdjustmentError, S as SubMaker, T as TTSChunk, d as UnexpectedResponse, U as UnknownResponse, e as ValueError, f as VoiceTag, W as WebSocketError } from './exceptions-CYMdhZkL.js';

interface IsomorphicTTSChunk {
    type: "audio" | "WordBoundary" | "SentenceBoundary";
    data?: Uint8Array;
    duration?: number;
    offset?: number;
    text?: string;
}
/**
 * Configuration options for the isomorphic Communicate class.
 */
interface IsomorphicCommunicateOptions {
    /** Voice to use for synthesis (e.g., "en-US-EmmaMultilingualNeural") */
    voice?: string;
    /** Speech rate adjustment (e.g., "+20%", "-10%") */
    rate?: string;
    /** Volume level adjustment (e.g., "+50%", "-25%") */
    volume?: string;
    /** Pitch adjustment in Hz (e.g., "+5Hz", "-10Hz") */
    pitch?: string;
    /** Proxy URL for requests (Node.js only) */
    proxy?: string;
    /** WebSocket connection timeout in milliseconds */
    connectionTimeout?: number;
}
/**
 * Isomorphic Communicate class that works in both Node.js and browsers.
 * Uses isomorphic packages to provide consistent functionality across environments.
 *
 * @example
 * ```typescript
 * // Works in both Node.js and browsers (with CORS considerations)
 * const communicate = new IsomorphicCommunicate('Hello, world!', {
 *   voice: 'en-US-EmmaMultilingualNeural',
 * });
 *
 * for await (const chunk of communicate.stream()) {
 *   if (chunk.type === 'audio' && chunk.data) {
 *     // Handle audio data
 *   }
 * }
 * ```
 */
declare class IsomorphicCommunicate {
    private readonly ttsConfig;
    private readonly texts;
    private state;
    /**
     * Creates a new isomorphic Communicate instance for text-to-speech synthesis.
     *
     * @param text - The text to synthesize
     * @param options - Configuration options for synthesis
     */
    constructor(text: string, options?: IsomorphicCommunicateOptions);
    private parseMetadata;
    private createWebSocket;
    private _stream;
    /**
     * Streams text-to-speech synthesis results using isomorphic WebSocket.
     * Works in both Node.js and browsers (subject to CORS policy).
     *
     * @yields TTSChunk - Audio data or word boundary information
     * @throws {Error} If called more than once
     * @throws {NoAudioReceived} If no audio data is received
     * @throws {WebSocketError} If WebSocket connection fails
     */
    stream(): AsyncGenerator<IsomorphicTTSChunk, void, unknown>;
}

/**
 * Error class for fetch-related errors (isomorphic equivalent of AxiosError)
 */
declare class FetchError extends Error {
    response?: {
        status: number;
        headers: Record<string, string>;
    };
    constructor(message: string, response?: {
        status: number;
        headers: Record<string, string>;
    });
}
/**
 * Fetches all available voices from the Microsoft Edge TTS service (isomorphic version).
 * Works in both Node.js and browsers (subject to CORS policy).
 *
 * @param proxy - Optional proxy URL for the request (limited browser support)
 * @returns Promise resolving to array of available voices
 */
declare function listVoices(proxy?: string): Promise<Voice[]>;
/**
 * Isomorphic utility class for finding and filtering available voices.
 * Works in both Node.js and browsers (subject to CORS policy).
 *
 * @example
 * ```typescript
 * const voicesManager = await IsomorphicVoicesManager.create();
 * const englishVoices = voicesManager.find({ Language: 'en' });
 * ```
 */
declare class IsomorphicVoicesManager {
    private voices;
    private calledCreate;
    /**
     * Creates a new IsomorphicVoicesManager instance.
     *
     * @param customVoices - Optional custom voice list instead of fetching from API
     * @param proxy - Optional proxy URL for API requests (limited browser support)
     * @returns Promise resolving to IsomorphicVoicesManager instance
     */
    static create(customVoices?: Voice[], proxy?: string): Promise<IsomorphicVoicesManager>;
    /**
     * Finds voices matching the specified criteria.
     *
     * @param filter - Filter criteria for voice selection
     * @returns Array of voices matching the filter
     * @throws {Error} If called before create()
     */
    find(filter: VoicesManagerFind): VoicesManagerVoice[];
}

/**
 * Isomorphic DRM class that works in both Node.js and browsers.
 * Uses appropriate crypto APIs based on the environment.
 */
declare class IsomorphicDRM {
    private static clockSkewSeconds;
    static adjClockSkewSeconds(skewSeconds: number): void;
    static getUnixTimestamp(): number;
    static parseRfc2616Date(date: string): number | null;
    static handleClientResponseError(response: {
        status: number;
        headers: any;
    }): void;
    static generateSecMsGec(): Promise<string>;
    /**
     * Generates a random MUID (Machine Unique Identifier).
     * @returns Uppercase 32-character hex string
     */
    static generateMuid(): string;
    /**
     * Returns a copy of the given headers with a MUID cookie added.
     * @param headers - The original headers
     * @returns New headers object with Cookie header containing the MUID
     */
    static headersWithMuid(headers: Record<string, string>): Record<string, string>;
}

/**
 * Options for controlling the voice prosody (rate, pitch, volume).
 */
interface ProsodyOptions {
    /**
     * The speaking rate of the voice.
     * Examples: "+10.00%", "-20.00%"
     */
    rate?: string;
    /**
     * The speaking volume of the voice.
     * Examples: "+15.00%", "-10.00%"
     */
    volume?: string;
    /**
     * The speaking pitch of the voice.
     * Examples: "+20Hz", "-10Hz"
     */
    pitch?: string;
}
/**
 * Represents a single word boundary with its timing and text.
 * The API provides timing in 100-nanosecond units.
 */
interface WordBoundary {
    /**
     * The offset from the beginning of the audio stream in 100-nanosecond units.
     */
    offset: number;
    /**
     * The duration of the word in 100-nanosecond units.
     */
    duration: number;
    /**
     * The text of the spoken word.
     */
    text: string;
}
/**
 * The final result of the synthesis process.
 */
interface SynthesisResult {
    /**
     * The generated audio as a Blob, which can be used in an <audio> element.
     */
    audio: Blob;
    /**
     * An array of word boundaries containing timing and text for creating subtitles.
     */
    subtitle: WordBoundary[];
}
/**
 * Isomorphic Edge TTS class that works in both Node.js and browser environments.
 * Uses isomorphic implementations to avoid platform-specific dependencies.
 */
declare class IsomorphicEdgeTTS {
    text: string;
    voice: string;
    rate: string;
    volume: string;
    pitch: string;
    /**
     * @param text The text to be synthesized.
     * @param voice The voice to use for synthesis.
     * @param options Prosody options (rate, volume, pitch).
     */
    constructor(text: string, voice?: string, options?: ProsodyOptions);
    /**
     * Initiates the synthesis process using isomorphic implementations.
     * @returns A promise that resolves with the synthesized audio and subtitle data.
     */
    synthesize(): Promise<SynthesisResult>;
}
/**
 * Creates a subtitle file content in VTT (WebVTT) format.
 * @param wordBoundaries The array of word boundary data.
 * @returns A string containing the VTT formatted subtitles.
 */
declare function createVTT(wordBoundaries: WordBoundary[]): string;
/**
 * Creates a subtitle file content in SRT (SubRip) format.
 * @param wordBoundaries The array of word boundary data.
 * @returns A string containing the SRT formatted subtitles.
 */
declare function createSRT(wordBoundaries: WordBoundary[]): string;

/**
 * Web Worker entry point for edge-tts-universal.
 *
 * This module exports APIs specifically designed for Web Worker environments, providing
 * text-to-speech functionality that works in background threads without blocking the main UI.
 *
 * Key features:
 * - Web Worker compatibility
 * - No DOM dependencies
 * - Background processing capabilities
 * - Message passing utilities for TTS results
 * - Isomorphic APIs that work in worker contexts
 *
 * Web Workers provide an ideal environment for TTS processing as they:
 * - Don't block the main UI thread
 * - Have access to fetch and WebSocket APIs
 * - Can handle large audio data without freezing the page
 * - Support streaming TTS processing
 *
 * @example
 * ```typescript
 * // In a Web Worker file
 * import { EdgeTTS, postAudioMessage, isWebWorker } from '@edge-tts/universal/webworker';
 *
 * if (isWebWorker()) {
 *   self.addEventListener('message', async (event) => {
 *     if (event.data.type === 'synthesize') {
 *       const tts = new EdgeTTS(event.data.text, event.data.voice);
 *       const result = await tts.synthesize();
 *       postAudioMessage(result.audio, result.subtitle);
 *     }
 *   });
 * }
 * ```
 *
 * @module WebWorkerEntry
 */

/**
 * Detects if the current environment is a Web Worker.
 *
 * @returns True if running in a Web Worker context, false otherwise
 */
declare function isWebWorker(): boolean;
/**
 * Posts a TTS result message to the main thread from a Web Worker.
 * This is a convenience function for sending audio and subtitle data
 * back to the main thread after TTS processing is complete.
 *
 * @param audio - The synthesized audio as a Blob
 * @param subtitle - Array of subtitle/word boundary data
 * @throws {Warning} Logs a warning if called outside Web Worker context
 */
declare function postAudioMessage(audio: Blob, subtitle: any[]): void;

export { IsomorphicCommunicate as Communicate, type IsomorphicCommunicateOptions as CommunicateOptions, IsomorphicDRM as DRM, IsomorphicEdgeTTS as EdgeTTS, FetchError, type ProsodyOptions, type SynthesisResult, Voice, IsomorphicVoicesManager as VoicesManager, VoicesManagerFind, VoicesManagerVoice, type WordBoundary, createSRT, createVTT, isWebWorker, listVoices, postAudioMessage };
