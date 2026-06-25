'use strict';

// src/isomorphic-utils.ts
function connectId() {
  const array = new Uint8Array(16);
  globalThis.crypto.getRandomValues(array);
  array[6] = array[6] & 15 | 64;
  array[8] = array[8] & 63 | 128;
  const hex = Array.from(array, (byte) => byte.toString(16).padStart(2, "0")).join("");
  const uuid = `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`;
  return uuid.replace(/-/g, "");
}
function escape(text) {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");
}
function unescape(text) {
  return text.replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&");
}
function dateToString(date) {
  if (!date) {
    date = /* @__PURE__ */ new Date();
  }
  return date.toISOString().replace(/[-:.]/g, "").slice(0, -1);
}
function removeIncompatibleCharacters(str) {
  const chars_to_remove = '*/()[]{}$%^@#+=|\\~`><"&';
  let clean_str = str;
  for (const char of chars_to_remove) {
    clean_str = clean_str.replace(new RegExp("\\" + char, "g"), "");
  }
  return clean_str;
}
function mkssml(tc, escapedText) {
  const text = escapedText instanceof Uint8Array ? new TextDecoder().decode(escapedText) : escapedText;
  return `<speak version='1.0' xmlns='http://www.w3.org/2001/10/synthesis' xml:lang='en-US'><voice name='${tc.voice}'><prosody pitch='${tc.pitch}' rate='${tc.rate}' volume='${tc.volume}'>${text}</prosody></voice></speak>`;
}
function splitTextByByteLength(text, byteLength) {
  const encoder = new TextEncoder();
  const words = text.split(/(\s+)/);
  const chunks = [];
  let currentChunk = "";
  for (const word of words) {
    const potentialChunk = currentChunk + word;
    if (encoder.encode(potentialChunk).length <= byteLength) {
      currentChunk = potentialChunk;
    } else {
      if (currentChunk) {
        chunks.push(currentChunk.trim());
        currentChunk = word;
      } else {
        const wordBytes = encoder.encode(word);
        for (let i = 0; i < wordBytes.length; i += byteLength) {
          const slice = wordBytes.slice(i, i + byteLength);
          chunks.push(new TextDecoder().decode(slice));
        }
        currentChunk = "";
      }
    }
  }
  if (currentChunk.trim()) {
    chunks.push(currentChunk.trim());
  }
  return chunks;
}
function ssmlHeadersPlusData(requestId, timestamp, ssml) {
  return `X-RequestId:${requestId}\r
Content-Type:application/ssml+xml\r
X-Timestamp:${timestamp}Z\r
Path:ssml\r
\r
${ssml}`;
}

// src/exceptions.ts
var EdgeTTSException = class extends Error {
  constructor(message) {
    super(message);
    this.name = "EdgeTTSException";
  }
};
var SkewAdjustmentError = class extends EdgeTTSException {
  constructor(message) {
    super(message);
    this.name = "SkewAdjustmentError";
  }
};
var UnknownResponse = class extends EdgeTTSException {
  constructor(message) {
    super(message);
    this.name = "UnknownResponse";
  }
};
var UnexpectedResponse = class extends EdgeTTSException {
  constructor(message) {
    super(message);
    this.name = "UnexpectedResponse";
  }
};
var NoAudioReceived = class extends EdgeTTSException {
  constructor(message) {
    super(message);
    this.name = "NoAudioReceived";
  }
};
var WebSocketError = class extends EdgeTTSException {
  constructor(message) {
    super(message);
    this.name = "WebSocketError";
  }
};
var ValueError = class extends EdgeTTSException {
  constructor(message) {
    super(message);
    this.name = "ValueError";
  }
};

