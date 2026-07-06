import { useState, useRef, useEffect, useCallback } from "react";
import { Bot, X } from "lucide-react";
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

// Preview answers read the same demo stores as /tasks and /projects — the
// assistant must never contradict what those pages show. Read-only: it only
// summarizes, never mutates. If a store can't be loaded, fall back to a
// generic pointer instead of breaking the chat.
async function getMockResponse(question: string): Promise<string> {
  const q = question.toLowerCase();
  if (q.includes("assigned") || q.includes("project")) {
    try {
      const { fetchProjects } = await import("@/services/projectService");
      const { items } = await fetchProjects(0);
      if (items.length === 0) {
        return "Based on your current data, here's a summary of your projects:\n\n- You don't have any projects created yet.\n\n**Tip:** Create a project from the sidebar navigation, then come back and ask me again!";
      }
      const active = items.filter((p) => p.status === "active").length;
      const lines = items.slice(0, 5).map((p) => `- **${p.title}** — ${p.status}`);
      return `Based on your current data, here's a summary of your projects:\n\n${lines.join("\n")}\n\nYou have ${items.length} project${items.length === 1 ? "" : "s"} in view — ${active} ${active === 1 ? "is" : "are"} active.`;
    } catch {
      return "I couldn't read your projects just now — head to **Projects** to review them directly.";
    }
  }
  if (q.includes("overdue") || q.includes("task")) {
    try {
      const { fetchTasks } = await import("@/services/taskService");
      const { items } = await fetchTasks(0);
      const active = items
        .filter((t) => t.status === "active")
        .sort((a, b) => (a.due_date ?? "9999").localeCompare(b.due_date ?? "9999"));
      if (active.length === 0) {
        return "Looking at your tasks:\n\n- You don't have any active tasks right now.\n\n**Tip:** Head to **My Tasks** to create some, then I can help you track deadlines and progress.";
      }
      const today = new Date().toISOString().split("T")[0];
      const weekOut = new Date(Date.now() + 7 * 86_400_000).toISOString().split("T")[0];
      const overdue = active.filter((t) => t.due_date && t.due_date < today).length;
      const dueSoon = active.filter((t) => t.due_date && t.due_date >= today && t.due_date <= weekOut).length;
      const fmt = (d: string) => new Date(d).toLocaleDateString(undefined, { month: "short", day: "numeric" });
      const lines = active.slice(0, 5).map((t) => `- **${t.title}**${t.due_date ? ` — due ${fmt(t.due_date)}` : ""}`);
      const tail = [
        `You have ${active.length} active task${active.length === 1 ? "" : "s"}`,
        overdue > 0 ? `${overdue} ${overdue === 1 ? "is" : "are"} overdue` : null,
        dueSoon > 0 ? `${dueSoon} ${dueSoon === 1 ? "is" : "are"} due this week` : null,
      ].filter(Boolean).join(" — ");
      return `Looking at your tasks:\n\n${lines.join("\n")}\n\n${tail}.`;
    } catch {
      return "I couldn't read your tasks just now — head to **My Tasks** to review them directly.";
    }
  }
  if (q.includes("activity") || q.includes("change") || q.includes("recent")) {
    return "Here's your recent activity summary:\n\n- No recent activity recorded yet.\n\nOnce you start creating tasks and projects, I'll be able to summarize changes, updates, and stakeholder activity for you.";
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
      const response = await getMockResponse(content);
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
        <div className="flex h-12 shrink-0 items-center justify-between border-b border-border px-3">
          <div className="flex items-center gap-2">
            <span
              className="flex h-6 w-6 items-center justify-center rounded-md"
              style={{ backgroundColor: "hsl(var(--primary) / 0.10)", color: "hsl(var(--primary))" }}
              aria-hidden="true"
            >
              <Bot className="h-3.5 w-3.5" />
            </span>
            <span className="text-sm font-medium">AI Assistant</span>
            <Badge variant="outline" className="h-4 text-[9px]">Read-only</Badge>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="h-7 w-7 text-muted-foreground hover:text-foreground"
            aria-label="Close assistant"
          >
            <X className="h-4 w-4" />
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
