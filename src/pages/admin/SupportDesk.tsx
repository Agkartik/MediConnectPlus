import { useState, useEffect } from "react";
import { MessageSquare, Star, BookOpen, Trash2, Plus } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import {
  adminListSupportInquiries,
  adminReplySupportInquiry,
  adminListSupportFeedback,
  getSupportFaq,
  adminCreateSupportFaq,
  adminUpdateSupportFaq,
  adminDeleteSupportFaq,
  type SupportInquiry,
  type SupportFeedback,
  type SupportFaq,
} from "@/services/medicalService";
import { useAsyncSync } from "@/hooks/useAsyncSync";

function InquiryCard({ q, onReplied }: { q: SupportInquiry; onReplied: () => void }) {
  const { toast } = useToast();
  const [reply, setReply] = useState(q.adminReply || "");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setReply(q.adminReply || "");
  }, [q.id, q.adminReply]);

  const save = async () => {
    if (!reply.trim()) {
      toast({ title: "Enter a reply", variant: "destructive" });
      return;
    }
    setBusy(true);
    try {
      await adminReplySupportInquiry(q.id, reply.trim());
      toast({ title: "Reply sent" });
      onReplied();
    } catch {
      toast({ title: "Failed", variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card className="shadow-card border-border/50">
      <CardContent className="pt-4 space-y-3 text-sm">
        <div className="flex flex-wrap justify-between gap-2">
          <span className="font-medium">{q.subject}</span>
          <span className="text-xs text-muted-foreground">
            {q.userName} ({q.userRole}) · {q.status}
          </span>
        </div>
        <p className="text-muted-foreground whitespace-pre-wrap">{q.body}</p>
        <div>
          <Label className="text-xs">Admin reply</Label>
          <Textarea value={reply} onChange={(e) => setReply(e.target.value)} rows={3} className="mt-1" />
        </div>
        <Button size="sm" className="gradient-primary text-primary-foreground" onClick={save} disabled={busy}>
          {busy ? "Saving…" : q.adminReply ? "Update reply" : "Post reply"}
        </Button>
      </CardContent>
    </Card>
  );
}

function FaqEditorRow({
  f,
  onChanged,
}: {
  f: SupportFaq;
  onChanged: () => void;
}) {
  const { toast } = useToast();
  const [question, setQuestion] = useState(f.question);
  const [answer, setAnswer] = useState(f.answer);
  const [sortOrder, setSortOrder] = useState(String(f.sortOrder));
  const [published, setPublished] = useState(f.published !== false);
  const [busy, setBusy] = useState(false);

  const save = async () => {
    setBusy(true);
    try {
      await adminUpdateSupportFaq(f.id, {
        question,
        answer,
        sortOrder: Number(sortOrder) || 0,
        published,
      });
      toast({ title: "FAQ updated" });
      onChanged();
    } catch {
      toast({ title: "Failed", variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  const del = async () => {
    setBusy(true);
    try {
      await adminDeleteSupportFaq(f.id);
      toast({ title: "Removed" });
      onChanged();
    } catch {
      toast({ title: "Failed", variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card className="shadow-card border-border/50">
      <CardContent className="pt-4 space-y-2">
        <Input value={question} onChange={(e) => setQuestion(e.target.value)} />
        <Textarea value={answer} onChange={(e) => setAnswer(e.target.value)} rows={4} />
        <div className="flex flex-wrap gap-2 items-center">
          <Input
            className="w-24"
            type="number"
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value)}
            title="Sort order"
          />
          <label className="flex items-center gap-2 text-xs">
            <input type="checkbox" checked={published} onChange={(e) => setPublished(e.target.checked)} />
            Published
          </label>
          <Button size="sm" variant="secondary" onClick={save} disabled={busy}>
            Save
          </Button>
          <Button size="sm" variant="destructive" onClick={del} disabled={busy}>
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

const SupportDesk = () => {
  const { toast } = useToast();
  const [inquiries, refreshInq] = useAsyncSync(adminListSupportInquiries, [] as SupportInquiry[]);
  const [feedback] = useAsyncSync(adminListSupportFeedback, [] as SupportFeedback[]);
  const [faqs, refreshFaq] = useAsyncSync(getSupportFaq, [] as SupportFaq[]);

  const [newQ, setNewQ] = useState("");
  const [newA, setNewA] = useState("");
  const [addBusy, setAddBusy] = useState(false);

  const addFaq = async () => {
    if (!newQ.trim() || !newA.trim()) {
      toast({ title: "Question and answer required", variant: "destructive" });
      return;
    }
    setAddBusy(true);
    try {
      await adminCreateSupportFaq({ question: newQ.trim(), answer: newA.trim(), sortOrder: faqs.length });
      setNewQ("");
      setNewA("");
      toast({ title: "FAQ added" });
      refreshFaq();
    } catch {
      toast({ title: "Failed", variant: "destructive" });
    } finally {
      setAddBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-heading text-2xl font-bold">Support desk</h2>
        <p className="text-muted-foreground">User questions, feedback, and FAQ management (MongoDB).</p>
      </div>

      <Tabs defaultValue="inquiries">
        <TabsList className="flex flex-wrap h-auto gap-1">
          <TabsTrigger value="inquiries" className="gap-1">
            <MessageSquare className="w-3.5 h-3.5" />
            Questions ({inquiries.length})
          </TabsTrigger>
          <TabsTrigger value="feedback" className="gap-1">
            <Star className="w-3.5 h-3.5" />
            Feedback ({feedback.length})
          </TabsTrigger>
          <TabsTrigger value="faq" className="gap-1">
            <BookOpen className="w-3.5 h-3.5" />
            FAQ
          </TabsTrigger>
        </TabsList>

        <TabsContent value="inquiries" className="space-y-3 mt-4">
          {inquiries.length === 0 ? (
            <p className="text-sm text-muted-foreground">No inquiries yet.</p>
          ) : (
            inquiries.map((q) => <InquiryCard key={q.id} q={q} onReplied={refreshInq} />)
          )}
        </TabsContent>

        <TabsContent value="feedback" className="mt-4 space-y-3">
          {feedback.length === 0 ? (
            <p className="text-sm text-muted-foreground">No feedback yet.</p>
          ) : (
            feedback.map((f) => (
              <Card key={f.id} className="shadow-card border-border/50">
                <CardContent className="pt-4 text-sm space-y-1">
                  <div className="flex justify-between">
                    <span className="font-medium">{f.userName}</span>
                    <span className="text-xs text-muted-foreground">
                      {f.userRole} {f.rating ? `· ${f.rating}/5` : ""}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">{f.category}</p>
                  <p className="text-muted-foreground whitespace-pre-wrap">{f.message}</p>
                  <p className="text-xs text-muted-foreground">
                    {f.createdAt ? new Date(f.createdAt).toLocaleString() : ""}
                  </p>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="faq" className="mt-4 space-y-4">
          <Card className="shadow-card border-border/50">
            <CardHeader>
              <CardTitle className="font-heading text-base flex items-center gap-2">
                <Plus className="w-4 h-4" /> New FAQ entry
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Input value={newQ} onChange={(e) => setNewQ(e.target.value)} placeholder="Question" />
              <Textarea value={newA} onChange={(e) => setNewA(e.target.value)} placeholder="Answer" rows={4} />
              <Button className="gradient-primary text-primary-foreground" onClick={addFaq} disabled={addBusy}>
                {addBusy ? "Adding…" : "Add FAQ"}
              </Button>
            </CardContent>
          </Card>
          <div className="space-y-3">
            {faqs.map((f) => (
              <FaqEditorRow key={f.id} f={f} onChanged={refreshFaq} />
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default SupportDesk;
