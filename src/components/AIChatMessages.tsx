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

  return (
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
                <ReactMarkdown rehypePlugins={[rehypeSanitize]}>{msg.content}</ReactMarkdown>
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
  );
}
