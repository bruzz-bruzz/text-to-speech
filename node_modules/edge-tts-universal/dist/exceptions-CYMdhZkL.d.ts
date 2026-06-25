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

export { type CommunicateState as C, EdgeTTSException as E, NoAudioReceived as N, SubMaker as S, type TTSChunk as T, UnknownResponse as U, type Voice as V, WebSocketError as W, type VoicesManagerFind as a, type VoicesManagerVoice as b, SkewAdjustmentError as c, UnexpectedResponse as d, ValueError as e, type VoiceTag as f };
