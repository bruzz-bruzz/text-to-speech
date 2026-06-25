/**
 * Represents a chunk of data received during TTS streaming.
 * Can contain either audio data or word boundary metadata.
 */
type TTSChunk = {
    /** The type of chunk - either audio data or word boundary metadata */
    type: "audio" | "WordBoundary" | "SentenceBoundary";
    /** Raw audio data buffer (present for audio chunks) */
    data?: Buffer;
    /** Duration of the word in 100-nanosecond units (present for WordBoundary chunks) */
    duration?: number;
    /** Offset from the beginning in 100-nanosecond units (present for WordBoundary chunks) */
    offset?: number;
    /** The spoken text (present for WordBoundary chunks) */
    text?: string;
};
/**
 * Voice characteristics and personality tags from the Microsoft Edge TTS service.
 */
type VoiceTag = {
    /** Content categories that the voice is optimized for */
    ContentCategories: ("Cartoon" | "Conversation" | "Copilot" | "Dialect" | "General" | "News" | "Novel" | "Sports")[];
    /** Personality traits that describe the voice's characteristics */
    VoicePersonalities: ("Approachable" | "Authentic" | "Authority" | "Bright" | "Caring" | "Casual" | "Cheerful" | "Clear" | "Comfort" | "Confident" | "Considerate" | "Conversational" | "Cute" | "Expressive" | "Friendly" | "Honest" | "Humorous" | "Lively" | "Passion" | "Pleasant" | "Positive" | "Professional" | "Rational" | "Reliable" | "Sincere" | "Sunshine" | "Warm")[];
};
/**
 * Complete voice definition as returned by the Microsoft Edge TTS service.
 */
type Voice = {
    /** Full voice name identifier */
    Name: string;
    /** Short name for the voice */
    ShortName: string;
    /** Gender of the voice */
    Gender: "Female" | "Male";
    /** Locale code (e.g., "en-US", "zh-CN") */
    Locale: string;
    /** Recommended audio codec for this voice */
    SuggestedCodec: "audio-24khz-48kbitrate-mono-mp3";
    /** Human-readable friendly name */
    FriendlyName: string;
    /** Voice availability status */
    Status: "GA";
    /** Voice characteristics and personality traits */
    VoiceTag: VoiceTag;
};
/**
 * Extended voice type with language information for the VoicesManager.
 */
type VoicesManagerVoice = Voice & {
    /** Language code extracted from the locale (e.g., "en" from "en-US") */
    Language: string;
};
/**
 * Filter criteria for finding voices using the VoicesManager.
 */
type VoicesManagerFind = {
    /** Filter by voice gender */
    Gender?: "Female" | "Male";
    /** Filter by locale code */
    Locale?: string;
    /** Filter by language code */
    Language?: string;
};
/**
 * Internal state tracking for the Communicate class during streaming.
 */
type CommunicateState = {
    /** Buffer for partial text data */
    partialText: Buffer;
    /** Timing offset compensation for multi-request scenarios */
    offsetCompensation: number;
    /** Last recorded duration offset for timing calculations */
    lastDurationOffset: number;
    /** Flag indicating if the stream method has been called */
    streamWasCalled: boolean;
};

/**
 * Configuration options for the Communicate class.
 */
interface CommunicateOptions {
    /** Voice to use for synthesis (e.g., "en-US-EmmaMultilingualNeural") */
    voice?: string;
    /** Speech rate adjustment (e.g., "+20%", "-10%") */
    rate?: string;
    /** Volume level adjustment (e.g., "+50%", "-25%") */
    volume?: string;
    /** Pitch adjustment in Hz (e.g., "+5Hz", "-10Hz") */
    pitch?: string;
    /** Proxy URL for requests */
    proxy?: string;
    /** WebSocket connection timeout in milliseconds */
    connectionTimeout?: number;
}
/**
 * Main class for text-to-speech synthesis using Microsoft Edge's online TTS service.
 *
 * @example
 * ```typescript
 * const communicate = new Communicate('Hello, world!', {
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
declare class Communicate {
    private readonly ttsConfig;
    private readonly texts;
    private readonly proxy?;
    private readonly connectionTimeout?;
    private state;
    /**
     * Creates a new Communicate instance for text-to-speech synthesis.
     *
     * @param text - The text to synthesize
     * @param options - Configuration options for synthesis
     */
    constructor(text: string, options?: CommunicateOptions);
    private parseMetadata;
    private _stream;
    /**
     * Streams text-to-speech synthesis results.
     *
     * Returns an async generator that yields audio chunks and word boundary events.
     * Can only be called once per Communicate instance.
     *
     * @yields TTSChunk - Audio data or word boundary information
     * @throws {Error} If called more than once
     * @throws {NoAudioReceived} If no audio data is received
     * @throws {WebSocketError} If WebSocket connection fails
     *
     * @example
     * ```typescript
     * for await (const chunk of communicate.stream()) {
     *   if (chunk.type === 'audio') {
     *     // Process audio data
     *   } else if (chunk.type === 'WordBoundary') {
     *     // Process subtitle timing
     *   }
     * }
     * ```
     */
    stream(): AsyncGenerator<TTSChunk, void, unknown>;
}

