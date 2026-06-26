import { Bot, User, Loader2 } from "lucide-react";
import ReactMarkdown from "react-markdown";
import rehypeSanitize from "rehype-sanitize";

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface AIChatMessagesProps {
  messages: Message[];
  isLoading: boolean;
  variant: "panel" | "page";
}

export function AIChatMessages({ messages, isLoading, variant }: AIChatMessagesProps) {
  const isPanel = variant === "panel";

  const botAvatar = (
    <div
      className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full"
      style={{ backgroundColor: "hsl(var(--primary) / 0.10)", color: "hsl(var(--primary))" }}
      aria-hidden="true"
    >
      <Bot className="h-3.5 w-3.5" />
    </div>
  );

  return (
    <div className={`${isPanel ? "space-y-3 p-3" : "mx-auto max-w-3xl space-y-4 p-4 md:p-6"}`}>
      {messages.map((msg, i) => (
        <div key={i} className={`flex gap-2.5 ${msg.role === "user" ? "justify-end" : ""}`}>
          {msg.role === "assistant" && botAvatar}
          <div className={`${isPanel ? "max-w-[85%]" : "max-w-[75%]"} ${
            msg.role === "user"
              ? "rounded-2xl rounded-br-sm bg-primary px-3.5 py-2 text-primary-foreground"
              : "rounded-2xl rounded-bl-sm border border-border bg-muted/50 px-3.5 py-2"
          }`}>
            {msg.role === "assistant" ? (
              <div className={`prose prose-sm max-w-none ${isPanel ? "text-xs" : "text-sm"} text-foreground
                prose-headings:text-foreground prose-strong:text-foreground prose-em:text-muted-foreground
                prose-li:text-foreground prose-p:text-foreground prose-code:text-foreground
                prose-blockquote:text-muted-foreground prose-blockquote:border-[hsl(var(--primary)/0.30)]`}>
                <ReactMarkdown rehypePlugins={[rehypeSanitize]}>{msg.content}</ReactMarkdown>
              </div>
            ) : (
              <p className={`${isPanel ? "text-xs" : "text-sm"}`}>{msg.content}</p>
            )}
          </div>
          {msg.role === "user" && (
            <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground" aria-hidden="true">
              <User className="h-3.5 w-3.5" />
            </div>
          )}
        </div>
      ))}
      {isLoading && messages[messages.length - 1]?.role === "user" && (
        <div className="flex gap-2.5">
          {botAvatar}
          <div className="rounded-2xl rounded-bl-sm border border-border bg-muted/50 px-3.5 py-2">
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground motion-reduce:animate-none" />
          </div>
        </div>
      )}
    </div>
  );
}