// src/tts_config.ts
var TTSConfig = class _TTSConfig {
  /**
   * Creates a new TTSConfig instance with the specified parameters.
   * 
   * @param options - Configuration options
   * @param options.voice - Voice name (supports both short and full formats)
   * @param options.rate - Speech rate adjustment (default: "+0%")
   * @param options.volume - Volume adjustment (default: "+0%") 
   * @param options.pitch - Pitch adjustment (default: "+0Hz")
   * @throws {ValueError} If any parameter has an invalid format
   */
  constructor({
    voice,
    rate = "+0%",
    volume = "+0%",
    pitch = "+0Hz"
  }) {
    this.voice = voice;
    this.rate = rate;
    this.volume = volume;
    this.pitch = pitch;
    this.validate();
  }
  validate() {
    const match = /^([a-z]{2,})-([A-Z]{2,})-(.+Neural)$/.exec(this.voice);
    if (match) {
      const [, lang] = match;
      let [, , region, name] = match;
      if (name.includes("-")) {
        const parts = name.split("-");
        region += `-${parts[0]}`;
        name = parts[1];
      }
      this.voice = `Microsoft Server Speech Text to Speech Voice (${lang}-${region}, ${name})`;
    }
    _TTSConfig.validateStringParam(
      "voice",
      this.voice,
      /^Microsoft Server Speech Text to Speech Voice \(.+,.+\)$/
    );
    _TTSConfig.validateStringParam("rate", this.rate, /^[+-]\d+%$/);
    _TTSConfig.validateStringParam("volume", this.volume, /^[+-]\d+%$/);
    _TTSConfig.validateStringParam("pitch", this.pitch, /^[+-]\d+Hz$/);
  }
  static validateStringParam(paramName, paramValue, pattern) {
    if (typeof paramValue !== "string") {
      throw new TypeError(`${paramName} must be a string`);
    }
    if (!pattern.test(paramValue)) {
      throw new ValueError(`Invalid ${paramName} '${paramValue}'.`);
    }
  }
};

// src/constants.ts
var BASE_URL = "speech.platform.bing.com/consumer/speech/synthesize/readaloud";
var TRUSTED_CLIENT_TOKEN = "6A5AA1D4EAFF4E9FB37E23D68491D6F4";
var WSS_URL = `wss://${BASE_URL}/edge/v1?TrustedClientToken=${TRUSTED_CLIENT_TOKEN}`;
var VOICE_LIST_URL = `https://${BASE_URL}/voices/list?trustedclienttoken=${TRUSTED_CLIENT_TOKEN}`;
var DEFAULT_VOICE = "en-US-EmmaMultilingualNeural";
var CHROMIUM_FULL_VERSION = "143.0.3650.75";
var CHROMIUM_MAJOR_VERSION = CHROMIUM_FULL_VERSION.split(".")[0];
var SEC_MS_GEC_VERSION = `1-${CHROMIUM_FULL_VERSION}`;
var BASE_HEADERS = {
  "User-Agent": `Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${CHROMIUM_MAJOR_VERSION}.0.0.0 Safari/537.36 Edg/${CHROMIUM_MAJOR_VERSION}.0.0.0`,
  "Accept-Encoding": "gzip, deflate, br, zstd",
  "Accept-Language": "en-US,en;q=0.9"
};
var WSS_HEADERS = {
  ...BASE_HEADERS,
  "Pragma": "no-cache",
  "Cache-Control": "no-cache",
  "Origin": "chrome-extension://jdiccldimpdaibmpdkjnbmckianbfold",
  "Sec-WebSocket-Version": "13"
};
var VOICE_HEADERS = {
  ...BASE_HEADERS,
  "Authority": "speech.platform.bing.com",
  "Sec-CH-UA": `" Not;A Brand";v="99", "Microsoft Edge";v="${CHROMIUM_MAJOR_VERSION}", "Chromium";v="${CHROMIUM_MAJOR_VERSION}"`,
  "Sec-CH-UA-Mobile": "?0",
  "Accept": "*/*",
  "Sec-Fetch-Site": "none",
  "Sec-Fetch-Mode": "cors",
  "Sec-Fetch-Dest": "empty"
};

