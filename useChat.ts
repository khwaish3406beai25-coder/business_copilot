/**
 * useChat — manages AI chat conversation state.
 * Implemented in Phase 6.
 */
import { useState } from "react";
import type { ChatMessage } from "@/types";

export function useChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sendMessage = async (content: string) => {
    // TODO (Phase 6): POST /api/chat and append response to messages
  };

  return { messages, isLoading, error, sendMessage };
}
