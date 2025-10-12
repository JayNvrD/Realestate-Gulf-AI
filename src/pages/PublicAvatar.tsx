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
  const recognitionRef = useRef<any>(null);
  const conversationEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (slug) {
      loadLink();
    }

    return () => {
      if (avatarServiceRef.current) {
        avatarServiceRef.current.close();
      }
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
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

      if (!linkData) {
        setError('Link not found');
        return;
      }

      if (!linkData.is_enabled) {
        setError('This link has been disabled');
        return;
      }

      setLink(linkData);

      if (linkData.avatar_id) {
        const { data: avatarData, error: avatarError } = await supabase
          .from('ai_avatars')
          .select('*')
          .eq('id', linkData.avatar_id)
          .maybeSingle();

        if (avatarError) throw avatarError;

        if (avatarData && avatarData.is_active) {
          setAvatar(avatarData);
        } else {
          setError('Avatar is not available');
        }
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
    console.log('[PublicAvatar] initializeAvatar called');
    console.log('[PublicAvatar] videoRef.current:', videoRef.current);
    console.log('[PublicAvatar] link:', link);
    console.log('[PublicAvatar] avatar:', avatar);

    if (!link) {
      console.error('[PublicAvatar] Cannot initialize: missing link');
      setError('Configuration not loaded');
      return;
    }

    if (!avatar) {
      console.error('[PublicAvatar] Cannot initialize: missing avatar');
      setError('Avatar not loaded');
      return;
    }

    if (!videoRef.current) {
      console.error('[PublicAvatar] Cannot initialize: video element not found');
      setError('Video element not ready');
      return;
    }

    try {
      console.log('[PublicAvatar] Starting avatar initialization...');
      setIsConnecting(true);
      setError('');

      console.log('[PublicAvatar] Creating service instances...');
      avatarServiceRef.current = new HeyGenAvatarService();
      openaiServiceRef.current = new OpenAIAssistantService();
      openaiServiceRef.current.setSystemPrompt(avatar.system_prompt);

      console.log('[PublicAvatar] Initializing HeyGen avatar with ID:', avatar.heygen_avatar_id);
      await avatarServiceRef.current.initialize(
        videoRef.current,
        avatar.heygen_avatar_id
      );
      console.log('[PublicAvatar] HeyGen avatar initialized successfully');

      console.log('[PublicAvatar] Setting up speech recognition...');
      if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
        const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
        recognitionRef.current = new SpeechRecognition();
        recognitionRef.current.continuous = true;
        recognitionRef.current.interimResults = true;
        recognitionRef.current.lang = 'en-US';
        console.log('[PublicAvatar] Speech recognition configured');

        recognitionRef.current.onresult = async (event: any) => {
          let finalTranscript = '';

          for (let i = event.resultIndex; i < event.results.length; i++) {
            const transcript = event.results[i][0].transcript;
            if (event.results[i].isFinal) {
              finalTranscript += transcript;
            }
          }

          if (finalTranscript) {
            await handleUserMessage(finalTranscript);
          }
        };

        recognitionRef.current.onerror = (event: any) => {
          console.error('[PublicAvatar] Speech recognition error:', event.error);
          if (event.error !== 'no-speech') {
            setError('Voice recognition error. Please try again.');
          }
        };

        recognitionRef.current.onend = () => {
          if (isInitialized && !isSpeaking) {
            try {
              recognitionRef.current?.start();
            } catch (e) {
              console.log('[PublicAvatar] Recognition restart skipped');
            }
          }
        };

        recognitionRef.current.start();
        console.log('[PublicAvatar] Speech recognition started');
      } else {
        console.warn('[PublicAvatar] Speech recognition not available in this browser');
      }

      setIsInitialized(true);
      setIsConnecting(false);
      console.log('[PublicAvatar] Avatar fully initialized');

      const greeting = `Hello! I'm ${avatar.name.split(' - ')[0]}. How can I assist you today?`;
      const entry: ConversationEntry = {
        role: 'assistant',
        text: greeting,
        timestamp: new Date()
      };
      setConversationEntries([entry]);

      console.log('[PublicAvatar] Speaking greeting...');
      await avatarServiceRef.current.speak(greeting);
      console.log('[PublicAvatar] Greeting completed');
    } catch (err) {
      console.error('[PublicAvatar] Fatal error during initialization:', err);
      if (err instanceof Error) {
        console.error('[PublicAvatar] Error message:', err.message);
        console.error('[PublicAvatar] Error stack:', err.stack);
      }
      setError('Failed to initialize avatar. Please check console for details and try again.');
      setIsConnecting(false);
    }
  };

  const handleUserMessage = async (message: string) => {
    if (!avatarServiceRef.current || !openaiServiceRef.current || !message.trim() || isSpeaking) {
      return;
    }

    try {
      setIsSpeaking(true);

      const userEntry: ConversationEntry = {
        role: 'user',
        text: message,
        timestamp: new Date()
      };
      setConversationEntries(prev => [...prev, userEntry]);

      const response = await openaiServiceRef.current.sendMessage(message);

      const assistantEntry: ConversationEntry = {
        role: 'assistant',
        text: response,
        timestamp: new Date()
      };
      setConversationEntries(prev => [...prev, assistantEntry]);

      await avatarServiceRef.current.speak(response);
    } catch (err) {
      console.error('[PublicAvatar] Error processing message:', err);
      const errorMsg = 'I apologize, but I encountered an error. Could you please try again?';
      const errorEntry: ConversationEntry = {
        role: 'assistant',
        text: errorMsg,
        timestamp: new Date()
      };
      setConversationEntries(prev => [...prev, errorEntry]);

      if (avatarServiceRef.current) {
        await avatarServiceRef.current.speak(errorMsg);
      }
    } finally {
      setIsSpeaking(false);
    }
  };

  const endSession = async () => {
    try {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      if (avatarServiceRef.current) {
        await avatarServiceRef.current.close();
      }
      setIsInitialized(false);
      setConversationEntries([]);
      window.location.reload();
    } catch (err) {
      console.error('[PublicAvatar] Error ending session:', err);
    }
  };

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
          <div className="text-center">
            {isConnecting ? (
              <div className="text-center">
                <div className="relative w-24 h-24 mx-auto mb-6">
                  <div className="absolute inset-0 rounded-full border-4 border-white/30"></div>
                  <div className="absolute inset-0 rounded-full border-4 border-t-white animate-spin"></div>
                </div>
                <p className="text-white text-xl font-medium animate-pulse">
                  Connecting...
                </p>
              </div>
            ) : (
              <div className="text-center px-6">
                <div className="w-32 h-32 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-full flex items-center justify-center mx-auto mb-8 shadow-2xl shadow-blue-500/50">
                  <MessageCircle className="w-16 h-16 text-white" />
                </div>
                <h2 className="text-3xl font-bold text-white mb-3">{link.title}</h2>
                <p className="text-slate-300 text-lg mb-2 max-w-md mx-auto">
                  {avatar.name}
                </p>
                <p className="text-slate-400 text-sm mb-8 max-w-md mx-auto">
                  Start a conversation with your AI assistant
                </p>
                <button
                  onClick={initializeAvatar}
                  disabled={loading || isConnecting}
                  className="px-10 py-4 bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-xl text-lg font-semibold hover:shadow-2xl hover:shadow-blue-500/50 transition-all duration-300 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Start Conversation
                </button>
                {error && (
                  <div className="mt-6 p-4 bg-red-500/20 border border-red-500/50 rounded-lg max-w-md mx-auto">
                    <p className="text-red-300 text-sm">{error}</p>
                  </div>
                )}
              </div>
            )}
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

            {conversationEntries.length === 0 ? (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center">
                  <MessageCircle className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                  <p className="text-slate-500 text-sm italic">
                    Start speaking to see the conversation here
                  </p>
                </div>
              </div>
            ) : (
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
                      <span className={`text-xs font-semibold ${
                        entry.role === 'user' ? 'text-blue-400' : 'text-emerald-400'
                      }`}>
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
            )}
          </div>
        )}
      </div>

      {isInitialized && (
        <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-20 bg-slate-900/80 backdrop-blur-sm px-6 py-3 rounded-full border border-slate-700">
          {isSpeaking ? (
            <div className="flex items-center gap-3">
              <div className="flex gap-1">
                <div className="w-1 h-4 bg-blue-400 rounded-full animate-pulse" style={{ animationDelay: '0ms' }}></div>
                <div className="w-1 h-4 bg-blue-400 rounded-full animate-pulse" style={{ animationDelay: '150ms' }}></div>
                <div className="w-1 h-4 bg-blue-400 rounded-full animate-pulse" style={{ animationDelay: '300ms' }}></div>
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
        <span className="font-semibold text-white/60">HeyGen</span>
      </div>
    </div>
  );
}
