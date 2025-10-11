export interface ConversationMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export class OpenAIAssistantService {
  private threadId: string | null = null;
  private messages: ConversationMessage[] = [];

  async sendMessage(message: string): Promise<string> {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;

    const response = await fetch(`${supabaseUrl}/functions/v1/openai-assistant`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message,
        threadId: this.threadId,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`OpenAI Assistant error: ${error}`);
    }

    const data = await response.json();

    if (data.error) {
      throw new Error(data.error);
    }

    this.threadId = data.threadId;

    this.messages.push({
      role: 'user',
      content: message,
      timestamp: new Date(),
    });

    this.messages.push({
      role: 'assistant',
      content: data.text,
      timestamp: new Date(),
    });

    return data.text;
  }

  getMessages(): ConversationMessage[] {
    return this.messages;
  }

  getThreadId(): string | null {
    return this.threadId;
  }

  reset(): void {
    this.threadId = null;
    this.messages = [];
  }
}
