=// src/lib/deepgram.ts

export class DeepgramSTTService {
  private socket: WebSocket | null = null;
  private mediaStream: MediaStream | null = null;
  private audioContext: AudioContext | null = null;
  private source: MediaStreamAudioSourceNode | null = null;
  private processor: ScriptProcessorNode | null = null;
  private reconnecting = false;

  async startListening(onTranscript: (text: string) => void) {
    console.log('[DeepgramSTT] 🎤 Requesting microphone access...');
    this.mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });

    // 🎚️ Setup audio processing graph
    this.audioContext = new AudioContext();
    this.source = this.audioContext.createMediaStreamSource(this.mediaStream);
    this.processor = this.audioContext.createScriptProcessor(4096, 1, 1);
    this.source.connect(this.processor);
    this.processor.connect(this.audioContext.destination);

    // ✅ Fetch Deepgram API key from your Bolt Database serverless function
    console.log('[DeepgramSTT] Fetching Deepgram key via Bolt Database...');
    const boltDatabaseUrl = import.meta.env.VITE_BOLT_DATABASE_URL;
    const boltDatabaseAnonKey = import.meta.env.VITE_BOLT_DATABASE_ANON_KEY;

    const res = await fetch(`${boltDatabaseUrl}/functions/v1/deepgram-token`, {
      headers: {
        'Authorization': `Bearer ${boltDatabaseAnonKey}`,
        'Content-Type': 'application/json',
      },
    });

    if (!res.ok) {
      const text = await res.text();
      console.error('[DeepgramSTT] ❌ Failed to fetch key:', res.status, text);
      throw new Error(`Failed to fetch Deepgram key: ${res.status}`);
    }

    const { key } = await res.json();
    if (!key) throw new Error('[DeepgramSTT] Missing key in response.');
    console.log('[DeepgramSTT] 🔑 Key retrieved successfully');

    // 🎧 Connect to Deepgram real-time WebSocket
    const protocol = ['token', key];
    this.socket = new WebSocket(
      'wss://api.deepgram.com/v1/listen?model=general&language=en-US&punctuate=true',
      protocol
    );
    this.socket.binaryType = 'arraybuffer';

    // 🔗 Connection lifecycle handlers
    this.socket.onopen = () => console.log('[DeepgramSTT] ✅ Connected to Deepgram');
    this.socket.onerror = (e) => console.error('[DeepgramSTT] WebSocket error:', e);
    this.socket.onclose = () => {
      console.warn('[DeepgramSTT] ⚠️ Connection closed');
      if (!this.reconnecting) {
        this.reconnecting = true;
        console.log('[DeepgramSTT] Attempting reconnection in 3s...');
        setTimeout(() => this.startListening(onTranscript), 3000);
      }
    };

    // 🗣️ Incoming transcript handler
    this.socket.onmessage = (e) => {
      try {
        const msg = JSON.parse(e.data);
        const transcript = msg.channel?.alternatives?.[0]?.transcript;
        if (msg.is_final && transcript?.trim()) {
          console.log('[DeepgramSTT] Transcript:', transcript);
          onTranscript(transcript.trim());
        }
      } catch (err) {
        console.error('[DeepgramSTT] Message parse error:', err);
      }
    };

    // 🎙️ Stream mic audio frames to Deepgram
    this.processor.onaudioprocess = (ev) => {
      if (!this.socket || this.socket.readyState !== WebSocket.OPEN) return;
      const input = ev.inputBuffer.getChannelData(0);
      const buffer = this.floatTo16BitPCM(input);
      this.socket.send(buffer);
    };
  }

  stopListening() {
    console.log('[DeepgramSTT] 🛑 Stopping listener...');
    this.reconnecting = false;

    this.processor?.disconnect();
    this.source?.disconnect();
    this.mediaStream?.getTracks().forEach((t) => t.stop());
    this.socket?.close();
    this.audioContext?.close();

    this.socket = null;
    this.mediaStream = null;
    this.audioContext = null;
    this.source = null;
    this.processor = null;

    console.log('[DeepgramSTT] 🔇 Stopped listening');
  }

  private floatTo16BitPCM(float32Array: Float32Array): ArrayBuffer {
    const buffer = new ArrayBuffer(float32Array.length * 2);
    const view = new DataView(buffer);
    for (let i = 0; i < float32Array.length; i++) {
      let s = Math.max(-1, Math.min(1, float32Array[i]));
      view.setInt16(i * 2, s < 0 ? s * 0x8000 : s * 0x7fff, true);
    }
    return buffer;
  }
}
