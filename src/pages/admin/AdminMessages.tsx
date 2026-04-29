import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { Send, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  getConversations,
  getMessages,
  sendMessage,
  markConversationRead
} from "@/services/medicalService";
import { useAsyncSync } from "@/hooks/useAsyncSync";

const AdminMessages = () => {
  const { t } = useTranslation();
  const [conversations, refreshConversations] = useAsyncSync(getConversations, []);
  const [activeChat, setActiveChat] = useState(conversations[0]?.id || "");
  const [messages, refreshMessages] = useAsyncSync(() => getMessages(activeChat), [], [activeChat]);
  const [message, setMessage] = useState("");
  const [search, setSearch] = useState("");

  const prevMsgCountRef = useRef(messages.length);
  const activeConv = conversations.find(c => c.id === activeChat);

  useEffect(() => {
    if (conversations.length && !activeChat) setActiveChat(conversations[0].id);
  }, [conversations, activeChat]);

  useEffect(() => {
    const iv = setInterval(() => {
      refreshConversations();
      if (activeChat) refreshMessages();
    }, 3000);
    return () => clearInterval(iv);
  }, [activeChat, refreshConversations, refreshMessages]);

  const handleSend = async () => {
    if (!message.trim() || !activeChat) return;
    try {
      // Admins send as "doctor" role to signify professional response, or we could add "admin" role
      await sendMessage(activeChat, "doctor", message);
      setMessage("");
      refreshMessages();
      refreshConversations();
    } catch (e) {
      console.error(e);
    }
  };

  const filtered = conversations.filter(c => 
    (c.doctorName || "").toLowerCase().includes(search.toLowerCase()) || 
    (c.patientName || "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-4">
      <h2 className="font-heading text-2xl font-bold">Platform Messages 💬</h2>
      <div className="flex flex-col lg:grid lg:grid-cols-3 gap-4 h-auto lg:h-[calc(100vh-220px)]">
        <div className="border border-border/50 rounded-xl overflow-hidden bg-card flex flex-col h-[400px] lg:h-auto">
          <div className="p-3 border-b border-border/50 shrink-0">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 w-4 h-4 text-muted-foreground" />
              <Input placeholder="Search users..." className="pl-10 h-9" value={search} onChange={e => setSearch(e.target.value)} />
            </div>
          </div>
          <div className="overflow-y-auto flex-1">
            {filtered.length === 0 ? (
              <p className="p-4 text-xs text-muted-foreground text-center">No active conversations found.</p>
            ) : filtered.map(c => (
              <button key={c.id} onClick={() => setActiveChat(c.id)} className={`w-full flex items-center gap-3 p-3 hover:bg-secondary/50 transition-colors ${activeChat === c.id ? "bg-secondary/70" : ""}`}>
                <div className="w-10 h-10 rounded-full gradient-primary flex items-center justify-center text-primary-foreground text-xs font-bold shrink-0">
                  {c.doctorAvatar}
                </div>
                <div className="flex-1 text-left min-w-0">
                  <div className="flex justify-between items-center">
                    <p className="text-sm font-medium truncate">{c.patientName} ↔ {c.doctorName}</p>
                    <span className="text-[10px] text-muted-foreground">{c.lastTime}</span>
                  </div>
                  <p className="text-xs text-muted-foreground truncate">{c.lastMsg || "No messages yet"}</p>
                </div>
              </button>
            ))}
          </div>
        </div>
        <div className="lg:col-span-2 border border-border/50 rounded-xl flex flex-col bg-card overflow-hidden h-[600px] lg:h-auto">
          {activeChat ? (
            <>
              <div className="p-4 border-b border-border/50 flex items-center gap-3">
                <div className="w-9 h-9 rounded-full gradient-primary flex items-center justify-center text-primary-foreground text-xs font-bold">{activeConv?.doctorAvatar}</div>
                <div>
                  <p className="text-sm font-medium">{activeConv?.patientName} with {activeConv?.doctorName}</p>
                  <p className="text-xs text-muted-foreground">Admin Monitoring Mode</p>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {messages.map(m => (
                  <motion.div key={m.id} initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} className={`flex ${m.sender === "admin" ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[70%] px-4 py-2 rounded-2xl text-sm ${m.sender === "admin" ? "bg-admin text-white rounded-br-md" : "bg-secondary rounded-bl-md"}`}>
                      <div className="flex justify-between gap-4 mb-1">
                        <span className="text-[10px] font-bold uppercase opacity-70">{m.sender}</span>
                      </div>
                      <p>{m.text}</p>
                      <p className="text-[10px] mt-1 opacity-60 text-right">{m.time}</p>
                    </div>
                  </motion.div>
                ))}
              </div>
              <div className="p-3 border-t border-border/50 flex gap-2">
                <Input placeholder="Type a message as Admin..." value={message} onChange={e => setMessage(e.target.value)} onKeyDown={e => e.key === "Enter" && handleSend()} className="flex-1" />
                <Button onClick={handleSend} className="bg-admin text-white" size="icon"><Send className="w-4 h-4" /></Button>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-muted-foreground p-8 text-center">
              <div>
                <MessageSquare className="w-12 h-12 mx-auto mb-4 opacity-20" />
                <p>Select a conversation to monitor or participate in platform messages.</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminMessages;