// src/isomorphic-drm.ts
var WIN_EPOCH = 11644473600;
var S_TO_NS = 1e9;
var _IsomorphicDRM = class _IsomorphicDRM {
  static adjClockSkewSeconds(skewSeconds) {
    _IsomorphicDRM.clockSkewSeconds += skewSeconds;
  }
  static getUnixTimestamp() {
    return Date.now() / 1e3 + _IsomorphicDRM.clockSkewSeconds;
  }
  static parseRfc2616Date(date) {
    try {
      return new Date(date).getTime() / 1e3;
    } catch (e) {
      return null;
    }
  }
  static handleClientResponseError(response) {
    let serverDate = null;
    if ("headers" in response && typeof response.headers === "object") {
      if ("get" in response.headers && typeof response.headers.get === "function") {
        serverDate = response.headers.get("date");
      } else {
        const headers = response.headers;
        serverDate = headers["date"] || headers["Date"];
      }
    }
    if (!serverDate) {
      throw new SkewAdjustmentError("No server date in headers.");
    }
    const serverDateParsed = _IsomorphicDRM.parseRfc2616Date(serverDate);
    if (serverDateParsed === null) {
      throw new SkewAdjustmentError(`Failed to parse server date: ${serverDate}`);
    }
    const clientDate = _IsomorphicDRM.getUnixTimestamp();
    _IsomorphicDRM.adjClockSkewSeconds(serverDateParsed - clientDate);
  }
  static async generateSecMsGec() {
    let ticks = _IsomorphicDRM.getUnixTimestamp();
    ticks += WIN_EPOCH;
    ticks -= ticks % 300;
    ticks *= S_TO_NS / 100;
    const strToHash = `${ticks.toFixed(0)}${TRUSTED_CLIENT_TOKEN}`;
    if (!globalThis.crypto || !globalThis.crypto.subtle) {
      throw new Error("Web Crypto API not available");
    }
    const encoder = new TextEncoder();
    const data = encoder.encode(strToHash);
    const hashBuffer = await globalThis.crypto.subtle.digest("SHA-256", data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("").toUpperCase();
  }
  /**
   * Generates a random MUID (Machine Unique Identifier).
   * @returns Uppercase 32-character hex string
   */
  static generateMuid() {
    const bytes = new Uint8Array(16);
    globalThis.crypto.getRandomValues(bytes);
    return Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("").toUpperCase();
  }
  /**
   * Returns a copy of the given headers with a MUID cookie added.
   * @param headers - The original headers
   * @returns New headers object with Cookie header containing the MUID
   */
  static headersWithMuid(headers) {
    return {
      ...headers,
      Cookie: `muid=${_IsomorphicDRM.generateMuid()};`
    };
  }
};
_IsomorphicDRM.clockSkewSeconds = 0;
var IsomorphicDRM = _IsomorphicDRM;

// src/isomorphic-communicate.ts
var IsomorphicBuffer = {
  from: (input, encoding) => {
    if (typeof input === "string") {
      return new TextEncoder().encode(input);
    } else if (input instanceof ArrayBuffer) {
      return new Uint8Array(input);
    } else if (input instanceof Uint8Array) {
      return input;
    }
    throw new Error("Unsupported input type for IsomorphicBuffer.from");
  },
  concat: (arrays) => {
    const totalLength = arrays.reduce((sum, arr) => sum + arr.length, 0);
    const result = new Uint8Array(totalLength);
    let offset = 0;
    for (const arr of arrays) {
      result.set(arr, offset);
      offset += arr.length;
    }
    return result;
  },
  isBuffer: (obj) => {
    return obj instanceof Uint8Array;
  },
  toString: (buffer, encoding) => {
    return new TextDecoder(encoding || "utf-8").decode(buffer);
  }
};
function isomorphicGetHeadersAndDataFromText(message) {
  const messageString = IsomorphicBuffer.toString(message);
  const headerEndIndex = messageString.indexOf("\r\n\r\n");
  const headers = {};
  if (headerEndIndex !== -1) {
    const headerString = messageString.substring(0, headerEndIndex);
    const headerLines = headerString.split("\r\n");
    for (const line of headerLines) {
      const [key, value] = line.split(":", 2);
      if (key && value) {
        headers[key] = value.trim();
      }
    }
  }
  const headerByteLength = new TextEncoder().encode(messageString.substring(0, headerEndIndex + 4)).length;
  return [headers, message.slice(headerByteLength)];
}
function isomorphicGetHeadersAndDataFromBinary(message) {
  if (message.length < 2) {
    throw new Error("Message too short to contain header length");
  }
  const headerLength = message[0] << 8 | message[1];
  const headers = {};
  if (headerLength > 0 && headerLength + 2 <= message.length) {
    const headerBytes = message.slice(2, headerLength + 2);
    const headerString = IsomorphicBuffer.toString(headerBytes);
    const headerLines = headerString.split("\r\n");
    for (const line of headerLines) {
      const [key, value] = line.split(":", 2);
      if (key && value) {
        headers[key] = value.trim();
      }
    }
  }
  return [headers, message.slice(headerLength + 2)];
}
var IsomorphicCommunicate = class {
  /**
   * Creates a new isomorphic Communicate instance for text-to-speech synthesis.
   * 
   * @param text - The text to synthesize
   * @param options - Configuration options for synthesis
   */
  constructor(text, options = {}) {
    // Universal build - proxy and environment detection removed for compatibility
    this.state = {
      partialText: IsomorphicBuffer.from(""),
      offsetCompensation: 0,
      lastDurationOffset: 0,
      streamWasCalled: false
    };
    this.ttsConfig = new TTSConfig({
      voice: options.voice || DEFAULT_VOICE,
      rate: options.rate,
      volume: options.volume,
      pitch: options.pitch
    });
    if (typeof text !== "string") {
      throw new TypeError("text must be a string");
    }
    const processedText = escape(removeIncompatibleCharacters(text));
    const maxSize = 4096;
    this.texts = (function* () {
      for (const chunk of splitTextByByteLength(processedText, maxSize)) {
        yield new TextEncoder().encode(chunk);
      }
    })();
  }
  parseMetadata(data) {
    const metadata = JSON.parse(IsomorphicBuffer.toString(data));
    for (const metaObj of metadata["Metadata"]) {
      const metaType = metaObj["Type"];
      if (metaType === "WordBoundary" || metaType === "SentenceBoundary") {
        const currentOffset = metaObj["Data"]["Offset"] + this.state.offsetCompensation;
        const currentDuration = metaObj["Data"]["Duration"];
        return {
          type: metaType,
          offset: currentOffset,
          duration: currentDuration,
          text: unescape(metaObj["Data"]["text"]["Text"])
        };
      }
      if (metaType === "SessionEnd") {
        continue;
      }
      throw new UnknownResponse(`Unknown metadata type: ${metaType}`);
    }
    throw new UnexpectedResponse("No WordBoundary metadata found");
  }
  async createWebSocket(url) {
    const isNode = typeof globalThis !== "undefined" ? globalThis.process?.versions?.node !== void 0 : typeof process !== "undefined" && process.versions?.node !== void 0;
    if (isNode) {
      try {
        const { default: WS } = await import('ws');
        return new WS(url, {
          headers: IsomorphicDRM.headersWithMuid(WSS_HEADERS)
        });
      } catch (error) {
        console.warn("ws library not available, using native WebSocket without headers");
        return new WebSocket(url);
      }
    } else {
      return new WebSocket(url);
    }
  }
  async *_stream() {
    const url = `${WSS_URL}&Sec-MS-GEC=${await IsomorphicDRM.generateSecMsGec()}&Sec-MS-GEC-Version=${SEC_MS_GEC_VERSION}&ConnectionId=${connectId()}`;
    const websocket = await this.createWebSocket(url);
    const messageQueue = [];
    let resolveMessage = null;
    const handleMessage = (message, isBinary) => {
      const data = message.data || message;
      const binary = isBinary ?? (data instanceof ArrayBuffer || data instanceof Uint8Array);
      if (!binary && typeof data === "string") {
        const [headers, parsedData] = isomorphicGetHeadersAndDataFromText(IsomorphicBuffer.from(data));
        const path = headers["Path"];
        if (path === "audio.metadata") {
          try {
            const parsedMetadata = this.parseMetadata(parsedData);
            this.state.lastDurationOffset = parsedMetadata.offset + parsedMetadata.duration;
            messageQueue.push(parsedMetadata);
          } catch (e) {
            messageQueue.push(e);
          }
        } else if (path === "turn.end") {
          this.state.offsetCompensation = this.state.lastDurationOffset;
          this.state.offsetCompensation += 875e4;
          websocket.close();
        } else if (path !== "response" && path !== "turn.start") {
          messageQueue.push(new UnknownResponse(`Unknown path received: ${path}`));
        }
      } else {
        let bufferData;
        if (data instanceof ArrayBuffer) {
          bufferData = IsomorphicBuffer.from(data);
        } else if (data instanceof Uint8Array) {
          bufferData = data;
        } else if (typeof Buffer !== "undefined" && data instanceof Buffer) {
          bufferData = new Uint8Array(data);
        } else if (typeof Blob !== "undefined" && data instanceof Blob) {
          data.arrayBuffer().then((arrayBuffer) => {
            const blobBufferData = new Uint8Array(arrayBuffer);
            processBinaryData(blobBufferData);
          }).catch((error) => {
            messageQueue.push(new UnexpectedResponse(`Failed to process Blob data: ${error.message}`));
            if (resolveMessage) resolveMessage();
          });
          return;
        } else {
          messageQueue.push(new UnexpectedResponse(`Unknown binary data type: ${typeof data} ${data.constructor?.name}`));
          return;
        }
        processBinaryData(bufferData);
      }
      if (resolveMessage) resolveMessage();
    };
    const processBinaryData = (bufferData) => {
      if (bufferData.length < 2) {
        messageQueue.push(new UnexpectedResponse("We received a binary message, but it is missing the header length."));
      } else {
        const [headers, audioData] = isomorphicGetHeadersAndDataFromBinary(bufferData);
        if (headers["Path"] !== "audio") {
          messageQueue.push(new UnexpectedResponse("Received binary message, but the path is not audio."));
        } else {
          const contentType = headers["Content-Type"];
          if (contentType !== "audio/mpeg") {
            if (audioData.length > 0) {
              messageQueue.push(new UnexpectedResponse("Received binary message, but with an unexpected Content-Type."));
            }
          } else if (audioData.length === 0) {
            messageQueue.push(new UnexpectedResponse("Received binary message, but it is missing the audio data."));
          } else {
            messageQueue.push({ type: "audio", data: audioData });
          }
        }
      }
    };
    websocket.onmessage = handleMessage;
    websocket.onerror = (error) => {
      messageQueue.push(new WebSocketError(error.message || "WebSocket error"));
      if (resolveMessage) resolveMessage();
    };
    websocket.onclose = () => {
      messageQueue.push("close");
      if (resolveMessage) resolveMessage();
    };
    await new Promise((resolve, reject) => {
      const onOpen = () => resolve();
      const onError = (error) => reject(error);
      websocket.onopen = onOpen;
      websocket.onerror = onError;
    });
    websocket.send(
      `X-Timestamp:${dateToString()}\r
Content-Type:application/json; charset=utf-8\r
Path:speech.config\r
\r
{"context":{"synthesis":{"audio":{"metadataoptions":{"sentenceBoundaryEnabled":"false","wordBoundaryEnabled":"true"},"outputFormat":"audio-24khz-48kbitrate-mono-mp3"}}}}\r
`
    );
    websocket.send(
      ssmlHeadersPlusData(
        connectId(),
        dateToString(),
        mkssml(this.ttsConfig, IsomorphicBuffer.toString(this.state.partialText))
      )
    );
    let audioWasReceived = false;
    while (true) {
      if (messageQueue.length > 0) {
        const message = messageQueue.shift();
        if (message === "close") {
          if (!audioWasReceived) {
            throw new NoAudioReceived("No audio was received.");
          }
          break;
        } else if (message instanceof Error) {
          throw message;
        } else {
          if (message.type === "audio") audioWasReceived = true;
          yield message;
        }
      } else {
        await new Promise((resolve) => {
          resolveMessage = resolve;
          setTimeout(resolve, 50);
        });
      }
    }
  }
  /**
   * Streams text-to-speech synthesis results using isomorphic WebSocket.
   * Works in both Node.js and browsers (subject to CORS policy).
   * 
   * @yields TTSChunk - Audio data or word boundary information
   * @throws {Error} If called more than once
   * @throws {NoAudioReceived} If no audio data is received
   * @throws {WebSocketError} If WebSocket connection fails
   */
  async *stream() {
    if (this.state.streamWasCalled) {
      throw new Error("stream can only be called once.");
    }
    this.state.streamWasCalled = true;
    for (const partialText of this.texts) {
      this.state.partialText = partialText;
      for await (const message of this._stream()) {
        yield message;
      }
    }
  }
};

// src/isomorphic-voices.ts
var FetchError = class extends Error {
  constructor(message, response) {
    super(message);
    this.name = "FetchError";
    this.response = response;
  }
};
async function _listVoices(proxy) {
  const url = `${VOICE_LIST_URL}&Sec-MS-GEC=${await IsomorphicDRM.generateSecMsGec()}&Sec-MS-GEC-Version=${SEC_MS_GEC_VERSION}`;
  const fetchOptions = {
    headers: VOICE_HEADERS
  };
  if (proxy) {
    console.warn("Proxy support in isomorphic environment is limited. Consider using a backend proxy.");
  }
  try {
    const response = await fetch(url, fetchOptions);
    if (!response.ok) {
      const headers = {};
      response.headers.forEach((value, key) => {
        headers[key] = value;
      });
      throw new FetchError(`HTTP ${response.status}`, {
        status: response.status,
        headers
      });
    }
    const data = await response.json();
    for (const voice of data) {
      voice.VoiceTag.ContentCategories = voice.VoiceTag.ContentCategories.map((c) => c.trim());
      voice.VoiceTag.VoicePersonalities = voice.VoiceTag.VoicePersonalities.map((p) => p.trim());
    }
    return data;
  } catch (error) {
    if (error instanceof FetchError) {
      throw error;
    }
    throw new FetchError(error instanceof Error ? error.message : "Unknown fetch error");
  }
}
async function listVoices(proxy) {
  try {
    return await _listVoices(proxy);
  } catch (e) {
    if (e instanceof FetchError && e.response?.status === 403) {
      IsomorphicDRM.handleClientResponseError(e.response);
      return await _listVoices(proxy);
    }
    throw e;
  }
}
var IsomorphicVoicesManager = class _IsomorphicVoicesManager {
  constructor() {
    this.voices = [];
    this.calledCreate = false;
  }
  /**
   * Creates a new IsomorphicVoicesManager instance.
   * 
   * @param customVoices - Optional custom voice list instead of fetching from API
   * @param proxy - Optional proxy URL for API requests (limited browser support)
   * @returns Promise resolving to IsomorphicVoicesManager instance
   */
  static async create(customVoices, proxy) {
    const manager = new _IsomorphicVoicesManager();
    const voices = customVoices ?? await listVoices(proxy);
    manager.voices = voices.map((voice) => ({
      ...voice,
      Language: voice.Locale.split("-")[0]
    }));
    manager.calledCreate = true;
    return manager;
  }
  /**
   * Finds voices matching the specified criteria.
   * 
   * @param filter - Filter criteria for voice selection
   * @returns Array of voices matching the filter
   * @throws {Error} If called before create()
   */
  find(filter) {
    if (!this.calledCreate) {
      throw new Error("IsomorphicVoicesManager.find() called before IsomorphicVoicesManager.create()");
    }
    return this.voices.filter((voice) => {
      return Object.entries(filter).every(([key, value]) => {
        return voice[key] === value;
      });
    });
  }
};

// src/isomorphic-simple.ts
function concatUint8Arrays(arrays) {
  if (arrays.length === 0) return new Uint8Array(0);
  if (arrays.length === 1) return arrays[0];
  const totalLength = arrays.reduce((sum, arr) => sum + arr.length, 0);
  const result = new Uint8Array(totalLength);
  let offset = 0;
  for (const arr of arrays) {
    if (arr.length > 0) {
      result.set(arr, offset);
      offset += arr.length;
    }
  }
  return result;
}
var IsomorphicEdgeTTS = class {
  /**
   * @param text The text to be synthesized.
   * @param voice The voice to use for synthesis.
   * @param options Prosody options (rate, volume, pitch).
   */
  constructor(text, voice = "Microsoft Server Speech Text to Speech Voice (en-US, EmmaMultilingualNeural)", options = {}) {
    this.text = text;
    this.voice = voice;
    this.rate = options.rate || "+0%";
    this.volume = options.volume || "+0%";
    this.pitch = options.pitch || "+0Hz";
  }
  /**
   * Initiates the synthesis process using isomorphic implementations.
   * @returns A promise that resolves with the synthesized audio and subtitle data.
   */
  async synthesize() {
    const communicate = new IsomorphicCommunicate(this.text, {
      voice: this.voice,
      rate: this.rate,
      volume: this.volume,
      pitch: this.pitch
    });
    const audioChunks = [];
    const wordBoundaries = [];
    for await (const chunk of communicate.stream()) {
      if (chunk.type === "audio" && chunk.data) {
        audioChunks.push(chunk.data);
      } else if (chunk.type === "WordBoundary" && chunk.offset !== void 0 && chunk.duration !== void 0 && chunk.text !== void 0) {
        wordBoundaries.push({
          offset: chunk.offset,
          duration: chunk.duration,
          text: chunk.text
        });
      }
    }
    const audioBuffer = concatUint8Arrays(audioChunks);
    const audioBlob = new Blob([
      audioBuffer
    ], { type: "audio/mpeg" });
    return {
      audio: audioBlob,
      subtitle: wordBoundaries
    };
  }
};
function formatTimestamp(timeIn100ns, format) {
  const totalSeconds = Math.floor(timeIn100ns / 1e7);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor(totalSeconds % 3600 / 60);
  const seconds = totalSeconds % 60;
  const milliseconds = Math.floor(timeIn100ns % 1e7 / 1e4);
  const separator = format === "vtt" ? "." : ",";
  return `${padNumber(hours)}:${padNumber(minutes)}:${padNumber(seconds)}${separator}${padNumber(milliseconds, 3)}`;
}
function padNumber(num, length = 2) {
  return num.toString().padStart(length, "0");
}
function createVTT(wordBoundaries) {
  let vttContent = "WEBVTT\n\n";
  wordBoundaries.forEach((word, index) => {
    const startTime = formatTimestamp(word.offset, "vtt");
    const endTime = formatTimestamp(word.offset + word.duration, "vtt");
    vttContent += `${index + 1}
`;
    vttContent += `${startTime} --> ${endTime}
`;
    vttContent += `${word.text}

`;
  });
  return vttContent;
}
function createSRT(wordBoundaries) {
  let srtContent = "";
  wordBoundaries.forEach((word, index) => {
    const startTime = formatTimestamp(word.offset, "srt");
    const endTime = formatTimestamp(word.offset + word.duration, "srt");
    srtContent += `${index + 1}
`;
    srtContent += `${startTime} --> ${endTime}
`;
    srtContent += `${word.text}

`;
  });
  return srtContent;
}

// src/submaker.ts
function formatTime(seconds) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor(seconds % 3600 / 60);
  const s = Math.floor(seconds % 60);
  const ms = Math.round((seconds - Math.floor(seconds)) * 1e3);
  const pad = (num, size = 2) => num.toString().padStart(size, "0");
  return `${pad(h)}:${pad(m)}:${pad(s)},${pad(ms, 3)}`;
}
var SubMaker = class {
  constructor() {
    this.cues = [];
  }
  /**
   * Adds a WordBoundary chunk to the subtitle maker.
   * 
   * @param msg - Must be a WordBoundary type chunk with offset, duration, and text
   * @throws {ValueError} If chunk is not a WordBoundary with required fields
   */
  feed(msg) {
    if (msg.type !== "WordBoundary" || msg.offset === void 0 || msg.duration === void 0 || msg.text === void 0) {
      throw new ValueError("Invalid message type, expected 'WordBoundary' with offset, duration and text");
    }
    const start = msg.offset / 1e7;
    const end = (msg.offset + msg.duration) / 1e7;
    this.cues.push({
      index: this.cues.length + 1,
      start,
      end,
      content: msg.text
    });
  }
  /**
   * Merges consecutive cues to create subtitle entries with multiple words.
   * This is useful for creating more readable subtitles instead of word-by-word display.
   * 
   * @param words - Maximum number of words per merged cue
   * @throws {ValueError} If words parameter is invalid
   */
  mergeCues(words) {
    if (words <= 0) {
      throw new ValueError("Invalid number of words to merge, expected > 0");
    }
    if (this.cues.length === 0) {
      return;
    }
    const newCues = [];
    let currentCue = this.cues[0];
    for (const cue of this.cues.slice(1)) {
      if (currentCue.content.split(" ").length < words) {
        currentCue = {
          ...currentCue,
          end: cue.end,
          content: `${currentCue.content} ${cue.content}`
        };
      } else {
        newCues.push(currentCue);
        currentCue = cue;
      }
    }
    newCues.push(currentCue);
    this.cues = newCues.map((cue, i) => ({ ...cue, index: i + 1 }));
  }
  /**
   * Returns the subtitles in SRT format.
   * 
   * @returns SRT formatted subtitles
   */
  getSrt() {
    return this.cues.map((cue) => {
      return `${cue.index}\r
${formatTime(cue.start)} --> ${formatTime(cue.end)}\r
${cue.content}\r
`;
    }).join("\r\n");
  }
  toString() {
    return this.getSrt();
  }
};

exports.Communicate = IsomorphicCommunicate;
exports.DRM = IsomorphicDRM;
exports.EdgeTTS = IsomorphicEdgeTTS;
exports.EdgeTTSException = EdgeTTSException;
exports.FetchError = FetchError;
exports.NoAudioReceived = NoAudioReceived;
exports.SkewAdjustmentError = SkewAdjustmentError;
exports.SubMaker = SubMaker;
exports.UnexpectedResponse = UnexpectedResponse;
exports.UniversalCommunicate = IsomorphicCommunicate;
exports.UniversalDRM = IsomorphicDRM;
exports.UniversalEdgeTTS = IsomorphicEdgeTTS;
exports.UniversalFetchError = FetchError;
exports.UniversalVoicesManager = IsomorphicVoicesManager;
exports.UnknownResponse = UnknownResponse;
exports.ValueError = ValueError;
exports.VoicesManager = IsomorphicVoicesManager;
exports.WebSocketError = WebSocketError;
exports.createSRT = createSRT;
exports.createVTT = createVTT;
exports.listVoices = listVoices;
exports.listVoicesUniversal = listVoices;
//# sourceMappingURL=isomorphic.cjs.map
//# sourceMappingURL=isomorphic.cjs.map