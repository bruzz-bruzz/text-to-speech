'use strict';

var uuid = require('uuid');
var escape = require('xml-escape');
var WebSocket2 = require('isomorphic-ws');
var crypto$1 = require('crypto');
var axios = require('axios');

function _interopDefault (e) { return e && e.__esModule ? e : { default: e }; }

var escape__default = /*#__PURE__*/_interopDefault(escape);
var WebSocket2__default = /*#__PURE__*/_interopDefault(WebSocket2);
var axios__default = /*#__PURE__*/_interopDefault(axios);

// src/utils.ts

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
function getHeadersAndDataFromText(message) {
  const headerLength = message.indexOf("\r\n\r\n");
  const headers = {};
  const headerString = message.subarray(0, headerLength).toString("utf-8");
  if (headerString) {
    const headerLines = headerString.split("\r\n");
    for (const line of headerLines) {
      const [key, value] = line.split(":", 2);
      if (key && value) {
        headers[key] = value.trim();
      }
    }
  }
  return [headers, message.subarray(headerLength + 2)];
}
function getHeadersAndDataFromBinary(message) {
  const headerLength = message.readUInt16BE(0);
  const headers = {};
  const headerString = message.subarray(2, headerLength + 2).toString("utf-8");
  if (headerString) {
    const headerLines = headerString.split("\r\n");
    for (const line of headerLines) {
      const [key, value] = line.split(":", 2);
      if (key && value) {
        headers[key] = value.trim();
      }
    }
  }
  return [headers, message.subarray(headerLength + 2)];
}
function removeIncompatibleCharacters(text) {
  return text.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, " ");
}
function connectId() {
  return uuid.v4().replace(/-/g, "");
}
function _findLastNewlineOrSpaceWithinLimit(text, limit) {
  const slice = text.subarray(0, limit);
  let splitAt = slice.lastIndexOf("\n");
  if (splitAt < 0) {
    splitAt = slice.lastIndexOf(" ");
  }
  return splitAt;
}
function _findSafeUtf8SplitPoint(textSegment) {
  let splitAt = textSegment.length;
  while (splitAt > 0) {
    const slice = textSegment.subarray(0, splitAt);
    if (slice.toString("utf-8").endsWith("\uFFFD")) {
      splitAt--;
      continue;
    }
    return splitAt;
  }
  return splitAt;
}
function _adjustSplitPointForXmlEntity(text, splitAt) {
  let ampersandIndex = text.lastIndexOf("&", splitAt - 1);
  while (ampersandIndex !== -1) {
    const semicolonIndex = text.indexOf(";", ampersandIndex);
    if (semicolonIndex !== -1 && semicolonIndex < splitAt) {
      break;
    }
    splitAt = ampersandIndex;
    ampersandIndex = text.lastIndexOf("&", splitAt - 1);
  }
  return splitAt;
}
function* splitTextByByteLength(text, byteLength) {
  let buffer = Buffer.isBuffer(text) ? text : Buffer.from(text, "utf-8");
  while (buffer.length > byteLength) {
    let splitAt = _findLastNewlineOrSpaceWithinLimit(buffer, byteLength);
    if (splitAt < 0) {
      splitAt = _findSafeUtf8SplitPoint(buffer.subarray(0, byteLength));
    }
    splitAt = _adjustSplitPointForXmlEntity(buffer, splitAt);
    if (splitAt <= 0) {
      throw new ValueError(
        "Maximum byte length is too small or invalid text structure near '&' or invalid UTF-8"
      );
    }
    const chunk = buffer.subarray(0, splitAt);
    const chunkString = chunk.toString("utf-8").trim();
    if (chunkString) {
      yield Buffer.from(chunkString, "utf-8");
    }
    buffer = buffer.subarray(splitAt);
  }
  const remainingChunk = buffer.toString("utf-8").trim();
  if (remainingChunk) {
    yield Buffer.from(remainingChunk, "utf-8");
  }
}
function mkssml(tc, escapedText) {
  const text = Buffer.isBuffer(escapedText) ? escapedText.toString("utf-8") : escapedText;
  return `<speak version='1.0' xmlns='http://www.w3.org/2001/10/synthesis' xml:lang='en-US'><voice name='${tc.voice}'><prosody pitch='${tc.pitch}' rate='${tc.rate}' volume='${tc.volume}'>${text}</prosody></voice></speak>`;
}
function dateToString() {
  return (/* @__PURE__ */ new Date()).toUTCString().replace("GMT", "GMT+0000 (Coordinated Universal Time)");
}
function ssmlHeadersPlusData(requestId, timestamp, ssml) {
  return `X-RequestId:${requestId}\r
Content-Type:application/ssml+xml\r
X-Timestamp:${timestamp}Z\r
Path:ssml\r
\r
${ssml}`;
}
function unescape(text) {
  return text.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">");
}

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
var WIN_EPOCH = 11644473600;
var S_TO_NS = 1e9;
var _DRM = class _DRM {
  /**
   * Adjusts the clock skew to synchronize with server time.
   * @param skewSeconds - Number of seconds to adjust the clock by
   */
  static adjClockSkewSeconds(skewSeconds) {
    _DRM.clockSkewSeconds += skewSeconds;
  }
  /**
   * Gets the current Unix timestamp adjusted for clock skew.
   * @returns Unix timestamp in seconds
   */
  static getUnixTimestamp() {
    return Date.now() / 1e3 + _DRM.clockSkewSeconds;
  }
  /**
   * Parses an RFC 2616 date string into a Unix timestamp.
   * @param date - RFC 2616 formatted date string
   * @returns Unix timestamp in seconds, or null if parsing fails
   */
  static parseRfc2616Date(date) {
    try {
      return new Date(date).getTime() / 1e3;
    } catch (e) {
      return null;
    }
  }
  /**
   * Handles client response errors by adjusting clock skew based on server date.
   * @param e - Axios error containing server response headers
   * @throws {SkewAdjustmentError} If server date is missing or invalid
   */
  static handleClientResponseError(e) {
    if (!e.response || !e.response.headers) {
      throw new SkewAdjustmentError("No server date in headers.");
    }
    const serverDate = e.response.headers["date"];
    if (!serverDate || typeof serverDate !== "string") {
      throw new SkewAdjustmentError("No server date in headers.");
    }
    const serverDateParsed = _DRM.parseRfc2616Date(serverDate);
    if (serverDateParsed === null) {
      throw new SkewAdjustmentError(`Failed to parse server date: ${serverDate}`);
    }
    const clientDate = _DRM.getUnixTimestamp();
    _DRM.adjClockSkewSeconds(serverDateParsed - clientDate);
  }
  /**
   * Generates the Sec-MS-GEC security token required for API authentication.
   * @returns Uppercase hexadecimal SHA-256 hash string
   */
  static generateSecMsGec() {
    let ticks = _DRM.getUnixTimestamp();
    ticks += WIN_EPOCH;
    ticks -= ticks % 300;
    ticks *= S_TO_NS / 100;
    const strToHash = `${ticks.toFixed(0)}${TRUSTED_CLIENT_TOKEN}`;
    return crypto$1.createHash("sha256").update(strToHash, "ascii").digest("hex").toUpperCase();
  }
  /**
   * Generates a random MUID (Machine Unique Identifier).
   * @returns Uppercase 32-character hex string
   */
  static generateMuid() {
    return crypto$1.randomBytes(16).toString("hex").toUpperCase();
  }
  /**
   * Returns a copy of the given headers with a MUID cookie added.
   * @param headers - The original headers
   * @returns New headers object with Cookie header containing the MUID
   */
  static headersWithMuid(headers) {
    return {
      ...headers,
      Cookie: `muid=${_DRM.generateMuid()};`
    };
  }
};
_DRM.clockSkewSeconds = 0;
var DRM = _DRM;
var HttpsProxyAgent;
var Communicate = class {
  /**
   * Creates a new Communicate instance for text-to-speech synthesis.
   * 
   * @param text - The text to synthesize
   * @param options - Configuration options for synthesis
   */
  constructor(text, options = {}) {
    this.state = {
      partialText: Buffer.from(""),
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
    this.texts = splitTextByByteLength(
      escape__default.default(removeIncompatibleCharacters(text)),
      // calcMaxMesgSize(this.ttsConfig),
      4096
    );
    this.proxy = options.proxy;
    this.connectionTimeout = options.connectionTimeout;
  }
  parseMetadata(data) {
    const metadata = JSON.parse(data.toString("utf-8"));
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
  async *_stream() {
    const url = `${WSS_URL}&Sec-MS-GEC=${DRM.generateSecMsGec()}&Sec-MS-GEC-Version=${SEC_MS_GEC_VERSION}&ConnectionId=${connectId()}`;
    let agent;
    if (this.proxy) {
      if (!HttpsProxyAgent) {
        try {
          const proxyModule = await import('https-proxy-agent');
          HttpsProxyAgent = proxyModule.HttpsProxyAgent;
        } catch (e) {
          console.warn("https-proxy-agent not available:", e);
        }
      }
      if (HttpsProxyAgent) {
        agent = new HttpsProxyAgent(this.proxy);
      }
    }
    const websocket = new WebSocket2__default.default(url, {
      headers: DRM.headersWithMuid(WSS_HEADERS),
      timeout: this.connectionTimeout,
      agent
    });
    const messageQueue = [];
    let resolveMessage = null;
    websocket.on("message", (message, isBinary) => {
      if (!isBinary) {
        const [headers, data] = getHeadersAndDataFromText(message);
        const path = headers["Path"];
        if (path === "audio.metadata") {
          try {
            const parsedMetadata = this.parseMetadata(data);
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
        if (message.length < 2) {
          messageQueue.push(new UnexpectedResponse("We received a binary message, but it is missing the header length."));
        } else {
          const headerLength = message.readUInt16BE(0);
          if (headerLength > message.length) {
            messageQueue.push(new UnexpectedResponse("The header length is greater than the length of the data."));
          } else {
            const [headers, data] = getHeadersAndDataFromBinary(message);
            if (headers["Path"] !== "audio") {
              messageQueue.push(new UnexpectedResponse("Received binary message, but the path is not audio."));
            } else {
              const contentType = headers["Content-Type"];
              if (contentType !== "audio/mpeg") {
                if (data.length > 0) {
                  messageQueue.push(new UnexpectedResponse("Received binary message, but with an unexpected Content-Type."));
                }
              } else if (data.length === 0) {
                messageQueue.push(new UnexpectedResponse("Received binary message, but it is missing the audio data."));
              } else {
                messageQueue.push({ type: "audio", data });
              }
            }
          }
        }
      }
      if (resolveMessage) resolveMessage();
    });
    websocket.on("error", (error) => {
      messageQueue.push(new WebSocketError(error.message));
      if (resolveMessage) resolveMessage();
    });
    websocket.on("close", () => {
      messageQueue.push("close");
      if (resolveMessage) resolveMessage();
    });
    await new Promise((resolve) => websocket.on("open", resolve));
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
        mkssml(this.ttsConfig, this.state.partialText)
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
  async *stream() {
    if (this.state.streamWasCalled) {
      throw new Error("stream can only be called once.");
    }
    this.state.streamWasCalled = true;
    for (const partialText of this.texts) {
      this.state.partialText = partialText;
      try {
        for await (const message of this._stream()) {
          yield message;
        }
      } catch (e) {
        if (e instanceof axios.AxiosError && e.response?.status === 403) {
          DRM.handleClientResponseError(e);
          for await (const message of this._stream()) {
            yield message;
          }
        } else {
          throw e;
        }
      }
    }
  }
};

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
function buildProxyConfig(proxy) {
  try {
    const proxyUrl = new URL(proxy);
    return {
      host: proxyUrl.hostname,
      port: parseInt(proxyUrl.port),
      protocol: proxyUrl.protocol
    };
  } catch (e) {
    return false;
  }
}
async function _listVoices(proxy) {
  const url = `${VOICE_LIST_URL}&Sec-MS-GEC=${DRM.generateSecMsGec()}&Sec-MS-GEC-Version=${SEC_MS_GEC_VERSION}`;
  const response = await axios__default.default.get(url, {
    headers: VOICE_HEADERS,
    proxy: proxy ? buildProxyConfig(proxy) : false
  });
  const data = response.data;
  for (const voice of data) {
    voice.VoiceTag.ContentCategories = voice.VoiceTag.ContentCategories.map((c) => c.trim());
    voice.VoiceTag.VoicePersonalities = voice.VoiceTag.VoicePersonalities.map((p) => p.trim());
  }
  return data;
}
async function listVoices(proxy) {
  try {
    return await _listVoices(proxy);
  } catch (e) {
    if (e instanceof axios.AxiosError && e.response?.status === 403) {
      DRM.handleClientResponseError(e);
      return await _listVoices(proxy);
    }
    throw e;
  }
}
var VoicesManager = class _VoicesManager {
  constructor() {
    this.voices = [];
    this.calledCreate = false;
  }
  /**
   * Creates a new VoicesManager instance.
   * 
   * @param customVoices - Optional custom voice list instead of fetching from API
   * @param proxy - Optional proxy URL for API requests
   * @returns Promise resolving to VoicesManager instance
   */
  static async create(customVoices, proxy) {
    const manager = new _VoicesManager();
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
      throw new Error("VoicesManager.find() called before VoicesManager.create()");
    }
    return this.voices.filter((voice) => {
      return Object.entries(filter).every(([key, value]) => {
        return voice[key] === value;
      });
    });
  }
};

// src/simple.ts
var EdgeTTS = class {
  /**
   * @param text The text to be synthesized.
   * @param voice The voice to use for synthesis.
   * @param options Prosody options (rate, volume, pitch).
   */
  constructor(text, voice = "Microsoft Server Speech Text to Speech Voice (zh-CN, XiaoxiaoNeural)", options = {}) {
    this.text = text;
    this.voice = voice;
    this.rate = options.rate || "+0%";
    this.volume = options.volume || "+0%";
    this.pitch = options.pitch || "+0Hz";
  }
  /**
   * Initiates the synthesis process.
   * @returns A promise that resolves with the synthesized audio and subtitle data.
   */
  async synthesize() {
    const communicate = new Communicate(this.text, {
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
    const audioBuffer = Buffer.concat(audioChunks);
    const audioBlob = new Blob([audioBuffer], { type: "audio/mpeg" });
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

// src/isomorphic-utils.ts
function connectId2() {
  const array = new Uint8Array(16);
  globalThis.crypto.getRandomValues(array);
  array[6] = array[6] & 15 | 64;
  array[8] = array[8] & 63 | 128;
  const hex = Array.from(array, (byte) => byte.toString(16).padStart(2, "0")).join("");
  const uuid = `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`;
  return uuid.replace(/-/g, "");
}
function escape2(text) {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");
}
function unescape2(text) {
  return text.replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&");
}
function dateToString2(date) {
  if (!date) {
    date = /* @__PURE__ */ new Date();
  }
  return date.toISOString().replace(/[-:.]/g, "").slice(0, -1);
}
function removeIncompatibleCharacters2(str) {
  const chars_to_remove = '*/()[]{}$%^@#+=|\\~`><"&';
  let clean_str = str;
  for (const char of chars_to_remove) {
    clean_str = clean_str.replace(new RegExp("\\" + char, "g"), "");
  }
  return clean_str;
}
function mkssml2(tc, escapedText) {
  const text = escapedText instanceof Uint8Array ? new TextDecoder().decode(escapedText) : escapedText;
  return `<speak version='1.0' xmlns='http://www.w3.org/2001/10/synthesis' xml:lang='en-US'><voice name='${tc.voice}'><prosody pitch='${tc.pitch}' rate='${tc.rate}' volume='${tc.volume}'>${text}</prosody></voice></speak>`;
}
function splitTextByByteLength2(text, byteLength) {
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
function ssmlHeadersPlusData2(requestId, timestamp, ssml) {
  return `X-RequestId:${requestId}\r
Content-Type:application/ssml+xml\r
X-Timestamp:${timestamp}Z\r
Path:ssml\r
\r
${ssml}`;
}

// src/isomorphic-drm.ts
var WIN_EPOCH2 = 11644473600;
var S_TO_NS2 = 1e9;
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
    ticks += WIN_EPOCH2;
    ticks -= ticks % 300;
    ticks *= S_TO_NS2 / 100;
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
    const processedText = escape2(removeIncompatibleCharacters2(text));
    const maxSize = 4096;
    this.texts = (function* () {
      for (const chunk of splitTextByByteLength2(processedText, maxSize)) {
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
          text: unescape2(metaObj["Data"]["text"]["Text"])
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
    const url = `${WSS_URL}&Sec-MS-GEC=${await IsomorphicDRM.generateSecMsGec()}&Sec-MS-GEC-Version=${SEC_MS_GEC_VERSION}&ConnectionId=${connectId2()}`;
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
      `X-Timestamp:${dateToString2()}\r
Content-Type:application/json; charset=utf-8\r
Path:speech.config\r
\r
{"context":{"synthesis":{"audio":{"metadataoptions":{"sentenceBoundaryEnabled":"false","wordBoundaryEnabled":"true"},"outputFormat":"audio-24khz-48kbitrate-mono-mp3"}}}}\r
`
    );
    websocket.send(
      ssmlHeadersPlusData2(
        connectId2(),
        dateToString2(),
        mkssml2(this.ttsConfig, IsomorphicBuffer.toString(this.state.partialText))
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
async function _listVoices2(proxy) {
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
async function listVoices2(proxy) {
  try {
    return await _listVoices2(proxy);
  } catch (e) {
    if (e instanceof FetchError && e.response?.status === 403) {
      IsomorphicDRM.handleClientResponseError(e.response);
      return await _listVoices2(proxy);
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
    const voices = customVoices ?? await listVoices2(proxy);
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
function formatTimestamp2(timeIn100ns, format) {
  const totalSeconds = Math.floor(timeIn100ns / 1e7);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor(totalSeconds % 3600 / 60);
  const seconds = totalSeconds % 60;
  const milliseconds = Math.floor(timeIn100ns % 1e7 / 1e4);
  const separator = format === "vtt" ? "." : ",";
  return `${padNumber2(hours)}:${padNumber2(minutes)}:${padNumber2(seconds)}${separator}${padNumber2(milliseconds, 3)}`;
}
function padNumber2(num, length = 2) {
  return num.toString().padStart(length, "0");
}
function createVTT2(wordBoundaries) {
  let vttContent = "WEBVTT\n\n";
  wordBoundaries.forEach((word, index) => {
    const startTime = formatTimestamp2(word.offset, "vtt");
    const endTime = formatTimestamp2(word.offset + word.duration, "vtt");
    vttContent += `${index + 1}
`;
    vttContent += `${startTime} --> ${endTime}
`;
    vttContent += `${word.text}

`;
  });
  return vttContent;
}
function createSRT2(wordBoundaries) {
  let srtContent = "";
  wordBoundaries.forEach((word, index) => {
    const startTime = formatTimestamp2(word.offset, "srt");
    const endTime = formatTimestamp2(word.offset + word.duration, "srt");
    srtContent += `${index + 1}
`;
    srtContent += `${startTime} --> ${endTime}
`;
    srtContent += `${word.text}

`;
  });
  return srtContent;
}

// src/browser-drm.ts
var WIN_EPOCH3 = 11644473600;
var S_TO_NS3 = 1e9;
var _BrowserDRM = class _BrowserDRM {
  static adjClockSkewSeconds(skewSeconds) {
    _BrowserDRM.clockSkewSeconds += skewSeconds;
  }
  static getUnixTimestamp() {
    return Date.now() / 1e3 + _BrowserDRM.clockSkewSeconds;
  }
  static parseRfc2616Date(date) {
    try {
      return new Date(date).getTime() / 1e3;
    } catch (e) {
      return null;
    }
  }
  static handleClientResponseError(response) {
    if (!response.headers) {
      throw new SkewAdjustmentError("No headers in response.");
    }
    const serverDate = response.headers["date"] || response.headers["Date"];
    if (!serverDate) {
      throw new SkewAdjustmentError("No server date in headers.");
    }
    const serverDateParsed = _BrowserDRM.parseRfc2616Date(serverDate);
    if (serverDateParsed === null) {
      throw new SkewAdjustmentError(`Failed to parse server date: ${serverDate}`);
    }
    const clientDate = _BrowserDRM.getUnixTimestamp();
    _BrowserDRM.adjClockSkewSeconds(serverDateParsed - clientDate);
  }
  static async generateSecMsGec() {
    let ticks = _BrowserDRM.getUnixTimestamp();
    ticks += WIN_EPOCH3;
    ticks -= ticks % 300;
    ticks *= S_TO_NS3 / 100;
    const strToHash = `${ticks.toFixed(0)}${TRUSTED_CLIENT_TOKEN}`;
    const encoder = new TextEncoder();
    const data = encoder.encode(strToHash);
    const hashBuffer = await crypto.subtle.digest("SHA-256", data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("").toUpperCase();
  }
  /**
   * Generates a random MUID (Machine Unique Identifier).
   * @returns Uppercase 32-character hex string
   */
  static generateMuid() {
    const bytes = new Uint8Array(16);
    crypto.getRandomValues(bytes);
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
      Cookie: `muid=${_BrowserDRM.generateMuid()};`
    };
  }
};
_BrowserDRM.clockSkewSeconds = 0;
var BrowserDRM = _BrowserDRM;

// src/browser.ts
var EdgeTTSBrowser = class {
  /**
   * @param text The text to be synthesized.
   * @param voice The voice to use for synthesis.
   * @param options Prosody options (rate, volume, pitch).
   */
  constructor(text, voice = "Microsoft Server Speech Text to Speech Voice (en-US, EmmaMultilingualNeural)", options = {}) {
    this.ws = null;
    this.text = text;
    this.voice = voice;
    this.rate = options.rate || "+0%";
    this.volume = options.volume || "+0%";
    this.pitch = options.pitch || "+0Hz";
  }
  /**
   * Initiates the synthesis process.
   * @returns A promise that resolves with the synthesized audio and subtitle data.
   */
  async synthesize() {
    await this.connect();
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      throw new Error("WebSocket is not connected.");
    }
    this.ws.send(this.createSpeechConfig());
    this.ws.send(this.createSSML());
    return new Promise((resolve, reject) => {
      const audioChunks = [];
      let wordBoundaries = [];
      if (this.ws) {
        this.ws.onmessage = (event) => {
          if (typeof event.data === "string") {
            const { headers, body } = this.parseMessage(event.data);
            if (headers.Path === "audio.metadata") {
              try {
                const metadata = JSON.parse(body);
                if (metadata.Metadata && Array.isArray(metadata.Metadata)) {
                  const boundaries = metadata.Metadata.filter((item) => item.Type === "WordBoundary" && item.Data).map((item) => ({
                    offset: item.Data.Offset,
                    duration: item.Data.Duration,
                    text: item.Data.text.Text
                  }));
                  wordBoundaries = wordBoundaries.concat(boundaries);
                }
              } catch (e) {
              }
            } else if (headers.Path === "turn.end") {
              if (this.ws) this.ws.close();
            }
          } else if (event.data instanceof Blob) {
            event.data.arrayBuffer().then((arrayBuffer) => {
              const dataView = new DataView(arrayBuffer);
              const headerLength = dataView.getUint16(0);
              if (arrayBuffer.byteLength > headerLength + 2) {
                const audioData = new Uint8Array(arrayBuffer, headerLength + 2);
                audioChunks.push(audioData);
              }
            });
          }
        };
        this.ws.onclose = () => {
          const audioBlob = new Blob(
            audioChunks,
            { type: "audio/mpeg" }
          );
          resolve({ audio: audioBlob, subtitle: wordBoundaries });
        };
        this.ws.onerror = (error) => {
          reject(error);
        };
      }
    });
  }
  /**
   * Establishes a connection to the WebSocket server.
   */
  async connect() {
    const connectionId = this.generateConnectionId();
    const secMsGec = await BrowserDRM.generateSecMsGec();
    const url = `${WSS_URL}&Sec-MS-GEC=${secMsGec}&Sec-MS-GEC-Version=${SEC_MS_GEC_VERSION}&ConnectionId=${connectionId}`;
    this.ws = new WebSocket(url);
    return new Promise((resolve, reject) => {
      if (!this.ws) {
        return reject(new Error("WebSocket not initialized"));
      }
      this.ws.onopen = () => {
        resolve();
      };
      this.ws.onerror = (error) => {
        reject(error);
      };
    });
  }
  /**
   * Parses a string message from the WebSocket into headers and a body.
   */
  parseMessage(message) {
    const parts = message.split("\r\n\r\n");
    const headerLines = parts[0].split("\r\n");
    const headers = {};
    headerLines.forEach((line) => {
      const [key, value] = line.split(":", 2);
      if (key && value) {
        headers[key.trim()] = value.trim();
      }
    });
    return { headers, body: parts[1] || "" };
  }
  /**
   * Creates the speech configuration message.
   */
  createSpeechConfig() {
    const config = {
      context: {
        synthesis: {
          audio: {
            metadataoptions: {
              sentenceBoundaryEnabled: false,
              wordBoundaryEnabled: true
            },
            outputFormat: "audio-24khz-48kbitrate-mono-mp3"
          }
        }
      }
    };
    return `X-Timestamp:${this.getTimestamp()}\r
Content-Type:application/json; charset=utf-8\r
Path:speech.config\r
\r
${JSON.stringify(config)}`;
  }
  /**
   * Creates the SSML (Speech Synthesis Markup Language) message.
   */
  createSSML() {
    const ssml = `<speak version='1.0' xmlns='http://www.w3.org/2001/10/synthesis' xml:lang='en-US'>
      <voice name='${this.voice}'>
        <prosody pitch='${this.pitch}' rate='${this.rate}' volume='${this.volume}'>
          ${this.escapeXml(this.text)}
        </prosody>
      </voice>
    </speak>`;
    return `X-RequestId:${this.generateConnectionId()}\r
Content-Type:application/ssml+xml\r
X-Timestamp:${this.getTimestamp()}Z\r
Path:ssml\r
\r
${ssml}`;
  }
  generateConnectionId() {
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
      const r = Math.random() * 16 | 0;
      const v = c === "x" ? r : r & 3 | 8;
      return v.toString(16);
    });
  }
  getTimestamp() {
    return (/* @__PURE__ */ new Date()).toISOString().replace(/[:-]|\.\d{3}/g, "");
  }
  escapeXml(text) {
    return text.replace(/[<>&'"]/g, (char) => {
      switch (char) {
        case "<":
          return "&lt;";
        case ">":
          return "&gt;";
        case "&":
          return "&amp;";
        case "'":
          return "&apos;";
        case '"':
          return "&quot;";
        default:
          return char;
      }
    });
  }
};
function formatTimestamp3(timeIn100ns, format) {
  const totalSeconds = Math.floor(timeIn100ns / 1e7);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor(totalSeconds % 3600 / 60);
  const seconds = totalSeconds % 60;
  const milliseconds = Math.floor(timeIn100ns % 1e7 / 1e4);
  const separator = format === "vtt" ? "." : ",";
  return `${padNumber3(hours)}:${padNumber3(minutes)}:${padNumber3(seconds)}${separator}${padNumber3(milliseconds, 3)}`;
}
function padNumber3(num, length = 2) {
  return num.toString().padStart(length, "0");
}
function createVTT3(wordBoundaries) {
  let vttContent = "WEBVTT\n\n";
  wordBoundaries.forEach((word, index) => {
    const startTime = formatTimestamp3(word.offset, "vtt");
    const endTime = formatTimestamp3(word.offset + word.duration, "vtt");
    vttContent += `${index + 1}
`;
    vttContent += `${startTime} --> ${endTime}
`;
    vttContent += `${word.text}

`;
  });
  return vttContent;
}
function createSRT3(wordBoundaries) {
  let srtContent = "";
  wordBoundaries.forEach((word, index) => {
    const startTime = formatTimestamp3(word.offset, "srt");
    const endTime = formatTimestamp3(word.offset + word.duration, "srt");
    srtContent += `${index + 1}
`;
    srtContent += `${startTime} --> ${endTime}
`;
    srtContent += `${word.text}

`;
  });
  return srtContent;
}

exports.Communicate = Communicate;
exports.EdgeTTS = EdgeTTS;
exports.EdgeTTSBrowser = EdgeTTSBrowser;
exports.EdgeTTSException = EdgeTTSException;
exports.FetchError = FetchError;
exports.IsomorphicCommunicate = IsomorphicCommunicate;
exports.IsomorphicDRM = IsomorphicDRM;
exports.IsomorphicEdgeTTS = IsomorphicEdgeTTS;
exports.IsomorphicVoicesManager = IsomorphicVoicesManager;
exports.NoAudioReceived = NoAudioReceived;
exports.SkewAdjustmentError = SkewAdjustmentError;
exports.SubMaker = SubMaker;
exports.UnexpectedResponse = UnexpectedResponse;
exports.UniversalCommunicate = IsomorphicCommunicate;
exports.UniversalDRM = IsomorphicDRM;
exports.UniversalEdgeTTS = EdgeTTS;
exports.UniversalEdgeTTS_Isomorphic = IsomorphicEdgeTTS;
exports.UniversalFetchError = FetchError;
exports.UniversalVoicesManager = IsomorphicVoicesManager;
exports.UnknownResponse = UnknownResponse;
exports.ValueError = ValueError;
exports.VoicesManager = VoicesManager;
exports.WebSocketError = WebSocketError;
exports.createSRT = createSRT;
exports.createSRTBrowser = createSRT3;
exports.createSRTIsomorphic = createSRT2;
exports.createSRTUniversal_Isomorphic = createSRT2;
exports.createVTT = createVTT;
exports.createVTTBrowser = createVTT3;
exports.createVTTIsomorphic = createVTT2;
exports.createVTTUniversal_Isomorphic = createVTT2;
exports.listVoices = listVoices;
exports.listVoicesIsomorphic = listVoices2;
exports.listVoicesUniversal = listVoices2;
//# sourceMappingURL=index.cjs.map
//# sourceMappingURL=index.cjs.map