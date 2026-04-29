import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { ShieldAlert, Star, BookOpen, MessageCircleQuestion } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import {
  getDoctors,
  getRegisteredPatients,
  submitMisconductReport,
  getSupportFaq,
  submitSupportFeedback,
  getMySupportInquiries,
  createSupportInquiry,
  type SupportFaq,
  type SupportInquiry,
} from "@/services/medicalService";
import type { RegisteredPatient } from "@/types/store";
import { useAsyncSync } from "@/hooks/useAsyncSync";

const SupportCenter = () => {
  const { t } = useTranslation();
  const { role } = useAuth();
  const { toast } = useToast();
  const isPatient = role === "patient";
  const [doctors] = useAsyncSync(getDoctors, []);
  const [patients, setPatients] = useState<RegisteredPatient[]>([]);

  const [faqs, setFaqs] = useState<SupportFaq[]>([]);
  const [faqsLoaded, setFaqsLoaded] = useState(false);

  const [reportedId, setReportedId] = useState("");
  const [reportType, setReportType] = useState("Misconduct");
  const [reportDesc, setReportDesc] = useState("");
  const [reportBusy, setReportBusy] = useState(false);

  const [fbRating, setFbRating] = useState<string>("");
  const [fbCategory, setFbCategory] = useState("general");
  const [fbMessage, setFbMessage] = useState("");
  const [fbBusy, setFbBusy] = useState(false);

  const [inquiries, setInquiries] = useState<SupportInquiry[]>([]);
  const [inqSubject, setInqSubject] = useState("");
  const [inqBody, setInqBody] = useState("");
  const [inqBusy, setInqBusy] = useState(false);

  useEffect(() => {
    getSupportFaq()
      .then(setFaqs)
      .catch(() => setFaqs([]))
      .finally(() => setFaqsLoaded(true));
  }, []);

  useEffect(() => {
    if (role !== "doctor") return;
    getRegisteredPatients()
      .then(setPatients)
      .catch(() => setPatients([]));
  }, [role]);

  const loadInquiries = () => {
    getMySupportInquiries()
      .then(setInquiries)
      .catch(() => setInquiries([]));
  };

  useEffect(() => {
    loadInquiries();
  }, []);

  const handleReport = async () => {
    if (!reportedId || !reportDesc.trim()) {
      toast({ title: t("support.toastMissingReport"), description: t("support.toastMissingReportDesc"), variant: "destructive" });
      return;
    }
    setReportBusy(true);
    try {
      await submitMisconductReport({
        reportedUserId: reportedId,
        type: reportType,
        severity: "High",
        desc: reportDesc.trim(),
      });
      setReportDesc("");
      setReportedId("");
      toast({ title: t("support.toastReportOk"), description: t("support.toastReportOkDesc") });
    } catch (e) {
      toast({ title: t("support.toastReportFail"), description: e instanceof Error ? e.message : "", variant: "destructive" });
    } finally {
      setReportBusy(false);
    }
  };

  const handleFeedback = async () => {
    if (!fbMessage.trim()) {
      toast({ title: t("support.toastFeedbackNeed"), description: t("support.toastFeedbackNeedDesc"), variant: "destructive" });
      return;
    }
    setFbBusy(true);
    try {
      const r = fbRating === "" ? undefined : Number(fbRating);
      await submitSupportFeedback({
        ...(r != null && !Number.isNaN(r) ? { rating: r } : {}),
        category: fbCategory,
        message: fbMessage.trim(),
      });
      setFbMessage("");
      setFbRating("");
      toast({ title: t("support.toastThanks"), description: t("support.toastThanksDesc") });
    } catch (e) {
      toast({ title: t("support.toastSendFail"), description: e instanceof Error ? e.message : "", variant: "destructive" });
    } finally {
      setFbBusy(false);
    }
  };

  const handleInquiry = async () => {
    if (!inqSubject.trim() || !inqBody.trim()) {
      toast({ title: t("support.toastInquiryIncomplete"), description: t("support.toastInquiryIncompleteDesc"), variant: "destructive" });
      return;
    }
    setInqBusy(true);
    try {
      await createSupportInquiry({ subject: inqSubject.trim(), body: inqBody.trim() });
      setInqSubject("");
      setInqBody("");
      toast({ title: t("support.toastInquirySent"), description: t("support.toastInquirySentDesc") });
      loadInquiries();
    } catch (e) {
      toast({ title: t("support.toastSendFail"), description: e instanceof Error ? e.message : "", variant: "destructive" });
    } finally {
      setInqBusy(false);
    }
  };

  return (
    <div className="w-full flex flex-col items-center">
      <div className="w-full max-w-3xl mx-auto space-y-8 px-0 sm:px-1">
        <div className="text-center space-y-2">
          <h2 className="font-heading text-2xl sm:text-3xl font-bold tracking-tight">{t("support.title")}</h2>
          <p className="text-muted-foreground text-sm sm:text-base max-w-xl mx-auto leading-relaxed">{t("support.subtitle")}</p>
        </div>

        <Tabs defaultValue="report" className="space-y-6 w-full">
          <div className="flex justify-center">
            <TabsList className="flex flex-wrap h-auto gap-1 bg-secondary/60 p-1.5 rounded-2xl border border-border/50 shadow-sm justify-center max-w-full">
              <TabsTrigger value="report" className="gap-1.5 rounded-xl px-3 data-[state=active]:shadow-sm">
                <ShieldAlert className="w-3.5 h-3.5 shrink-0" />
                {t("support.tabReport")}
              </TabsTrigger>
              <TabsTrigger value="feedback" className="gap-1.5 rounded-xl px-3 data-[state=active]:shadow-sm">
                <Star className="w-3.5 h-3.5 shrink-0" />
                {t("support.tabFeedback")}
              </TabsTrigger>
              <TabsTrigger value="faq" className="gap-1.5 rounded-xl px-3 data-[state=active]:shadow-sm">
                <BookOpen className="w-3.5 h-3.5 shrink-0" />
                {t("support.tabFaq")}
              </TabsTrigger>
              <TabsTrigger value="ask" className="gap-1.5 rounded-xl px-3 data-[state=active]:shadow-sm">
                <MessageCircleQuestion className="w-3.5 h-3.5 shrink-0" />
                {t("support.tabAsk")}
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="report" className="mt-0">
            <Card className="shadow-card border-border/50 overflow-hidden">
              <CardHeader className="text-center sm:text-left border-b border-border/40 bg-gradient-to-br from-card to-secondary/20 pb-6">
                <CardTitle className="font-heading text-xl">{t("support.reportTitle")}</CardTitle>
                <p className="text-sm text-muted-foreground pt-1 max-w-prose mx-auto sm:mx-0">
                  {isPatient ? t("support.reportSubPatient") : t("support.reportSubDoctor")}
                </p>
              </CardHeader>
              <CardContent className="space-y-4 pt-6 max-w-lg mx-auto w-full">
                <div>
                  <Label>{isPatient ? t("support.labelDoctor") : t("support.labelPatient")}</Label>
                  <select
                    className="w-full border border-border rounded-md h-10 px-3 bg-background mt-1"
                    value={reportedId}
                    onChange={(e) => setReportedId(e.target.value)}
                  >
                    <option value="">{t("support.selectPlaceholder")}</option>
                    {isPatient
                      ? doctors.map((d) => (
                          <option key={d.id} value={d.id}>
                            {d.name} — {d.specialty}
                          </option>
                        ))
                      : patients.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name}
                          </option>
                        ))}
                  </select>
                </div>
                <div>
                  <Label>{t("support.labelType")}</Label>
                  <Input value={reportType} onChange={(e) => setReportType(e.target.value)} placeholder={t("support.typePlaceholder")} className="mt-1" />
                </div>
                <div>
                  <Label>{t("support.labelDescription")}</Label>
                  <Textarea value={reportDesc} onChange={(e) => setReportDesc(e.target.value)} rows={5} placeholder={t("support.descPlaceholder")} className="mt-1" />
                </div>
                <div className="flex justify-center sm:justify-start pt-2">
                  <Button variant="destructive" onClick={handleReport} disabled={reportBusy} className="min-w-[10rem]">
                    {reportBusy ? t("support.submitting") : t("support.submitReport")}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="feedback" className="mt-0">
            <Card className="shadow-card border-border/50 overflow-hidden">
              <CardHeader className="text-center sm:text-left border-b border-border/40 bg-gradient-to-br from-card to-secondary/20 pb-6">
                <CardTitle className="font-heading text-xl">{t("support.feedbackTitle")}</CardTitle>
                <p className="text-sm text-muted-foreground pt-1">{t("support.feedbackSub")}</p>
              </CardHeader>
              <CardContent className="space-y-4 pt-6 max-w-lg mx-auto w-full">
                <div>
                  <Label>{t("support.ratingOptional")}</Label>
                  <Select value={fbRating || "none"} onValueChange={(v) => setFbRating(v === "none" ? "" : v)}>
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder={t("support.ratingOptional")} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">{t("support.ratingNone")}</SelectItem>
                      {[1, 2, 3, 4, 5].map((n) => (
                        <SelectItem key={n} value={String(n)}>
                          {n === 1 ? t("support.starOne", { count: n }) : t("support.starMany", { count: n })}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>{t("support.category")}</Label>
                  <Input value={fbCategory} onChange={(e) => setFbCategory(e.target.value)} className="mt-1" placeholder={t("support.categoryPlaceholder")} />
                </div>
                <div>
                  <Label>{t("support.message")}</Label>
                  <Textarea value={fbMessage} onChange={(e) => setFbMessage(e.target.value)} rows={5} className="mt-1" />
                </div>
                <div className="flex justify-center sm:justify-start pt-2">
                  <Button className="gradient-primary text-primary-foreground min-w-[10rem]" onClick={handleFeedback} disabled={fbBusy}>
                    {fbBusy ? t("support.sending") : t("support.submitFeedback")}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="faq" className="mt-0">
            <Card className="shadow-card border-border/50 overflow-hidden">
              <CardHeader className="text-center border-b border-border/40 bg-gradient-to-br from-card to-secondary/20 pb-6">
                <CardTitle className="font-heading text-xl">{t("support.faqTitle")}</CardTitle>
                <p className="text-sm text-muted-foreground pt-1">{t("support.faqSub")}</p>
              </CardHeader>
              <CardContent className="pt-6 max-w-2xl mx-auto w-full">
                {!faqsLoaded ? (
                  <p className="text-sm text-muted-foreground text-center">{t("support.faqLoading")}</p>
                ) : faqs.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center">{t("support.faqEmpty")}</p>
                ) : (
                  <Accordion type="single" collapsible className="w-full">
                    {faqs.map((f) => (
                      <AccordionItem key={f.id} value={f.id}>
                        <AccordionTrigger className="text-left">{f.question}</AccordionTrigger>
                        <AccordionContent className="text-sm text-muted-foreground whitespace-pre-wrap">{f.answer}</AccordionContent>
                      </AccordionItem>
                    ))}
                  </Accordion>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="ask" className="mt-0 space-y-6">
            <Card className="shadow-card border-border/50 overflow-hidden">
              <CardHeader className="text-center sm:text-left border-b border-border/40 bg-gradient-to-br from-card to-secondary/20 pb-6">
                <CardTitle className="font-heading text-xl">{t("support.askTitle")}</CardTitle>
                <p className="text-sm text-muted-foreground pt-1">{t("support.askSub")}</p>
              </CardHeader>
              <CardContent className="space-y-4 pt-6 max-w-lg mx-auto w-full">
                <div>
                  <Label>{t("support.subject")}</Label>
                  <Input value={inqSubject} onChange={(e) => setInqSubject(e.target.value)} className="mt-1" />
                </div>
                <div>
                  <Label>{t("support.question")}</Label>
                  <Textarea value={inqBody} onChange={(e) => setInqBody(e.target.value)} rows={6} className="mt-1" />
                </div>
                <div className="flex justify-center sm:justify-start pt-2">
                  <Button className="gradient-primary text-primary-foreground min-w-[10rem]" onClick={handleInquiry} disabled={inqBusy}>
                    {inqBusy ? t("support.sending") : t("support.sendQuestion")}
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-card border-border/50">
              <CardHeader>
                <CardTitle className="font-heading text-lg text-center sm:text-left">{t("support.prevTitle")}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 max-w-2xl mx-auto w-full">
                {inquiries.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center">{t("support.prevEmpty")}</p>
                ) : (
                  inquiries.map((q) => (
                    <div key={q.id} className="rounded-xl border border-border/50 p-4 space-y-2 text-sm">
                      <div className="flex justify-between gap-2">
                        <span className="font-medium">{q.subject}</span>
                        <span className="text-xs text-muted-foreground shrink-0">{q.status}</span>
                      </div>
                      <p className="text-muted-foreground whitespace-pre-wrap">{q.body}</p>
                      {q.adminReply ? (
                        <div className="mt-2 pt-2 border-t border-border/50">
                          <p className="text-xs font-semibold text-primary">{t("support.adminReply")}</p>
                          <p className="text-muted-foreground whitespace-pre-wrap">{q.adminReply}</p>
                        </div>
                      ) : (
                        <p className="text-xs text-muted-foreground italic">{t("support.awaiting")}</p>
                      )}
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default SupportCenter;
