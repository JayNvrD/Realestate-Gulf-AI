// src/lib/deepgram.ts

export class DeepgramSTTService {
  private socket: WebSocket | null = null;
  private audioContext: AudioContext | null = null;
  private mediaStream: MediaStream | null = null;
  private source: MediaStreamAudioSourceNode | null = null;
  private processor: ScriptProcessorNode | null = null;
  private onTranscript: ((text: string) => void) | null = null;

  constructor() {}

  /**
   * Starts listening: obtains key, opens socket, streams mic data, emits transcripts.
   */
  async startListening(onTranscript: (text: string) => void) {
    this.onTranscript = onTranscript;

    // 1. Get mic access
    this.mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
    this.audioContext = new AudioContext();
    this.source = this.audioContext.createMediaStreamSource(this.mediaStream);
    this.processor = this.audioContext.createScriptProcessor(4096, 1, 1);

    this.source.connect(this.processor);
    this.processor.connect(this.audioContext.destination);

    // 2. Fetch key (or token) from your backend function
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

    const resp = await fetch(`${supabaseUrl}/functions/v1/deepgram-token`, {
      headers: {
        'Authorization': `Bearer ${supabaseAnonKey}`,
        'Content-Type': 'application/json'
      }
    });

    if (!resp.ok) {
      const err = await resp.text();
      console.error(`[DeepgramSTT] Failed to fetch key: ${resp.status}`, err);
      throw new Error(`Failed to fetch Deepgram key: ${resp.status} ${err}`);
    }

    const { key } = await resp.json();
    console.log('[DeepgramSTT] Key retrieved successfully');

    // 3. Open WebSocket with subprotocol 'token'
    const protocol = ['token', key];
    this.socket = new WebSocket(
      `wss://api.deepgram.com/v1/listen?model=general&language=en-US&punctuate=true`,
      protocol
    );

    this.socket.binaryType = 'arraybuffer';

    this.socket.onopen = () => {
      console.log('[DeepgramSTT] WebSocket opened');
    };

    this.socket.onerror = (ev) => {
      console.error('[DeepgramSTT] WebSocket error', ev);
    };

    this.socket.onclose = (ev) => {
      console.log('[DeepgramSTT] WebSocket closed', ev);
    };

    this.socket.onmessage = (ev) => {
      try {
        const msg = JSON.parse(ev.data as string);
        const transcript = msg.channel?.alternatives?.[0]?.transcript;
        const isFinal = msg.is_final;
        if (transcript && isFinal && this.onTranscript) {
          this.onTranscript(transcript.trim());
        }
      } catch (err) {
        console.error('[DeepgramSTT] Message parse error:', err);
      }
    };

    // 4. Process audio and send to socket
    this.processor.onaudioprocess = (evt) => {
      if (!this.socket || this.socket.readyState !== WebSocket.OPEN) return;

      const input = evt.inputBuffer.getChannelData(0);
      const buffer = this._floatTo16BitPCM(input);
      this.socket.send(buffer);
    };
  }

  stopListening() {
    console.log('[DeepgramSTT] Stopping');
    this.processor?.disconnect();
    this.source?.disconnect();
    this.mediaStream?.getTracks().forEach((t) => t.stop());
    this.socket?.close();
    this.audioContext?.close();
  }

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
}
