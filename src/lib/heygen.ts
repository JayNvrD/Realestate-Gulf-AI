// ✅ Fixed Version of heygen.ts
// This version adds the required Authorization header to resolve the 401 "Missing authorization header" error

import StreamingAvatar, {
  AvatarQuality,
  StreamingEvents,
  TaskType,
} from '@heygen/streaming-avatar';

export class HeyGenAvatarService {
  private avatar: StreamingAvatar | null = null;
  private sessionData: any = null;
  private videoElement: HTMLVideoElement | null = null;

  async initialize(videoElement: HTMLVideoElement, avatarName?: string): Promise<void> {
    try {
      console.log('[HeyGen] Initializing avatar service...');

      this.videoElement = videoElement;

      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

      if (!supabaseUrl || !supabaseAnonKey) {
        throw new Error('Supabase environment variables are not properly set');
      }

      console.log('[HeyGen] Fetching access token from backend...');
      const tokenResponse = await fetch(`${supabaseUrl}/functions/v1/heygen-token`, {
        headers: {
          Authorization: `Bearer ${supabaseAnonKey}`,
          'Content-Type': 'application/json',
        },
      });

      if (!tokenResponse.ok) {
        const errorText = await tokenResponse.text();
        console.error('[HeyGen] Token fetch failed:', errorText);
        throw new Error(`Failed to fetch HeyGen token: ${tokenResponse.status} ${errorText}`);
      }

      const { token } = await tokenResponse.json();
      console.log('[HeyGen] Token received successfully');

      this.avatar = new StreamingAvatar({ token });

      this.avatar.on(StreamingEvents.STREAM_READY, (event) => {
        console.log('[HeyGen] Stream ready event received:', event);
        if (event.detail && this.videoElement) {
          this.videoElement.srcObject = event.detail;
          this.videoElement.onloadedmetadata = () => {
            console.log('[HeyGen] Video metadata loaded, starting playback');
            this.videoElement?.play().catch((error) => {
              console.error('[HeyGen] Video play error:', error);
            });
          };
        } else {
          console.error('[HeyGen] Stream detail is missing in event');
        }
      });

      this.avatar.on(StreamingEvents.STREAM_DISCONNECTED, () => {
        console.log('[HeyGen] Stream disconnected');
        if (this.videoElement) {
          this.videoElement.srcObject = null;
        }
      });

      this.avatar.on(StreamingEvents.AVATAR_START_TALKING, () => {
        console.log('[HeyGen] Avatar started talking');
      });

      this.avatar.on(StreamingEvents.AVATAR_STOP_TALKING, () => {
        console.log('[HeyGen] Avatar stopped talking');
      });

      const avatarConfig = {
        quality: AvatarQuality.High,
        avatarName: avatarName || import.meta.env.VITE_HEYGEN_AVATAR_NAME || 'Wayne_20240711',
      };

      console.log('[HeyGen] Creating avatar session with config:', avatarConfig);
      this.sessionData = await this.avatar.createStartAvatar(avatarConfig);
      console.log('[HeyGen] Avatar session created successfully:', this.sessionData);
    } catch (error) {
      console.error('[HeyGen] Initialization error:', error);
      this.cleanup();
      throw error;
    }
  }

  async speak(text: string): Promise<void> {
    if (!this.avatar) {
      throw new Error('Avatar not initialized. Please call initialize() first.');
    }

    if (!text || text.trim().length === 0) {
      console.warn('[HeyGen] Speak called with empty text, ignoring');
      return;
    }

    try {
      console.log('[HeyGen] Speaking text:', text.substring(0, 50) + '...');
      await this.avatar.speak({
        text,
        taskType: TaskType.REPEAT,
      });
      console.log('[HeyGen] Speech completed successfully');
    } catch (error) {
      console.error('[HeyGen] Speak error:', error);
      throw error;
    }
  }

  async interrupt(): Promise<void> {
    if (!this.avatar) {
      console.warn('[HeyGen] Interrupt called but avatar not initialized');
      return;
    }

    try {
      console.log('[HeyGen] Interrupting avatar...');
      await this.avatar.interrupt();
      console.log('[HeyGen] Avatar interrupted successfully');
    } catch (error) {
      console.error('[HeyGen] Interrupt error:', error);
      throw error;
    }
  }

  async close(): Promise<void> {
    console.log('[HeyGen] Closing avatar service...');

    if (this.avatar) {
      try {
        await this.avatar.stopAvatar();
        console.log('[HeyGen] Avatar stopped successfully');
      } catch (error) {
        console.error('[HeyGen] Error stopping avatar:', error);
      }
      this.avatar = null;
    }

    this.cleanup();
    console.log('[HeyGen] Avatar service closed');
  }

  private cleanup(): void {
    if (this.videoElement) {
      this.videoElement.srcObject = null;
    }
    this.sessionData = null;
    this.videoElement = null;
  }

  isInitialized(): boolean {
    return this.avatar !== null;
  }

  getSessionData(): any {
    return this.sessionData;
  }
}