/**
 * Utility class for generating SRT subtitles from WordBoundary events.
 *
 * @example
 * ```typescript
 * const subMaker = new SubMaker();
 *
 * for await (const chunk of communicate.stream()) {
 *   if (chunk.type === 'WordBoundary') {
 *     subMaker.feed(chunk);
 *   }
 * }
 *
 * const srt = subMaker.getSrt();
 * ```
 */
declare class SubMaker {
    private cues;
    /**
     * Adds a WordBoundary chunk to the subtitle maker.
     *
     * @param msg - Must be a WordBoundary type chunk with offset, duration, and text
     * @throws {ValueError} If chunk is not a WordBoundary with required fields
     */
    feed(msg: TTSChunk): void;
    /**
     * Merges consecutive cues to create subtitle entries with multiple words.
     * This is useful for creating more readable subtitles instead of word-by-word display.
     *
     * @param words - Maximum number of words per merged cue
     * @throws {ValueError} If words parameter is invalid
     */
    mergeCues(words: number): void;
    /**
     * Returns the subtitles in SRT format.
     *
     * @returns SRT formatted subtitles
     */
    getSrt(): string;
    toString(): string;
}

/**
 * Fetches all available voices from the Microsoft Edge TTS service.
 *
 * @param proxy - Optional proxy URL for the request
 * @returns Promise resolving to array of available voices
 */
declare function listVoices$1(proxy?: string): Promise<Voice[]>;
/**
 * Utility class for finding and filtering available voices.
 *
 * @example
 * ```typescript
 * const voicesManager = await VoicesManager.create();
 * const englishVoices = voicesManager.find({ Language: 'en' });
 * ```
 */
