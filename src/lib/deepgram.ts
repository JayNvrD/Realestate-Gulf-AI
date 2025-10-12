export class DeepgramSTTService {
  private socket: WebSocket | null = null;
  private mediaStream: MediaStream | null = null;
  private audioContext: AudioContext | null = null;
  private source: MediaStreamAudioSourceNode | null = null;
  private processor: ScriptProcessorNode | null = null;

  async startListening(onTranscript: (text: string) => void) {
    console.log('[DeepgramSTT] Requesting microphone access...');
    this.mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
    this.audioContext = new AudioContext();
    this.source = this.audioContext.createMediaStreamSource(this.mediaStream);
    this.processor = this.audioContext.createScriptProcessor(4096, 1, 1);
    this.source.connect(this.processor);
    this.processor.connect(this.audioContext.destination);

    // ✅ Fetch Deepgram key from Supabase (securely)
    console.log('[DeepgramSTT] Fetching Deepgram key via Supabase...');
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

    const res = await fetch(`${supabaseUrl}/functions/v1/deepgram-token`, {
      headers: {
        'Authorization': `Bearer ${anonKey}`,
        'Content-Type': 'application/json',
      },
    });

    if (!res.ok) {
      const text = await res.text();
      console.error('[DeepgramSTT] Failed to fetch key:', res.status, text);
      throw new Error(`Failed to fetch key: ${res.status}`);
    }

    const { key } = await res.json();
    console.log('[DeepgramSTT] Key retrieved successfully');

    // 🎧 Open Deepgram WebSocket with token subprotocol
    const protocol = ['token', key];
    this.socket = new WebSocket(
      `wss://api.deepgram.com/v1/listen?model=general&language=en-US&punctuate=true`,
      protocol
    );
    this.socket.binaryType = 'arraybuffer';

    this.socket.onopen = () => console.log('[DeepgramSTT] Connected');
    this.socket.onerror = (e) => console.error('[DeepgramSTT] WebSocket error:', e);
    this.socket.onclose = () => console.log('[DeepgramSTT] Closed');

    this.socket.onmessage = (e) => {
      const msg = JSON.parse(e.data);
      const transcript = msg.channel?.alternatives?.[0]?.transcript;
      if (msg.is_final && transcript?.trim()) {
        onTranscript(transcript.trim());
      }
    };

    // 🔄 Stream mic audio frames to Deepgram
    this.processor.onaudioprocess = (ev) => {
      if (!this.socket || this.socket.readyState !== WebSocket.OPEN) return;
      const input = ev.inputBuffer.getChannelData(0);
      const buffer = this.floatTo16BitPCM(input);
      this.socket.send(buffer);
    };
  }

  stopListening() {
    this.processor?.disconnect();
    this.source?.disconnect();
    this.mediaStream?.getTracks().forEach((t) => t.stop());
    this.socket?.close();
    this.audioContext?.close();
    console.log('[DeepgramSTT] Stopped listening');
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
