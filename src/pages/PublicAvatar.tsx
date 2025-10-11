import React, { useEffect, useState, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { PublicLink } from '../types/db';
import { HeyGenAvatarService } from '../lib/heygen';
import { OpenAIAssistantService } from '../lib/openai';
import { Mic, MicOff, AlertCircle, Loader } from 'lucide-react';

export default function PublicAvatar() {
  const { slug } = useParams<{ slug: string }>();
  const [link, setLink] = useState<PublicLink | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isInitialized, setIsInitialized] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [userInput, setUserInput] = useState('');

  const videoRef = useRef<HTMLVideoElement>(null);
  const avatarServiceRef = useRef<HeyGenAvatarService | null>(null);
  const openaiServiceRef = useRef<OpenAIAssistantService | null>(null);
  const recognitionRef = useRef<any>(null);

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

  const loadLink = async () => {
    try {
      const { data, error } = await supabase
        .from('public_links')
        .select('*')
        .eq('slug', slug)
        .maybeSingle();

      if (error) throw error;

      if (!data) {
        setError('Link not found');
        return;
      }

      if (!data.is_enabled) {
        setError('This link has been disabled');
        return;
      }

      setLink(data);
    } catch (err) {
      console.error('Error loading link:', err);
      setError('Failed to load avatar configuration');
    } finally {
      setLoading(false);
    }
  };

  const initializeAvatar = async () => {
    if (!videoRef.current || !link) return;

    try {
      setLoading(true);
      setError('');

      avatarServiceRef.current = new HeyGenAvatarService();
      openaiServiceRef.current = new OpenAIAssistantService();

      await avatarServiceRef.current.initialize(
        videoRef.current,
        link.config.avatarName
      );

      if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
        const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
        recognitionRef.current = new SpeechRecognition();
        recognitionRef.current.continuous = false;
        recognitionRef.current.interimResults = false;
        recognitionRef.current.lang = 'en-US';

        recognitionRef.current.onresult = async (event: any) => {
          const transcript = event.results[0][0].transcript;
          setUserInput(transcript);
          await handleUserMessage(transcript);
        };

        recognitionRef.current.onerror = (event: any) => {
          console.error('Speech recognition error:', event.error);
          setIsListening(false);
        };

        recognitionRef.current.onend = () => {
          setIsListening(false);
        };
      }

      setIsInitialized(true);

      const greeting = "Hello! I'm Estate Buddy, your real estate assistant. How can I help you find your perfect property today?";
      setTranscript(prev => `Assistant: ${greeting}\n\n${prev}`);
      await avatarServiceRef.current.speak(greeting);
    } catch (err) {
      console.error('Error initializing avatar:', err);
      setError('Failed to initialize avatar. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleUserMessage = async (message: string) => {
    if (!avatarServiceRef.current || !openaiServiceRef.current || !message.trim()) {
      return;
    }

    try {
      setIsSpeaking(true);
      setTranscript(prev => `You: ${message}\n\n${prev}`);

      const response = await openaiServiceRef.current.sendMessage(message);

      setTranscript(prev => `Assistant: ${response}\n\n${prev}`);

      await avatarServiceRef.current.speak(response);
    } catch (err) {
      console.error('Error processing message:', err);
      const errorMsg = 'I apologize, but I encountered an error. Could you please try again?';
      setTranscript(prev => `Assistant: ${errorMsg}\n\n${prev}`);

      if (avatarServiceRef.current) {
        await avatarServiceRef.current.speak(errorMsg);
      }
    } finally {
      setIsSpeaking(false);
      setUserInput('');
    }
  };

  const toggleListening = () => {
    if (!recognitionRef.current) {
      alert('Speech recognition is not supported in your browser. Please use text input.');
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      recognitionRef.current.start();
      setIsListening(true);
    }
  };

  const handleTextSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (userInput.trim()) {
      await handleUserMessage(userInput);
    }
  };

  if (loading && !isInitialized) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-cyan-50 via-blue-50 to-indigo-50 flex items-center justify-center">
        <div className="text-center">
          <Loader className="w-12 h-12 text-cyan-600 animate-spin mx-auto mb-4" />
          <div className="text-gray-600">Loading...</div>
        </div>
      </div>
    );
  }

  if (error || !link) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-cyan-50 via-blue-50 to-indigo-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl p-8 max-w-md w-full text-center border border-red-200">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Error</h2>
          <p className="text-gray-600">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-cyan-50 via-blue-50 to-indigo-50 flex flex-col items-center justify-center p-4">
      <div className="max-w-5xl w-full">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-3">{link.title}</h1>
          <p className="text-lg text-gray-600">
            {link.config.avatarName || 'Estate Buddy'} is ready to help you
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <div className="bg-white rounded-3xl shadow-2xl overflow-hidden border border-gray-200">
              <div className="aspect-video bg-gradient-to-br from-gray-900 to-gray-800 relative">
                {!isInitialized ? (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center">
                      <div className="w-32 h-32 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-full flex items-center justify-center mx-auto mb-6 animate-pulse">
                        <Mic className="w-16 h-16 text-white" />
                      </div>
                      <p className="text-white text-xl font-medium mb-8">
                        Ready to start the conversation
                      </p>
                      <button
                        onClick={initializeAvatar}
                        disabled={loading}
                        className="px-12 py-5 bg-gradient-to-r from-cyan-500 to-blue-600 text-white rounded-2xl text-xl font-semibold hover:shadow-2xl transition-all duration-200 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {loading ? 'Initializing...' : 'Start Conversation'}
                      </button>
                    </div>
                  </div>
                ) : (
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    className="w-full h-full object-cover"
                  />
                )}
              </div>

              {isInitialized && (
                <div className="p-6 bg-gray-50 border-t border-gray-200">
                  <form onSubmit={handleTextSubmit} className="space-y-4">
                    <div className="flex gap-3">
                      <input
                        type="text"
                        value={userInput}
                        onChange={(e) => setUserInput(e.target.value)}
                        placeholder="Type your message or use voice..."
                        className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                        disabled={isSpeaking || isListening}
                      />
                      <button
                        type="button"
                        onClick={toggleListening}
                        disabled={isSpeaking}
                        className={`px-6 py-3 rounded-lg font-medium transition-all ${
                          isListening
                            ? 'bg-red-500 text-white hover:bg-red-600'
                            : 'bg-cyan-600 text-white hover:bg-cyan-700'
                        } disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2`}
                      >
                        {isListening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                        {isListening ? 'Stop' : 'Voice'}
                      </button>
                      <button
                        type="submit"
                        disabled={!userInput.trim() || isSpeaking || isListening}
                        className="px-8 py-3 bg-gradient-to-r from-cyan-500 to-blue-600 text-white rounded-lg font-medium hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Send
                      </button>
                    </div>
                    {isSpeaking && (
                      <div className="text-center text-sm text-gray-600">
                        <Loader className="w-4 h-4 animate-spin inline mr-2" />
                        Processing your request...
                      </div>
                    )}
                  </form>
                </div>
              )}
            </div>
          </div>

          <div className="lg:col-span-1">
            <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm h-full">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Conversation</h3>
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {transcript ? (
                  <pre className="text-sm text-gray-700 whitespace-pre-wrap font-sans">
                    {transcript}
                  </pre>
                ) : (
                  <p className="text-sm text-gray-500 italic">
                    Conversation will appear here...
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="mt-8 text-center">
          <div className="inline-flex items-center gap-4 text-sm text-gray-600 bg-white px-6 py-3 rounded-full shadow-sm">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
              <span>Voice Enabled</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
              <span>AI Powered</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-cyan-500 rounded-full"></div>
              <span>Real-time</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
