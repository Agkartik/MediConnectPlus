import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MessageCircle, X, Send, Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/contexts/AuthContext";
import { sendAssistantMessage } from "@/services/medicalService";

const WELCOME =
  "Hi! Ask how the app works, or about a medicine (e.g. Dolo 650, paracetamol, ibuprofen)—I can outline what it’s for, common side effects, and cautions. Educational only; ask your doctor or pharmacist for personal advice. Not for emergencies.";

export default function FloatingAssistant() {
  const { isAuthenticated, ready } = useAuth();
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<{ role: "user" | "assistant"; content: string }[]>([
    { role: "assistant", content: WELCOME },
  ]);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, open]);

  if (!ready || !isAuthenticated) return null;

  const send = async () => {
    const text = input.trim();
    if (!text || loading) return;
    setInput("");
    const next = [...messages, { role: "user" as const, content: text }];
    setMessages(next);
    setLoading(true);
    try {
      const { reply } = await sendAssistantMessage(next);
      setMessages([...next, { role: "assistant", content: reply }]);
    } catch {
      setMessages([
        ...next,
        {
          role: "assistant",
          content: "Sorry, I couldn’t reach the assistant service. Check that the API is running and you’re logged in.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <motion.button
        type="button"
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="fixed bottom-5 right-5 z-[100] flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-primary to-accent text-primary-foreground shadow-lg hover:opacity-95 md:bottom-6 md:right-6"
        onClick={() => setOpen((o) => !o)}
        aria-label={open ? "Close assistant" : "Open assistant"}
      >
        {open ? <X className="h-6 w-6" /> : <MessageCircle className="h-6 w-6" />}
      </motion.button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 12, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.98 }}
            className="fixed bottom-24 right-5 z-[100] flex w-[min(100vw-2rem,22rem)] flex-col overflow-hidden rounded-2xl border border-border/60 bg-background shadow-2xl md:bottom-28 md:right-6 md:w-[26rem]"
          >
            <div className="flex items-center gap-2 border-b border-border/50 bg-secondary/40 px-4 py-3">
              <Sparkles className="h-4 w-4 text-primary shrink-0" />
              <div className="min-w-0">
                <p className="text-sm font-semibold font-heading">MediConnect Assistant</p>
                <p className="text-[10px] text-muted-foreground leading-tight">
                  Educational only · Not medical advice
                </p>
              </div>
            </div>
            <div className="max-h-[min(55vh,320px)] overflow-y-auto px-3 py-3 space-y-3">
              {messages.map((m, i) => (
                <div
                  key={i}
                  className={`rounded-xl px-3 py-2 text-sm ${
                    m.role === "user"
                      ? "ml-6 bg-primary/15 text-foreground"
                      : "mr-4 bg-muted/80 text-muted-foreground"
                  }`}
                >
                  <p className="whitespace-pre-wrap leading-relaxed">{m.content}</p>
                </div>
              ))}
              {loading && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground px-1">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Thinking…
                </div>
              )}
              <div ref={bottomRef} />
            </div>
            <div className="border-t border-border/50 p-2 flex gap-2">
              <Textarea
                placeholder="Ask about the app or general health info…"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                className="min-h-[44px] max-h-28 resize-none text-sm"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    send();
                  }
                }}
                disabled={loading}
              />
              <Button type="button" size="icon" className="shrink-0 gradient-primary text-primary-foreground" onClick={send} disabled={loading || !input.trim()}>
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
