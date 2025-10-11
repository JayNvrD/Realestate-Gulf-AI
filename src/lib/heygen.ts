import StreamingAvatar, {
  AvatarQuality,
  StreamingEvents,
  TaskType,
} from '@heygen/streaming-avatar';

export class HeyGenAvatarService {
  private avatar: StreamingAvatar | null = null;
  private mediaStream: MediaStream | null = null;

  async initialize(videoElement: HTMLVideoElement, avatarName?: string): Promise<void> {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const tokenResponse = await fetch(`${supabaseUrl}/functions/v1/heygen-token`);

    if (!tokenResponse.ok) {
      throw new Error('Failed to fetch HeyGen token');
    }

    const { token } = await tokenResponse.json();

    this.avatar = new StreamingAvatar({ token });

    this.avatar.on(StreamingEvents.STREAM_READY, (event) => {
      console.log('Avatar stream ready:', event);
      if (event.detail && videoElement) {
        this.mediaStream = event.detail;
        videoElement.srcObject = this.mediaStream;
        videoElement.play();
      }
    });

    this.avatar.on(StreamingEvents.STREAM_DISCONNECTED, () => {
      console.log('Avatar disconnected');
      if (videoElement) {
        videoElement.srcObject = null;
      }
    });

    this.avatar.on(StreamingEvents.AVATAR_START_TALKING, () => {
      console.log('Avatar started talking');
    });

    this.avatar.on(StreamingEvents.AVATAR_STOP_TALKING, () => {
      console.log('Avatar stopped talking');
    });

    await this.avatar.createStartAvatar({
      quality: AvatarQuality.High,
      avatarName: avatarName || import.meta.env.VITE_HEYGEN_AVATAR_NAME || 'Wayne_20240711',
      language: 'English',
    });
  }

  async speak(text: string): Promise<void> {
    if (!this.avatar) {
      throw new Error('Avatar not initialized');
    }

    await this.avatar.speak({
      text,
      taskType: TaskType.REPEAT,
    });
  }

  async interrupt(): Promise<void> {
    if (!this.avatar) {
      return;
    }

    await this.avatar.interrupt();
  }

  async close(): Promise<void> {
    if (this.avatar) {
      await this.avatar.stopAvatar();
      this.avatar = null;
    }

    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach(track => track.stop());
      this.mediaStream = null;
    }
  }

  isInitialized(): boolean {
    return this.avatar !== null;
  }
}
