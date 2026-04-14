import { useState, useRef, useEffect, useCallback } from "react";
import { Bot } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { isPreviewEnvironment } from "@/lib/environment";
import { AIChatEmptyState } from "@/components/AIChatEmptyState";
import { AIChatMessages } from "@/components/AIChatMessages";
import { AIChatInput } from "@/components/AIChatInput";

const IS_PREVIEW = isPreviewEnvironment();
const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-assistant`;

interface Message {
  role: "user" | "assistant";
  content: string;
}

function getMockResponse(question: string): string {
  const q = question.toLowerCase();
  if (q.includes("assigned") || q.includes("project")) {
    return "Based on your current data, here's a summary of your projects:\n\n- You don't have any projects created yet in this preview session.\n\n**Tip:** Create a project from the sidebar navigation, then come back and ask me again!";
  }
  if (q.includes("overdue") || q.includes("task")) {
    return "Looking at your tasks:\n\n- You don't have any tasks created yet in this preview session.\n\n**Tip:** Head to **My Tasks** to create some, then I can help you track deadlines and progress.";
  }
  if (q.includes("activity") || q.includes("change") || q.includes("recent")) {
    return "Here's your recent activity summary:\n\n- No recent activity recorded yet in this preview session.\n\nOnce you start creating tasks and projects, I'll be able to summarize changes, updates, and stakeholder activity for you.";
  }
  return `I'm the **Premier Project Hub AI Assistant** — a read-only helper that can answer questions about your tasks, projects, stakeholders, and activity.\n\nHere are some things you can ask me:\n- *What projects am I assigned to?*\n- *Which tasks are overdue?*\n- *Summarize recent changes on a project*\n- *Who owns the most active projects?*\n\n> ⚠️ I'm currently in **preview mode** with limited mock data. Connect to production for full access.`;
}

interface AIChatProps {
  variant: "panel" | "page";
  onClose?: () => void;
}

export function AIChat({ variant, onClose }: AIChatProps) {
  useAuth(); // ensure auth context is available
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  const sendMessage = useCallback(async (content: string) => {
    if (!content.trim() || isLoading) return;
    const userMsg: Message = { role: "user", content: content.trim() };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput("");
    setIsLoading(true);

    if (IS_PREVIEW) {
      const response = getMockResponse(content);
      let soFar = "";
      const words = response.split(" ");
      for (let i = 0; i < words.length; i++) {
        soFar += (i > 0 ? " " : "") + words[i];
        const captured = soFar;
        await new Promise((r) => setTimeout(r, 30));
        setMessages((prev) => {
          const last = prev[prev.length - 1];
          if (last?.role === "assistant") return prev.map((m, idx) => idx === prev.length - 1 ? { ...m, content: captured } : m);
          return [...prev, { role: "assistant", content: captured }];
        });
      }
      setIsLoading(false);
      return;
    }

    try {
      const token = (await (await import("@/integrations/supabase/client")).supabase.auth.getSession()).data.session?.access_token;
      const resp = await fetch(CHAT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        },
        body: JSON.stringify({ messages: newMessages.map((m) => ({ role: m.role, content: m.content })) }),
      });

      if (!resp.ok) {
        const errData = await resp.json().catch(() => ({ error: "AI service unavailable" }));
        setMessages((prev) => [...prev, { role: "assistant", content: `⚠️ ${errData.error || "Something went wrong. Please try again."}` }]);
        setIsLoading(false);
        return;
      }

      if (!resp.body) throw new Error("No response body");
      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let textBuffer = "";
      let assistantSoFar = "";

      const processLine = (line: string) => {
        if (line.endsWith("\r")) line = line.slice(0, -1);
        if (line.startsWith(":") || line.trim() === "" || !line.startsWith("data: ")) return false;
        const jsonStr = line.slice(6).trim();
        if (jsonStr === "[DONE]") return true;
        try {
          const parsed = JSON.parse(jsonStr);
          const content = parsed.choices?.[0]?.delta?.content as string | undefined;
          if (content) {
            assistantSoFar += content;
            const captured = assistantSoFar;
            setMessages((prev) => {
              const last = prev[prev.length - 1];
              if (last?.role === "assistant") return prev.map((m, i) => i === prev.length - 1 ? { ...m, content: captured } : m);
              return [...prev, { role: "assistant", content: captured }];
            });
          }
        } catch { /* incomplete chunk */ }
        return false;
      };

      let streamDone = false;
      while (!streamDone) {
        const { done, value } = await reader.read();
        if (done) break;
        textBuffer += decoder.decode(value, { stream: true });
        let newlineIndex: number;
        while ((newlineIndex = textBuffer.indexOf("\n")) !== -1) {
          const line = textBuffer.slice(0, newlineIndex);
          textBuffer = textBuffer.slice(newlineIndex + 1);
          if (processLine(line)) { streamDone = true; break; }
        }
      }

      // Final flush
      if (textBuffer.trim()) {
        for (const raw of textBuffer.split("\n")) {
          if (raw) processLine(raw);
        }
      }
    } catch (err) {
      console.error("AI chat error:", err);
      setMessages((prev) => [...prev, { role: "assistant", content: "⚠️ Failed to connect to the AI assistant. Please try again." }]);
    } finally {
      setIsLoading(false);
    }
  }, [messages, isLoading]);

  const isPanel = variant === "panel";

  return (
    <div className={`flex flex-col ${isPanel ? "h-full" : "h-[calc(100vh-7rem)]"} bg-card`}>
      {isPanel && onClose && (
        <div className="h-12 flex items-center justify-between px-4 border-b border-border shrink-0">
          <div className="flex items-center gap-2">
            <Bot className="h-4 w-4 text-accent" />
            <span className="font-medium text-sm">AI Assistant</span>
            <Badge variant="outline" className="text-[9px] h-4">Read-only</Badge>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} className="h-7 w-7">
            <span className="sr-only">Close</span>×
          </Button>
        </div>
      )}

      <div ref={scrollRef} className="flex-1 overflow-y-auto">
        {messages.length === 0 ? (
          <AIChatEmptyState variant={variant} onSend={sendMessage} />
        ) : (
          <AIChatMessages messages={messages} isLoading={isLoading} variant={variant} />
        )}
      </div>

      <AIChatInput
        input={input}
        onInputChange={setInput}
        onSubmit={() => sendMessage(input)}
        onClear={() => setMessages([])}
        isLoading={isLoading}
        hasMessages={messages.length > 0}
        variant={variant}
      />
    </div>
  );
}
