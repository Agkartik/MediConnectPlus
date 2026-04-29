import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslation } from "react-i18next";
import { Send, Search, MessageSquare } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  getConversations,
  getMessages,
  sendMessage,
  markConversationRead,
  bootstrapPatientConversations,
} from "@/services/medicalService";
import UserAvatar from "@/components/UserAvatar";

const Messages = () => {
  const { t } = useTranslation();
  const [conversations, setConversations] = useState<any[]>([]);
  const [loadingConvs, setLoadingConvs] = useState(true);
  const [activeChat, setActiveChat] = useState("");
  const [messages, setMessages] = useState<any[]>([]);
  const [loadingMsgs, setLoadingMsgs] = useState(false);
  const [message, setMessage] = useState("");
  const [search, setSearch] = useState("");
  const [sending, setSending] = useState(false);

  const prevMsgCountRef = useRef(0);
  const activeChatRef = useRef(activeChat);
  activeChatRef.current = activeChat;

  // Load conversations on mount
  const loadConversations = useCallback(async (silent = false) => {
    if (!silent) setLoadingConvs(true);
    try {
      const data = await getConversations();
      setConversations(data);
      // Auto-select first conversation if none selected
      if (!activeChatRef.current && data.length > 0) {
        setActiveChat(data[0].id);
      }
    } catch (e) {
      console.error("Failed to load conversations:", e);
    } finally {
      if (!silent) setLoadingConvs(false);
    }
  }, []);

  // Load messages for a specific chat
  const loadMessages = useCallback(async (chatId: string, silent = false) => {
    if (!chatId) return;
    if (!silent) setLoadingMsgs(true);
    try {
      const data = await getMessages(chatId);
      setMessages(data);
      prevMsgCountRef.current = data.length;
    } catch (e) {
      console.error("Failed to load messages:", e);
    } finally {
      if (!silent) setLoadingMsgs(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    void bootstrapPatientConversations();
    loadConversations();
  }, [loadConversations]);

  // Load messages when active chat changes
  useEffect(() => {
    if (activeChat) {
      setMessages([]);
      loadMessages(activeChat);
      void markConversationRead(activeChat, "patient");
    }
  }, [activeChat, loadMessages]);

  // Notification permission
  useEffect(() => {
    if (typeof Notification !== "undefined" && Notification.permission === "default") {
      Notification.requestPermission().catch(() => {});
    }
  }, []);

  // Smart polling — only poll when tab is visible
  useEffect(() => {
    const poll = () => {
      if (document.hidden) return; // Skip if tab is not visible
      loadConversations(true);
      if (activeChatRef.current) {
        getMessages(activeChatRef.current).then((data) => {
          // Notify on new messages from doctor
          if (data.length > prevMsgCountRef.current) {
            const newMsg = data[data.length - 1];
            if (newMsg?.sender === "doctor") {
              const conv = conversations.find(c => c.id === activeChatRef.current);
              toast.info(conv?.doctorName || "Doctor", { description: newMsg.text });
              if (typeof Notification !== "undefined" && Notification.permission === "granted") {
                new Notification(`New message from ${conv?.doctorName || "Doctor"}`, { body: newMsg.text });
              }
            }
            prevMsgCountRef.current = data.length;
          }
          setMessages(data);
        }).catch(() => {});
      }
    };

    const iv = setInterval(poll, 3000);
    return () => clearInterval(iv);
  }, [loadConversations, conversations]);

  const handleSend = async () => {
    if (!message.trim() || !activeChat || sending) return;
    const text = message.trim();
    setMessage("");
    setSending(true);
    // Optimistic UI update
    const optimistic = { id: `temp-${Date.now()}`, sender: "patient", text, time: "Just now" };
    setMessages(prev => [...prev, optimistic]);
    try {
      await sendMessage(activeChat, "patient", text);
      await loadMessages(activeChat, true);
      loadConversations(true);
    } catch (e) {
      // Revert optimistic update on failure
      setMessages(prev => prev.filter(m => m.id !== optimistic.id));
      setMessage(text);
      console.error(e);
    } finally {
      setSending(false);
    }
  };

  const activeConv = conversations.find(c => c.id === activeChat);
  const filtered = conversations.filter(c =>
    (c.doctorName || "").toLowerCase().includes((search || "").toLowerCase())
  );

  return (
    <div className="space-y-4">
      <h2 className="font-heading text-2xl font-bold">{t("messages.title")} 💬</h2>
      <div className="flex flex-col lg:grid lg:grid-cols-3 gap-4 h-auto lg:h-[calc(100vh-220px)]">
        {/* Conversation List */}
        <div className="border border-border/50 rounded-xl overflow-hidden bg-card flex flex-col h-[400px] lg:h-auto">
          <div className="p-3 border-b border-border/50 shrink-0">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder={t("messages.searchPlaceholder")}
                className="pl-10 h-9"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
          </div>
          <div className="overflow-y-auto flex-1">
            {loadingConvs ? (
              // Skeleton loading state
              Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3 p-3 animate-pulse">
                  <div className="w-10 h-10 rounded-full bg-secondary shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3 bg-secondary rounded w-3/4" />
                    <div className="h-2 bg-secondary rounded w-1/2" />
                  </div>
                </div>
              ))
            ) : filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center p-4 text-muted-foreground">
                <MessageSquare className="w-8 h-8 mb-2 opacity-40" />
                <p className="text-sm">No conversations yet</p>
              </div>
            ) : (
              filtered.map(c => (
                <button
                  key={c.id}
                  onClick={() => setActiveChat(c.id)}
                  className={`w-full flex items-center gap-3 p-3 hover:bg-secondary/50 transition-colors ${activeChat === c.id ? "bg-secondary/70" : ""}`}
                >
                  <UserAvatar avatar={c.doctorAvatar} name={c.doctorName} className="w-10 h-10 bg-primary/10 text-primary text-xs shrink-0" />
                  <div className="flex-1 text-left min-w-0">
                    <div className="flex justify-between items-center">
                      <p className="text-sm font-medium truncate">{c.doctorName}</p>
                      <span className="text-xs text-muted-foreground">{c.lastTime}</span>
                    </div>
                    <p className="text-xs text-muted-foreground truncate">{c.lastMsg}</p>
                  </div>
                  {c.unreadPatient > 0 && (
                    <span className="w-5 h-5 rounded-full gradient-primary flex items-center justify-center text-primary-foreground text-xs font-bold">{c.unreadPatient}</span>
                  )}
                </button>
              ))
            )}
          </div>
        </div>

        {/* Message Panel */}
        <div className="lg:col-span-2 border border-border/50 rounded-xl flex flex-col bg-card overflow-hidden h-[600px] lg:h-auto">
          {!activeChat ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-8 text-muted-foreground">
              <MessageSquare className="w-12 h-12 mb-3 opacity-30" />
              <p className="text-base font-medium">Select a conversation</p>
              <p className="text-sm mt-1 opacity-70">Choose a doctor from the list to start messaging</p>
            </div>
          ) : (
            <>
              <div className="p-4 border-b border-border/50 flex items-center gap-3 shrink-0">
                <UserAvatar avatar={activeConv?.doctorAvatar} name={activeConv?.doctorName} className="w-9 h-9 bg-primary/10 text-primary text-xs" />
                <div>
                  <p className="text-sm font-medium">{activeConv?.doctorName}</p>
                  <p className="text-xs text-muted-foreground">{activeConv?.doctorSpecialty}</p>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {loadingMsgs ? (
                  Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className={`flex ${i % 2 === 0 ? "justify-start" : "justify-end"} animate-pulse`}>
                      <div className={`h-8 rounded-2xl bg-secondary ${i % 2 === 0 ? "w-48" : "w-32"}`} />
                    </div>
                  ))
                ) : messages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground">
                    <p className="text-sm">No messages yet. Say hello! 👋</p>
                  </div>
                ) : (
                  messages.map(m => (
                    <motion.div
                      key={m.id}
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`flex ${m.sender === "patient" ? "justify-end" : "justify-start"}`}
                    >
                      <div className={`max-w-[70%] px-4 py-2 rounded-2xl text-sm ${m.sender === "patient" ? "gradient-primary text-primary-foreground rounded-br-md" : "bg-secondary rounded-bl-md"}`}>
                        <p>{m.text}</p>
                        <p className={`text-xs mt-1 ${m.sender === "patient" ? "text-primary-foreground/60" : "text-muted-foreground"}`}>{m.time}</p>
                      </div>
                    </motion.div>
                  ))
                )}
              </div>
              <div className="p-3 border-t border-border/50 flex gap-2 shrink-0">
                <Input
                  placeholder={t("messages.typePlaceholder")}
                  value={message}
                  onChange={e => setMessage(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && !e.shiftKey && handleSend()}
                  className="flex-1"
                  disabled={sending}
                />
                <Button
                  onClick={handleSend}
                  className="gradient-primary text-primary-foreground"
                  size="icon"
                  disabled={sending || !message.trim()}
                >
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default Messages;