declare class VoicesManager {
    private voices;
    private calledCreate;
    /**
     * Creates a new VoicesManager instance.
     *
     * @param customVoices - Optional custom voice list instead of fetching from API
     * @param proxy - Optional proxy URL for API requests
     * @returns Promise resolving to VoicesManager instance
     */
    static create(customVoices?: Voice[], proxy?: string): Promise<VoicesManager>;
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
 * Options for controlling the voice prosody (rate, pitch, volume).
 */
interface ProsodyOptions$2 {
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
interface WordBoundary$2 {
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
interface SynthesisResult$2 {
    /**
     * The generated audio as a Blob, which can be used in an <audio> element.
     */
    audio: Blob;
    /**
     * An array of word boundaries containing timing and text for creating subtitles.
     */
    subtitle: WordBoundary$2[];
}
/**
 * Simple Edge TTS class that provides the same API as the standalone implementation
 * but uses the robust infrastructure of the modular project.
 */
declare class EdgeTTS {
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
    constructor(text: string, voice?: string, options?: ProsodyOptions$2);
    /**
     * Initiates the synthesis process.
     * @returns A promise that resolves with the synthesized audio and subtitle data.
     */
    synthesize(): Promise<SynthesisResult$2>;
}
/**
 * Creates a subtitle file content in VTT (WebVTT) format.
 * @param wordBoundaries The array of word boundary data.
 * @returns A string containing the VTT formatted subtitles.
 */
declare function createVTT$2(wordBoundaries: WordBoundary$2[]): string;
/**
 * Creates a subtitle file content in SRT (SubRip) format.
 * @param wordBoundaries The array of word boundary data.
 * @returns A string containing the SRT formatted subtitles.
 */
declare function createSRT$2(wordBoundaries: WordBoundary$2[]): string;

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
    constructor(text: string, voice?: string, options?: ProsodyOptions$1);
    /**
     * Initiates the synthesis process using isomorphic implementations.
     * @returns A promise that resolves with the synthesized audio and subtitle data.
     */
    synthesize(): Promise<SynthesisResult$1>;
}
/**
 * Creates a subtitle file content in VTT (WebVTT) format.
 * @param wordBoundaries The array of word boundary data.
 * @returns A string containing the VTT formatted subtitles.
 */
declare function createVTT$1(wordBoundaries: WordBoundary$1[]): string;
/**
 * Creates a subtitle file content in SRT (SubRip) format.
 * @param wordBoundaries The array of word boundary data.
 * @returns A string containing the SRT formatted subtitles.
 */
declare function createSRT$1(wordBoundaries: WordBoundary$1[]): string;

/**
 * Browser-compatible version of edge-tts Simple API
 * Uses native browser APIs instead of Node.js dependencies
 */
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
    constructor(text: string, voice?: string, options?: ProsodyOptions);
    /**
     * Initiates the synthesis process.
     * @returns A promise that resolves with the synthesized audio and subtitle data.
     */
    synthesize(): Promise<SynthesisResult>;
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
 * Creates a subtitle file content in VTT (WebVTT) format.
 */
declare function createVTT(wordBoundaries: WordBoundary[]): string;
/**
 * Creates a subtitle file content in SRT (SubRip) format.
 */
declare function createSRT(wordBoundaries: WordBoundary[]): string;

/**
 * Base exception class for all Edge TTS related errors.
 */
declare class EdgeTTSException extends Error {
    constructor(message: string);
}
/**
 * Exception raised when there's an error adjusting clock skew for API requests.
 * This typically occurs when the client and server clocks are significantly out of sync.
 */
declare class SkewAdjustmentError extends EdgeTTSException {
    constructor(message: string);
}
/**
 * Exception raised when an unknown response is received from the TTS service.
 * This indicates an unexpected message type or format that the client cannot handle.
 */
declare class UnknownResponse extends EdgeTTSException {
    constructor(message: string);
}
/**
 * Exception raised when an unexpected response is received from the TTS service.
 * This indicates a response that doesn't match the expected protocol flow.
 */
declare class UnexpectedResponse extends EdgeTTSException {
    constructor(message: string);
}
/**
 * Exception raised when no audio data is received during synthesis.
 * This typically indicates a problem with the synthesis request or service.
 */
declare class NoAudioReceived extends EdgeTTSException {
    constructor(message: string);
}
/**
 * Exception raised when there's an error with the WebSocket connection.
 * This can occur during connection establishment, data transmission, or connection closure.
 */
declare class WebSocketError extends EdgeTTSException {
    constructor(message: string);
}
/**
 * Exception raised when an invalid value is provided to a function or method.
 * This is typically used for input validation errors.
 */
declare class ValueError extends EdgeTTSException {
    constructor(message: string);
}

export { type ProsodyOptions as BrowserProsodyOptions, type SynthesisResult as BrowserSynthesisResult, type WordBoundary as BrowserWordBoundary, Communicate, type CommunicateOptions, type CommunicateState, EdgeTTS, EdgeTTSBrowser, EdgeTTSException, FetchError, IsomorphicCommunicate, type IsomorphicCommunicateOptions, IsomorphicDRM, IsomorphicEdgeTTS, type ProsodyOptions$1 as IsomorphicProsodyOptions, type SynthesisResult$1 as IsomorphicSynthesisResult, IsomorphicVoicesManager, type WordBoundary$1 as IsomorphicWordBoundary, NoAudioReceived, type ProsodyOptions$2 as ProsodyOptions, SkewAdjustmentError, SubMaker, type SynthesisResult$2 as SynthesisResult, type TTSChunk, UnexpectedResponse, IsomorphicCommunicate as UniversalCommunicate, type IsomorphicCommunicateOptions as UniversalCommunicateOptions, IsomorphicDRM as UniversalDRM, EdgeTTS as UniversalEdgeTTS, IsomorphicEdgeTTS as UniversalEdgeTTS_Isomorphic, FetchError as UniversalFetchError, type ProsodyOptions$1 as UniversalProsodyOptions_Isomorphic, type SynthesisResult$1 as UniversalSynthesisResult_Isomorphic, IsomorphicVoicesManager as UniversalVoicesManager, type WordBoundary$1 as UniversalWordBoundary_Isomorphic, UnknownResponse, ValueError, type Voice, type VoiceTag, VoicesManager, type VoicesManagerFind, type VoicesManagerVoice, WebSocketError, type WordBoundary$2 as WordBoundary, createSRT$2 as createSRT, createSRT as createSRTBrowser, createSRT$1 as createSRTIsomorphic, createSRT$1 as createSRTUniversal_Isomorphic, createVTT$2 as createVTT, createVTT as createVTTBrowser, createVTT$1 as createVTTIsomorphic, createVTT$1 as createVTTUniversal_Isomorphic, listVoices$1 as listVoices, listVoices as listVoicesIsomorphic, listVoices as listVoicesUniversal };
