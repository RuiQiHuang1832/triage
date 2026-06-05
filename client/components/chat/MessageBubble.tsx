import type { ReactNode } from "react";
import ReactMarkdown from "react-markdown";
import { cn } from "@/lib/utils";

export function MessageBubble({ role, children }: { role: "user" | "assistant"; children: ReactNode }) {
  const isUser = role === "user";
  return (
    <div className={cn("flex w-full", isUser ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed wrap-break-word",
          isUser ? "rounded-br-md bg-primary text-primary-foreground whitespace-pre-wrap" : "rounded-bl-md text-foreground",
        )}
      >
        {isUser || typeof children !== "string" ? children : <AssistantMarkdown content={children} />}
      </div>
    </div>
  );
}

// Renders the assistant's text as markdown. The element styles below give lists, headings, code, and paragraphs sensible spacing inside the bubble, since we don't pull in the Tailwind typography plugin.
function AssistantMarkdown({ content }: { content: string }) {
  return (
    <div className="space-y-2">
      <ReactMarkdown
        components={{
          p: ({ children }) => <p className="whitespace-pre-wrap">{children}</p>,
          ul: ({ children }) => <ul className="list-disc space-y-1 pl-5">{children}</ul>,
          ol: ({ children }) => <ol className="list-decimal space-y-1 pl-5">{children}</ol>,
          li: ({ children }) => <li className="leading-relaxed">{children}</li>,
          h1: ({ children }) => <h1 className="text-base font-semibold">{children}</h1>,
          h2: ({ children }) => <h2 className="text-base font-semibold">{children}</h2>,
          h3: ({ children }) => <h3 className="text-sm font-semibold">{children}</h3>,
          strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
          a: ({ children, href }) => (
            <a href={href} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2">
              {children}
            </a>
          ),
          code: ({ children }) => <code className="rounded bg-muted px-1 py-0.5 font-mono text-xs">{children}</code>,
          pre: ({ children }) => <pre className="overflow-x-auto rounded bg-muted p-3 font-mono text-xs">{children}</pre>,
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
