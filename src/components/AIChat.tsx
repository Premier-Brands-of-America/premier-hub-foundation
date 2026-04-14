import { useState, useRef, useEffect, useCallback } from "react";
import { Bot, Send, User, Loader2, Info, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";

import { Badge } from "@/components/ui/badge";
import ReactMarkdown from "react-markdown";
import { useAuth } from "@/contexts/AuthContext";
import { isPreviewEnvironment } from "@/lib/environment";

const IS_PREVIEW = isPreviewEnvironment();
const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-assistant`;

interface Message {
  role: "user" | "assistant";
  content: string;
}

const EXAMPLE_QUESTIONS = [
  "What projects am I assigned to?",
  "Which of my tasks are overdue?",
  "Summarize my recent activity",
  "Who owns the most projects?",
];

// Preview mock responses
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
  const { user, profile: _profile } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const sendMessage = useCallback(async (content: string) => {
    if (!content.trim() || isLoading) return;

    const userMsg: Message = { role: "user", content: content.trim() };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput("");
    setIsLoading(true);

    if (IS_PREVIEW) {
      // Simulate streaming in preview
      const response = getMockResponse(content);
      let soFar = "";
      const words = response.split(" ");
      for (let i = 0; i < words.length; i++) {
        soFar += (i > 0 ? " " : "") + words[i];
        const captured = soFar;
        await new Promise((r) => setTimeout(r, 30));
        setMessages((prev) => {
          const last = prev[prev.length - 1];
          if (last?.role === "assistant") {
            return prev.map((m, idx) => idx === prev.length - 1 ? { ...m, content: captured } : m);
          }
          return [...prev, { role: "assistant", content: captured }];
        });
      }
      setIsLoading(false);
      return;
    }

    // Real streaming call
    try {
      const token = (await (await import("@/integrations/supabase/client")).supabase.auth.getSession()).data.session?.access_token;
      
      const resp = await fetch(CHAT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        },
        body: JSON.stringify({
          messages: newMessages.map((m) => ({ role: m.role, content: m.content })),
        }),
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
      let streamDone = false;

      while (!streamDone) {
        const { done, value } = await reader.read();
        if (done) break;
        textBuffer += decoder.decode(value, { stream: true });

        let newlineIndex: number;
        while ((newlineIndex = textBuffer.indexOf("\n")) !== -1) {
          let line = textBuffer.slice(0, newlineIndex);
          textBuffer = textBuffer.slice(newlineIndex + 1);

          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (line.startsWith(":") || line.trim() === "") continue;
          if (!line.startsWith("data: ")) continue;

          const jsonStr = line.slice(6).trim();
          if (jsonStr === "[DONE]") {
            streamDone = true;
            break;
          }

          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content as string | undefined;
            if (content) {
              assistantSoFar += content;
              const captured = assistantSoFar;
              setMessages((prev) => {
                const last = prev[prev.length - 1];
                if (last?.role === "assistant") {
                  return prev.map((m, i) => i === prev.length - 1 ? { ...m, content: captured } : m);
                }
                return [...prev, { role: "assistant", content: captured }];
              });
            }
          } catch {
            textBuffer = line + "\n" + textBuffer;
            break;
          }
        }
      }

      // Final flush
      if (textBuffer.trim()) {
        for (let raw of textBuffer.split("\n")) {
          if (!raw) continue;
          if (raw.endsWith("\r")) raw = raw.slice(0, -1);
          if (!raw.startsWith("data: ")) continue;
          const jsonStr = raw.slice(6).trim();
          if (jsonStr === "[DONE]") continue;
          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) {
              assistantSoFar += content;
              const captured = assistantSoFar;
              setMessages((prev) => {
                const last = prev[prev.length - 1];
                if (last?.role === "assistant") {
                  return prev.map((m, i) => i === prev.length - 1 ? { ...m, content: captured } : m);
                }
                return [...prev, { role: "assistant", content: captured }];
              });
            }
          } catch {}
        }
      }
    } catch (err) {
      console.error("AI chat error:", err);
      setMessages((prev) => [...prev, { role: "assistant", content: "⚠️ Failed to connect to the AI assistant. Please try again." }]);
    } finally {
      setIsLoading(false);
    }
  }, [messages, isLoading]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(input);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  const clearChat = () => {
    setMessages([]);
  };

  const isPanel = variant === "panel";

  return (
    <div className={`flex flex-col ${isPanel ? "h-full" : "h-[calc(100vh-7rem)]"} bg-card`}>
      {/* Header - only for panel; page has its own header */}
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

      {/* Messages area */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto">
        {messages.length === 0 ? (
          <div className={`flex flex-col items-center justify-center ${isPanel ? "py-8 px-4" : "py-16 px-6"} text-center space-y-4`}>
            <div className={`${isPanel ? "w-10 h-10" : "w-14 h-14"} rounded-full bg-accent/10 flex items-center justify-center`}>
              <Bot className={`${isPanel ? "h-5 w-5" : "h-7 w-7"} text-accent`} />
            </div>
            <div className="space-y-1">
              <h3 className={`font-semibold text-foreground ${isPanel ? "text-sm" : "text-lg"}`}>
                AI Assistant
              </h3>
              <p className={`text-muted-foreground ${isPanel ? "text-xs" : "text-sm"} max-w-md`}>
                Ask questions about your tasks, projects, stakeholders, and activity. I can only read data — no changes will be made.
              </p>
            </div>
            <div className={`flex flex-wrap gap-2 justify-center ${isPanel ? "max-w-[280px]" : "max-w-lg"}`}>
              {EXAMPLE_QUESTIONS.map((q) => (
                <button
                  key={q}
                  onClick={() => sendMessage(q)}
                  className={`text-left px-3 py-1.5 rounded-lg border border-border bg-background hover:bg-muted hover:border-muted-foreground/30 transition-colors ${isPanel ? "text-[11px]" : "text-xs"}`}
                >
                  {q}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground mt-2">
              <Info className="h-3 w-3" />
              <span>Phase 1 — Read-only assistant. Cannot modify data.</span>
            </div>
          </div>
        ) : (
          <div className={`${isPanel ? "p-3 space-y-3" : "p-4 md:p-6 space-y-4 max-w-3xl mx-auto"}`}>
            {messages.map((msg, i) => (
              <div key={i} className={`flex gap-2.5 ${msg.role === "user" ? "justify-end" : ""}`}>
                {msg.role === "assistant" && (
                  <div className="w-6 h-6 rounded-full bg-accent/10 flex items-center justify-center shrink-0 mt-0.5">
                    <Bot className="h-3.5 w-3.5 text-accent" />
                  </div>
                )}
                <div className={`${isPanel ? "max-w-[85%]" : "max-w-[75%]"} ${
                  msg.role === "user"
                    ? "bg-primary text-primary-foreground rounded-2xl rounded-br-md px-3 py-2"
                    : "bg-muted/70 rounded-2xl rounded-bl-md px-3 py-2"
                }`}>
                  {msg.role === "assistant" ? (
                    <div className={`prose prose-sm max-w-none ${isPanel ? "text-xs" : "text-sm"} text-foreground
                      prose-headings:text-foreground prose-strong:text-foreground prose-em:text-muted-foreground
                      prose-li:text-foreground prose-p:text-foreground prose-code:text-foreground
                      prose-blockquote:text-muted-foreground prose-blockquote:border-accent/30`}>
                      <ReactMarkdown>{msg.content}</ReactMarkdown>
                    </div>
                  ) : (
                    <p className={`${isPanel ? "text-xs" : "text-sm"}`}>{msg.content}</p>
                  )}
                </div>
                {msg.role === "user" && (
                  <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                    <User className="h-3.5 w-3.5 text-primary" />
                  </div>
                )}
              </div>
            ))}
            {isLoading && messages[messages.length - 1]?.role === "user" && (
              <div className="flex gap-2.5">
                <div className="w-6 h-6 rounded-full bg-accent/10 flex items-center justify-center shrink-0">
                  <Bot className="h-3.5 w-3.5 text-accent" />
                </div>
                <div className="bg-muted/70 rounded-2xl rounded-bl-md px-3 py-2">
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Input area */}
      <div className={`border-t border-border ${isPanel ? "p-2.5" : "p-3 md:p-4"}`}>
        {messages.length > 0 && (
          <div className="flex justify-end mb-1.5">
            <Button variant="ghost" size="sm" className="h-6 text-[10px] gap-1 text-muted-foreground" onClick={clearChat}>
              <Trash2 className="h-3 w-3" /> Clear chat
            </Button>
          </div>
        )}
        <form onSubmit={handleSubmit} className={`flex gap-2 ${isPanel ? "" : "max-w-3xl mx-auto"}`}>
          <input
            ref={inputRef as any}
            type="text"
            placeholder="Ask about your tasks, projects, activity..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isLoading}
            className={`flex-1 px-3 rounded-lg border border-input bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring disabled:opacity-50 ${
              isPanel ? "h-8 text-xs" : "h-10 text-sm"
            }`}
          />
          <Button
            type="submit"
            size="icon"
            disabled={!input.trim() || isLoading}
            className={isPanel ? "h-8 w-8" : "h-10 w-10"}
          >
            <Send className={isPanel ? "h-3.5 w-3.5" : "h-4 w-4"} />
          </Button>
        </form>
      </div>
    </div>
  );
}
