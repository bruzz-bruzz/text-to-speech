import { V as Voice, a as VoicesManagerFind, b as VoicesManagerVoice } from './exceptions-CYMdhZkL.cjs';
export { C as CommunicateState, E as EdgeTTSException, N as NoAudioReceived, c as SkewAdjustmentError, S as SubMaker, T as TTSChunk, d as UnexpectedResponse, U as UnknownResponse, e as ValueError, f as VoiceTag, W as WebSocketError } from './exceptions-CYMdhZkL.cjs';

/**
 * Browser-compatible version of edge-tts Simple API
 * Uses native browser APIs instead of Node.js dependencies
 */
/**
 * Options for controlling the voice prosody (rate, pitch, volume).
 */
interface ProsodyOptions$1 {
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
interface WordBoundary$1 {
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
interface SynthesisResult$1 {
    /**
     * The generated audio as a Blob, which can be used in an <audio> element.
     */
    audio: Blob;
    /**
     * An array of word boundaries containing timing and text for creating subtitles.
     */
    subtitle: WordBoundary$1[];
}
/**
 * Browser-compatible Edge TTS class that uses native browser APIs.
 *
 * @remarks This uses an undocumented Microsoft API. CORS policy may prevent
 * direct usage from web apps. Consider using a proxy server.
 */
declare class EdgeTTSBrowser {
    text: string;
    voice: string;
    rate: string;
    volume: string;
    pitch: string;
    private ws;
    /**
     * @param text The text to be synthesized.
     * @param voice The voice to use for synthesis.
     * @param options Prosody options (rate, volume, pitch).
     */
    constructor(text: string, voice?: string, options?: ProsodyOptions$1);
    /**
     * Initiates the synthesis process.
     * @returns A promise that resolves with the synthesized audio and subtitle data.
     */
    synthesize(): Promise<SynthesisResult$1>;
    /**
     * Establishes a connection to the WebSocket server.
     */
    private connect;
    /**
     * Parses a string message from the WebSocket into headers and a body.
     */
    private parseMessage;
    /**
     * Creates the speech configuration message.
     */
    private createSpeechConfig;
    /**
     * Creates the SSML (Speech Synthesis Markup Language) message.
     */
    private createSSML;
    private generateConnectionId;
    private getTimestamp;
    private escapeXml;
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
 * Browser-specific Edge TTS class that uses only browser-native APIs.
 * Avoids any Node.js dependencies that could cause issues in browser environments.
 */
declare class BrowserEdgeTTS {
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
     * Initiates the synthesis process using browser-native APIs.
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

type BrowserTTSChunk = {
    type: "audio" | "WordBoundary" | "SentenceBoundary";
    data?: Uint8Array;
    duration?: number;
    offset?: number;
    text?: string;
};
/**
 * Configuration options for the browser Communicate class.
 */
interface BrowserCommunicateOptions {
    /** Voice to use for synthesis (e.g., "en-US-EmmaMultilingualNeural") */
    voice?: string;
    /** Speech rate adjustment (e.g., "+20%", "-10%") */
    rate?: string;
    /** Volume level adjustment (e.g., "+50%", "-25%") */
    volume?: string;
    /** Pitch adjustment in Hz (e.g., "+5Hz", "-10Hz") */
    pitch?: string;
    /** WebSocket connection timeout in milliseconds */
    connectionTimeout?: number;
}
/**
 * Browser-specific Communicate class that uses only browser-native APIs.
 * Uses native WebSocket and Web Crypto API, avoiding any Node.js dependencies.
 *
 * @example
 * ```typescript
 * const communicate = new BrowserCommunicate('Hello, world!', {
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
declare class BrowserCommunicate {
    private readonly ttsConfig;
    private readonly texts;
    private readonly connectionTimeout?;
    private state;
    /**
     * Creates a new browser Communicate instance for text-to-speech synthesis.
     *
     * @param text - The text to synthesize
     * @param options - Configuration options for synthesis
     */
    constructor(text: string, options?: BrowserCommunicateOptions);
    private parseMetadata;
    private _stream;
    /**
     * Streams text-to-speech synthesis results using native browser WebSocket.
     * Uses only browser-native APIs, avoiding Node.js dependencies.
     *
     * @yields BrowserTTSChunk - Audio data or word boundary information
     * @throws {Error} If called more than once
     * @throws {NoAudioReceived} If no audio data is received
     * @throws {WebSocketError} If WebSocket connection fails
     */
    stream(): AsyncGenerator<BrowserTTSChunk, void, unknown>;
}

/**
 * Error class for fetch-related errors (browser-specific)
 */
declare class BrowserFetchError extends Error {
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
 * Fetches all available voices from the Microsoft Edge TTS service (browser version).
 * Uses native browser fetch API and Web Crypto.
 *
 * @returns Promise resolving to array of available voices
 */
declare function listVoices(): Promise<Voice[]>;
/**
 * Browser-specific utility class for finding and filtering available voices.
 * Uses only browser-native APIs.
 *
 * @example
 * ```typescript
 * const voicesManager = await BrowserVoicesManager.create();
 * const englishVoices = voicesManager.find({ Language: 'en' });
 * ```
 */
declare class BrowserVoicesManager {
    private voices;
    private calledCreate;
    /**
     * Creates a new BrowserVoicesManager instance.
     *
     * @param customVoices - Optional custom voice list instead of fetching from API
     * @returns Promise resolving to BrowserVoicesManager instance
     */
    static create(customVoices?: Voice[]): Promise<BrowserVoicesManager>;
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
 * Browser-specific DRM class that uses only Web APIs.
 * Uses the Web Crypto API instead of Node.js crypto module.
 */
declare class BrowserDRM {
    private static clockSkewSeconds;
    static adjClockSkewSeconds(skewSeconds: number): void;
    static getUnixTimestamp(): number;
    static parseRfc2616Date(date: string): number | null;
    static handleClientResponseError(response: {
        status: number;
        headers: Record<string, string>;
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

export { BrowserCommunicate as Communicate, type BrowserCommunicateOptions as CommunicateOptions, BrowserDRM as DRM, BrowserEdgeTTS as EdgeTTS, EdgeTTSBrowser, BrowserFetchError as FetchError, type ProsodyOptions, type SynthesisResult, Voice, BrowserVoicesManager as VoicesManager, VoicesManagerFind, VoicesManagerVoice, type WordBoundary, createSRT, createVTT, listVoices };
