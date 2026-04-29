import { useEffect, useRef } from "react";
import { toast } from "sonner";
import { useLocation, useNavigate } from "react-router-dom";
import { getConversations } from "@/services/medicalService";
import { useAuth } from "@/contexts/AuthContext";

export default function GlobalMessageListener() {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const prevUnreadRef = useRef<Record<string, number>>({});

  useEffect(() => {
    if (!user) return;
    
    // Request notification permission if not asked yet
    if (typeof Notification !== "undefined" && Notification.permission === "default") {
      Notification.requestPermission().catch(() => {});
    }

    const checkMessages = async () => {
      try {
        const conversations = await getConversations();
        
        conversations.forEach(c => {
          const currentUnread = user.role === "doctor" ? c.unreadDoctor : c.unreadPatient;
          const prevUnread = prevUnreadRef.current[c.id] || 0;
          
          if (currentUnread > prevUnread) {
            // New message arrived in this conversation!
            const senderName = user.role === "doctor" ? c.patientName : c.doctorName;
            
            // Check if user is currently viewing the messages page
            const isViewingMessages = location.pathname.includes("/messages");
            
            // If they are on the messages page, the local component handles active chat notification.
            // But we can just show a toast anyway if it's a new unread.
            // Wait, if they are viewing the chat, the unread count resets to 0 instantly!
            // So if it's > 0, they definitely haven't seen it yet.
            
            toast.info(`New message from ${senderName}`, {
              description: c.lastMsg,
              action: {
                label: "View",
                onClick: () => navigate(`/dashboard/${user.role === "doctor" ? "doctor" : "patient"}/messages`)
              }
            });

            if (typeof Notification !== "undefined" && Notification.permission === "granted") {
              new Notification(`New message from ${senderName}`, { body: c.lastMsg });
            }
          }
          prevUnreadRef.current[c.id] = currentUnread;
        });
      } catch (e) {
        // silently ignore poll errors
      }
    };

    const iv = setInterval(checkMessages, 8000);
    checkMessages();
    return () => clearInterval(iv);
  }, [user, location.pathname, navigate]);

  return null;
}
