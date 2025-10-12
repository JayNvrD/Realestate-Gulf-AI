// ✅ src/lib/deepgram.ts
// Deepgram Streaming Speech-to-Text Service
// Handles real-time mic audio → Deepgram → transcript callbacks.

export class DeepgramSTTService {
  private ws: WebSocket | null = null;
  private audioContext: AudioContext | null = null;
  private processor: ScriptProcessorNode | null = null;
  private source: MediaStreamAudioSourceNode | null = null;
  private mediaStream: MediaStream | null = null;
  private apiKey: string;
  private connected = false;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  /**
   * Starts microphone capture and sends audio to Deepgram’s streaming API.
   * @param onTranscript Callback fired on each final transcript.
   */
  async startListening(onTranscript: (text: string) => void) {
    if (this.connected) {
      console.warn("[DeepgramSTT] Already running");
      return;
    }

    try {
      console.log("[DeepgramSTT] Requesting microphone access...");
      this.mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      this.audioContext = new AudioContext();
      this.source = this.audioContext.createMediaStreamSource(this.mediaStream);
      this.processor = this.audioContext.createScriptProcessor(4096, 1, 1);

      console.log("[DeepgramSTT] Opening Deepgram WebSocket...");
      const wsUrl = `wss://api.deepgram.com/v1/listen?model=enhanced&language=en-US&punctuate=true`;
      this.ws = new WebSocket(wsUrl, ["token", this.apiKey]);
      this.ws.binaryType = "arraybuffer";

      this.ws.onopen = () => {
        console.log("[DeepgramSTT] Connected to Deepgram");
        this.connected = true;
        this.source!.connect(this.processor!);
        this.processor!.connect(this.audioContext!.destination);

        this.processor!.onaudioprocess = (event) => {
          const input = event.inputBuffer.getChannelData(0);
          const buffer = this._floatTo16BitPCM(input);
          if (this.ws?.readyState === WebSocket.OPEN) {
            this.ws.send(buffer);
          }
        };
      };

      this.ws.onmessage = (msg) => {
        try {
          const data = JSON.parse(msg.data);
          const transcript = data.channel?.alternatives?.[0]?.transcript;
          const isFinal = data.is_final;
          if (transcript && isFinal) {
            console.log("[DeepgramSTT] Final transcript:", transcript);
            onTranscript(transcript.trim());
          }
        } catch (err) {
          console.error("[DeepgramSTT] Message parse error:", err);
        }
      };

      this.ws.onerror = (err) => {
        console.error("[DeepgramSTT] WebSocket error:", err);
      };

      this.ws.onclose = () => {
        console.log("[DeepgramSTT] Connection closed");
        this.connected = false;
        this._cleanup();
      };
    } catch (err) {
      console.error("[DeepgramSTT] Initialization error:", err);
      this._cleanup();
    }
  }

  /**
   * Stops the Deepgram session and releases mic resources.
   */
  stopListening() {
    console.log("[DeepgramSTT] Stopping...");
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.close();
    }
    this._cleanup();
  }

  /**
   * Converts Float32Array audio data → 16-bit PCM buffer.
   */
  private _floatTo16BitPCM(float32Array: Float32Array): ArrayBuffer {
    const buffer = new ArrayBuffer(float32Array.length * 2);
    const view = new DataView(buffer);
    let offset = 0;
    for (let i = 0; i < float32Array.length; i++, offset += 2) {
      let s = Math.max(-1, Math.min(1, float32Array[i]));
      view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
    }
    return buffer;
  }

  /**
   * Cleanup helper: stops audio + disconnects graph nodes.
   */
  private _cleanup() {
    if (this.processor && this.source) {
      this.source.disconnect();
      this.processor.disconnect();
    }
    if (this.audioContext) {
      this.audioContext.close();
    }
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach((t) => t.stop());
    }

    this.processor = null;
    this.source = null;
    this.audioContext = null;
    this.mediaStream = null;
    this.ws = null;
    this.connected = false;
  }
}
