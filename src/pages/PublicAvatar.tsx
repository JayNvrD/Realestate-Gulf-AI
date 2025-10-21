import React, { useEffect, useState, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { PublicLink, AIAvatar } from '../types/db';
import { HeyGenAvatarService } from '../lib/heygen';
import { OpenAIAssistantService } from '../lib/openai';
import { MessageCircle, Loader, X } from 'lucide-react';

interface ConversationEntry {
  role: 'user' | 'assistant';
  text: string;
  timestamp: Date;
}

// ✅ Deepgram Speech-to-Text Service using Supabase Token Authentication
class DeepgramSTTService {
  private socket: WebSocket | null = null;
  private audioContext: AudioContext | null = null;
  private mediaStream: MediaStream | null = null;
  private source: MediaStreamAudioSourceNode | null = null;
  private processor: ScriptProcessorNode | null = null;
  private onTranscriptionCallback?: (text: string) => void;
  private reconnecting = false;
  private isHandshakeComplete = false;

  async startListening(onTranscription: (text: string) => void) {
    this.onTranscriptionCallback = onTranscription;

    console.log('[DeepgramSTT] Requesting microphone access...');
    this.mediaStream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
        sampleRate: 16000
      }
    });

    // Create AudioContext with 16kHz sample rate to match Deepgram expectations
    this.audioContext = new AudioContext({ sampleRate: 16000 });
    console.log('[DeepgramSTT] AudioContext sample rate:', this.audioContext.sampleRate);

    this.source = this.audioContext.createMediaStreamSource(this.mediaStream);
    this.processor = this.audioContext.createScriptProcessor(4096, 1, 1);

    this.source.connect(this.processor);
    this.processor.connect(this.audioContext.destination);

    // ✅ Fetch temporary Deepgram token from Supabase Edge Function
    console.log('[DeepgramSTT] Fetching Deepgram token via Supabase...');
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
      throw new Error('[DeepgramSTT] Missing Supabase environment variables');
    }

    const response = await fetch(`${supabaseUrl}/functions/v1/deepgram-token`, {
      headers: {
        Authorization: `Bearer ${supabaseAnonKey}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[DeepgramSTT] ❌ Failed to fetch token:', response.status, errorText);
      throw new Error(`Failed to fetch Deepgram token: ${response.status}`);
    }

    const { key, token } = await response.json();
    const deepgramApiKey = key || token;
    if (!deepgramApiKey) throw new Error('[DeepgramSTT] No API key returned from Supabase function');
    console.log('[DeepgramSTT] 🔑 API key retrieved successfully');
    console.log('[DeepgramSTT] API key (first 10 chars):', deepgramApiKey.substring(0, 10) + '...');

    // 🎧 Connect to Deepgram WebSocket using Sec-WebSocket-Protocol authentication
    // Format: ['token', '<API_KEY>'] which browser sends as "Sec-WebSocket-Protocol: token, <API_KEY>"
    const wsUrl = 'wss://api.deepgram.com/v1/listen?model=nova-2&language=en-US&punctuate=true&encoding=linear16&sample_rate=16000';
    console.log('[DeepgramSTT] Connecting to:', wsUrl);
    this.socket = new WebSocket(wsUrl, ['token', deepgramApiKey]);
    this.socket.binaryType = 'arraybuffer';

    // 🔗 WebSocket lifecycle handlers
    this.socket.onopen = () => {
      console.log('[DeepgramSTT] ✅ Connected to Deepgram (101 Switching Protocols)');
      setTimeout(() => {
        this.isHandshakeComplete = true;
        console.log('[DeepgramSTT] Handshake complete, audio streaming enabled');
      }, 100);
      setInterval(() => {
        if (this.socket?.readyState === WebSocket.OPEN) {
          this.socket.send(JSON.stringify({ type: 'KeepAlive' }));
        }
      }, 3000);
    };

    this.socket.onerror = (err) => {
      console.error('[DeepgramSTT] WebSocket error:', err);
      console.warn('[DeepgramSTT] ⚠️ This likely means an invalid token or protocol format.');
    };

    this.socket.onclose = (event) => {
      console.warn('[DeepgramSTT] ⚠️ Connection closed:', event.reason || event.code);
      if (!this.reconnecting) {
        this.reconnecting = true;
        console.log('[DeepgramSTT] Attempting reconnection in 3s...');
        setTimeout(() => this.startListening(onTranscription), 3000);
      }
    };

    // 🎤 Handle transcripts
    this.socket.onmessage = (message) => {
      try {
        const data = JSON.parse(message.data);
        const transcript = data.channel?.alternatives?.[0]?.transcript;
        if (data.is_final && transcript && this.onTranscriptionCallback) {
          console.log('[DeepgramSTT] Transcript:', transcript);
          this.onTranscriptionCallback(transcript.trim());
        }
      } catch (error) {
        console.error('[DeepgramSTT] Message parse error:', error);
      }
    };

    // 🎙️ Stream audio to Deepgram (with handshake delay)
    this.processor.onaudioprocess = (event) => {
      if (!this.isHandshakeComplete || this.socket?.readyState !== WebSocket.OPEN) return;
      const inputData = event.inputBuffer.getChannelData(0);
      const int16Data = this.floatTo16BitPCM(inputData);
      this.socket.send(int16Data);
    };
  }

  private floatTo16BitPCM(float32Array: Float32Array) {
    const buffer = new ArrayBuffer(float32Array.length * 2);
    const view = new DataView(buffer);
    for (let i = 0; i < float32Array.length; i++) {
      const s = Math.max(-1, Math.min(1, float32Array[i]));
      view.setInt16(i * 2, s < 0 ? s * 0x8000 : s * 0x7fff, true);
    }
    return buffer;
  }

  stopListening() {
    console.log('[DeepgramSTT] 🛑 Stopping...');
    this.reconnecting = false;
    this.processor?.disconnect();
    this.source?.disconnect();
    this.mediaStream?.getTracks().forEach((t) => t.stop());
    this.socket?.close();
    this.audioContext?.close();
  }
}

export default function PublicAvatar() {
  const { slug } = useParams<{ slug: string }>();
  const [link, setLink] = useState<PublicLink | null>(null);
  const [avatar, setAvatar] = useState<AIAvatar | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isInitialized, setIsInitialized] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [conversationEntries, setConversationEntries] = useState<ConversationEntry[]>([]);
  const [isConnecting, setIsConnecting] = useState(false);
  const [showMobilePanel, setShowMobilePanel] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const avatarServiceRef = useRef<HeyGenAvatarService | null>(null);
  const openaiServiceRef = useRef<OpenAIAssistantService | null>(null);
  const deepgramRef = useRef<DeepgramSTTService | null>(null);
  const conversationEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (slug) loadLink();
    return () => {
      avatarServiceRef.current?.close();
      deepgramRef.current?.stopListening();
    };
  }, [slug]);

  useEffect(() => {
    conversationEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [conversationEntries]);

  useEffect(() => {
    if (!isInitialized) {
      setShowMobilePanel(false);
    }
  }, [isInitialized]);

  const loadLink = async () => {
    try {
      const { data: linkData, error: linkError } = await supabase
        .from('public_links')
        .select('*')
        .eq('slug', slug)
        .maybeSingle();

      if (linkError) throw linkError;
      if (!linkData) return setError('Link not found');
      if (!linkData.is_enabled) return setError('This link has been disabled');

      setLink(linkData);

      if (linkData.avatar_id) {
        const { data: avatarData, error: avatarError } = await supabase
          .from('ai_avatars')
          .select('*')
          .eq('id', linkData.avatar_id)
          .maybeSingle();

        if (avatarError) throw avatarError;
        if (avatarData && avatarData.is_active) setAvatar(avatarData);
        else setError('Avatar is not available');
      } else {
        setError('No avatar configured for this link');
      }
    } catch (err) {
      console.error('[PublicAvatar] Error loading link:', err);
      setError('Failed to load avatar configuration');
    } finally {
      setLoading(false);
    }
  };

  const initializeAvatar = async () => {
    if (!link || !avatar || !videoRef.current) {
      setError('Configuration missing or video element not ready');
      return;
    }

    try {
      setIsConnecting(true);
      avatarServiceRef.current = new HeyGenAvatarService();
      openaiServiceRef.current = new OpenAIAssistantService();
      openaiServiceRef.current.setSystemPrompt(avatar.system_prompt);

      await avatarServiceRef.current.initialize(videoRef.current, avatar.heygen_avatar_id);
      console.log('[PublicAvatar] HeyGen avatar initialized successfully');

      deepgramRef.current = new DeepgramSTTService();
      await deepgramRef.current.startListening(async (transcript) => {
        if (!transcript.trim()) return;
        console.log('[Deepgram STT] Transcript:', transcript);
        await handleUserMessage(transcript);
      });

      console.log('[PublicAvatar] Deepgram listening started');
      setIsInitialized(true);
      setIsConnecting(false);
    } catch (err) {
      console.error('[PublicAvatar] Initialization error:', err);
      setError('Failed to initialize avatar. Check console for details.');
      setIsConnecting(false);
    }
  };

  const handleUserMessage = async (message: string) => {
    if (!avatarServiceRef.current || !openaiServiceRef.current || !message.trim() || isSpeaking) return;
    try {
      setIsSpeaking(true);
      const userEntry: ConversationEntry = { role: 'user', text: message, timestamp: new Date() };
      setConversationEntries((prev) => [...prev, userEntry]);

      const response = await openaiServiceRef.current.sendMessage(message);
      const assistantEntry: ConversationEntry = { role: 'assistant', text: response, timestamp: new Date() };
      setConversationEntries((prev) => [...prev, assistantEntry]);

      await avatarServiceRef.current.speak(response);
    } catch (err) {
      console.error('[PublicAvatar] Error processing message:', err);
      const fallback = 'I encountered an error. Could you please repeat that?';
      const entry: ConversationEntry = { role: 'assistant', text: fallback, timestamp: new Date() };
      setConversationEntries((prev) => [...prev, entry]);
      await avatarServiceRef.current?.speak(fallback);
    } finally {
      setIsSpeaking(false);
    }
  };

  const endSession = async () => {
    try {
      deepgramRef.current?.stopListening();
      await avatarServiceRef.current?.close();
      setIsInitialized(false);
      setConversationEntries([]);
      window.location.reload();
    } catch (err) {
      console.error('[PublicAvatar] Error ending session:', err);
    }
  };

  // === UI ===
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <Loader className="w-12 h-12 text-blue-400 animate-spin mx-auto mb-4" />
          <div className="text-slate-300 text-lg">Loading avatar...</div>
        </div>
      </div>
    );
  }

  if (error || !link || !avatar) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
        <div className="bg-slate-800 rounded-xl p-8 max-w-md w-full text-center border border-red-500/30">
          <X className="w-16 h-16 text-red-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-white mb-2">Error</h2>
          <p className="text-slate-300">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <video
        ref={videoRef}
        autoPlay
        playsInline
        className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-500 ${
          isInitialized ? 'opacity-100' : 'opacity-0'
        }`}
      />

      {isInitialized && (
        <button
          onClick={endSession}
          className="fixed top-4 right-4 z-50 inline-flex items-center gap-2 rounded-full bg-red-500 px-4 py-2 text-sm font-semibold text-white shadow-lg transition hover:bg-red-600 hover:shadow-red-500/40 sm:top-6 sm:right-6 sm:px-6 sm:py-3 sm:text-base"
        >
          <X className="h-4 w-4 sm:h-5 sm:w-5" />
          End Session
        </button>
      )}

      <div className="relative z-10 flex min-h-screen flex-col items-center justify-center px-6 py-12">
        {!isInitialized ? (
          <div className="w-full max-w-xl rounded-3xl border border-white/10 bg-slate-900/50 p-8 text-center backdrop-blur-xl">
            <div className="mx-auto mb-8 flex h-28 w-28 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 shadow-2xl shadow-blue-500/50">
              <MessageCircle className="h-14 w-14 text-white" />
            </div>
            <h2 className="text-3xl font-bold text-white sm:text-4xl">{link.title}</h2>
            <p className="mt-3 text-base text-slate-300">{avatar.name}</p>
            <p className="mt-4 text-sm text-slate-400">
              Start speaking to interact with your AI assistant. We recommend using headphones for the best experience.
            </p>
            <button
              onClick={initializeAvatar}
              disabled={loading || isConnecting}
              className="mt-8 inline-flex items-center justify-center rounded-full bg-gradient-to-r from-blue-500 to-cyan-500 px-8 py-3 text-base font-semibold text-white shadow-lg transition hover:scale-105 hover:shadow-blue-500/40 disabled:opacity-50"
            >
              {isConnecting ? 'Connecting…' : 'Start Conversation'}
            </button>
          </div>
        ) : (
          <>
            <div className="hidden w-full max-w-4xl justify-end lg:flex">
              <div className="flex h-[32rem] w-[24rem] flex-col rounded-2xl border border-white/10 bg-slate-800/60 p-6 backdrop-blur-xl">
                <header className="mb-4">
                  <h2 className="flex items-center gap-2 text-xl font-semibold text-white">
                    <MessageCircle className="h-5 w-5" /> Conversation
                  </h2>
                  <p className="text-sm text-slate-400">Live transcript</p>
                </header>
                <div className="flex-1 space-y-3 overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent">
                  {conversationEntries.map((entry, idx) => (
                    <div
                      key={idx}
                      className={`rounded-xl border px-4 py-3 text-sm leading-relaxed ${
                        entry.role === 'user'
                          ? 'border-blue-500/30 bg-blue-500/10 text-blue-100'
                          : 'border-emerald-500/20 bg-slate-700/40 text-slate-100'
                      }`}
                    >
                      <div className="mb-1 flex items-center gap-2 text-xs">
                        <span className={entry.role === 'user' ? 'font-semibold text-blue-200' : 'font-semibold text-emerald-200'}>
                          {entry.role === 'user' ? 'You' : 'Assistant'}
                        </span>
                        <span className="text-slate-400">{entry.timestamp.toLocaleTimeString()}</span>
                      </div>
                      {entry.text}
                    </div>
                  ))}
                  <div ref={conversationEndRef} />
                </div>
              </div>
            </div>

            <div className="flex w-full flex-col items-center gap-4 lg:hidden">
              <button
                onClick={() => setShowMobilePanel((prev) => !prev)}
                className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-slate-900/80 px-5 py-2 text-sm font-semibold text-slate-100 backdrop-blur-sm"
              >
                <MessageCircle className="h-4 w-4" /> {showMobilePanel ? 'Hide Transcript' : 'Show Transcript'}
              </button>
            </div>

            <div
              className={`fixed inset-x-0 bottom-0 z-40 rounded-t-3xl border border-white/10 bg-slate-900/95 p-6 shadow-2xl transition-transform duration-300 backdrop-blur-xl lg:hidden ${
                showMobilePanel ? 'translate-y-0' : 'translate-y-[70%]'
              }`}
            >
              <div className="mx-auto h-1.5 w-16 rounded-full bg-white/20" />
              <header className="mt-4 flex items-center justify-between">
                <div>
                  <h2 className="text-base font-semibold text-white">Conversation</h2>
                  <p className="text-xs text-slate-400">Live transcript</p>
                </div>
                <button
                  onClick={() => setShowMobilePanel(false)}
                  className="rounded-full p-2 text-slate-400 transition hover:bg-white/10 hover:text-slate-200"
                >
                  <X className="h-4 w-4" />
                </button>
              </header>
              <div className="mt-4 max-h-64 space-y-3 overflow-y-auto pr-2 text-sm text-slate-100">
                {conversationEntries.map((entry, idx) => (
                  <div
                    key={idx}
                    className={`rounded-2xl px-4 py-3 ${
                      entry.role === 'user' ? 'bg-blue-500/20 text-blue-100' : 'bg-slate-700/50 text-slate-100'
                    }`}
                  >
                    <div className="mb-1 flex items-center gap-2 text-xs">
                      <span className="font-semibold">
                        {entry.role === 'user' ? 'You' : 'Assistant'}
                      </span>
                      <span className="text-slate-400">{entry.timestamp.toLocaleTimeString()}</span>
                    </div>
                    {entry.text}
                  </div>
                ))}
                <div ref={conversationEndRef} />
              </div>
            </div>
          </>
        )}
      </div>

      {isInitialized && (
        <div
          className={`fixed left-1/2 z-40 -translate-x-1/2 rounded-full border border-slate-700 bg-slate-900/80 px-5 py-2 text-xs text-slate-200 backdrop-blur-sm shadow-lg transition-all sm:px-6 sm:py-3 sm:text-sm ${
            showMobilePanel ? 'bottom-40' : 'bottom-6'
          }`}
        >
          {isSpeaking ? (
            <div className="flex items-center gap-3">
              <div className="flex gap-1">
                <div className="h-4 w-1 animate-pulse rounded-full bg-blue-400"></div>
                <div className="h-4 w-1 animate-pulse rounded-full bg-blue-400 delay-150"></div>
                <div className="h-4 w-1 animate-pulse rounded-full bg-blue-400 delay-300"></div>
              </div>
              <span className="font-medium">Processing…</span>
            </div>
          ) : (
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-2">
                <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400"></span>
                Voice Active
              </span>
              <span className="flex items-center gap-2">
                <span className="h-2 w-2 animate-pulse rounded-full bg-blue-400"></span>
                AI Listening
              </span>
            </div>
          )}
        </div>
      )}

      <div className="fixed bottom-4 right-4 z-20 flex items-center gap-2 text-xs text-white/50">
        <span>Powered by</span>
        <span className="font-semibold text-white/70">HeyGen × Deepgram</span>
      </div>
    </div>
  );
}
