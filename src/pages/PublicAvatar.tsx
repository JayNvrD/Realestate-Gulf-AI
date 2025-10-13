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

  async startListening(onTranscription: (text: string) => void) {
    this.onTranscriptionCallback = onTranscription;

    console.log('[DeepgramSTT] Requesting microphone access...');
    this.mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
    this.audioContext = new AudioContext();
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
    const deepgramToken = key || token;
    if (!deepgramToken) throw new Error('[DeepgramSTT] No token returned from Supabase function');
    console.log('[DeepgramSTT] 🔑 Token retrieved successfully');

    // 🎧 Connect to Deepgram WebSocket using token authentication
    this.socket = new WebSocket(
      'wss://api.deepgram.com/v1/listen?model=general&language=en-US&punctuate=true',
      ['token', deepgramToken]
    );
    this.socket.binaryType = 'arraybuffer';

    // 🔗 WebSocket lifecycle handlers
    this.socket.onopen = () => console.log('[DeepgramSTT] ✅ Connected to Deepgram');
    this.socket.onerror = (err) => console.error('[DeepgramSTT] WebSocket error:', err);
    this.socket.onclose = () => {
      console.warn('[DeepgramSTT] ⚠️ Connection closed');
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

    // 🎙️ Stream audio to Deepgram
    this.processor.onaudioprocess = (event) => {
      if (this.socket?.readyState !== WebSocket.OPEN) return;
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
    <div className="fixed inset-0 overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          className="absolute inset-0 w-full h-full object-cover"
          style={{ display: isInitialized ? 'block' : 'none' }}
        />
      </div>

      {isInitialized && (
        <button
          onClick={endSession}
          className="fixed top-6 right-6 z-50 px-6 py-3 bg-red-500 hover:bg-red-600 text-white rounded-lg font-semibold flex items-center gap-2 transition-all shadow-lg hover:shadow-red-500/50"
        >
          <X className="w-5 h-5" />
          End Session
        </button>
      )}

      <div className="relative z-10 w-full h-full flex items-center justify-center p-6">
        {!isInitialized ? (
          <div className="text-center px-6">
            <div className="w-32 h-32 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-full flex items-center justify-center mx-auto mb-8 shadow-2xl shadow-blue-500/50">
              <MessageCircle className="w-16 h-16 text-white" />
            </div>
            <h2 className="text-3xl font-bold text-white mb-3">{link.title}</h2>
            <p className="text-slate-300 text-lg mb-2 max-w-md mx-auto">{avatar.name}</p>
            <p className="text-slate-400 text-sm mb-8 max-w-md mx-auto">
              Start speaking to interact with your AI assistant
            </p>
            <button
              onClick={initializeAvatar}
              disabled={loading || isConnecting}
              className="px-10 py-4 bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-xl text-lg font-semibold hover:shadow-2xl hover:shadow-blue-500/50 transition-all duration-300 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Start Conversation
            </button>
          </div>
        ) : (
          <div className="fixed left-6 top-6 bottom-6 w-96 bg-slate-800/40 backdrop-blur-xl rounded-2xl p-6 border border-white/10 shadow-2xl flex flex-col">
            <div className="mb-4">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <MessageCircle className="w-5 h-5" />
                Conversation
              </h2>
              <p className="text-sm text-slate-400 mt-1">Live transcript</p>
            </div>
            <div className="flex-1 overflow-y-auto space-y-3 pr-2 scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent">
              {conversationEntries.map((entry, idx) => (
                <div
                  key={idx}
                  className={`p-3 rounded-lg ${
                    entry.role === 'user'
                      ? 'bg-blue-500/20 border border-blue-500/30'
                      : 'bg-slate-700/40 border border-slate-600/30'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span
                      className={`text-xs font-semibold ${
                        entry.role === 'user' ? 'text-blue-400' : 'text-emerald-400'
                      }`}
                    >
                      {entry.role === 'user' ? 'You' : 'Assistant'}
                    </span>
                    <span className="text-xs text-slate-500">
                      {entry.timestamp.toLocaleTimeString()}
                    </span>
                  </div>
                  <p className="text-sm text-slate-200 leading-relaxed">{entry.text}</p>
                </div>
              ))}
              <div ref={conversationEndRef} />
            </div>
          </div>
        )}
      </div>

      {isInitialized && (
        <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-20 bg-slate-900/80 backdrop-blur-sm px-6 py-3 rounded-full border border-slate-700">
          {isSpeaking ? (
            <div className="flex items-center gap-3">
              <div className="flex gap-1">
                <div className="w-1 h-4 bg-blue-400 rounded-full animate-pulse"></div>
                <div className="w-1 h-4 bg-blue-400 rounded-full animate-pulse delay-150"></div>
                <div className="w-1 h-4 bg-blue-400 rounded-full animate-pulse delay-300"></div>
              </div>
              <span className="text-sm text-slate-300 font-medium">Processing...</span>
            </div>
          ) : (
            <div className="flex items-center gap-4 text-sm text-slate-400">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span>Voice Active</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                <span>AI Listening</span>
              </div>
            </div>
          )}
        </div>
      )}

      <div className="fixed bottom-4 right-4 text-xs text-white/40 flex items-center gap-2 z-10">
        <span className="opacity-60">Powered by</span>
        <span className="font-semibold text-white/60">HeyGen × Deepgram</span>
      </div>
    </div>
  );
}
