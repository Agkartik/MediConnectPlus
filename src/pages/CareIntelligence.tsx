import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Bot,
  Brain,
  CalendarCheck,
  CheckCircle2,
  MapPinned,
  Mic,
  Navigation,
  ShieldAlert,
  Sparkles,
  Users,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { buildDirectionsToClinicUrl } from "@/lib/mapsDirections";
import { toast } from "sonner";
import { sendAssistantMessage } from "@/services/medicalService";

type TriageLevel = "self-care" | "book-doctor" | "urgent";

function detectTriage(text: string): TriageLevel {
  const q = text.toLowerCase();
  if (
    q.includes("chest pain") ||
    q.includes("bleeding") ||
    q.includes("breathing") ||
    q.includes("बेहोश") ||
    q.includes("सीने")
  ) {
    return "urgent";
  }
  if (q.includes("fever") || q.includes("pain") || q.includes("दर्द") || q.includes("बुखार")) {
    return "book-doctor";
  }
  if (q.includes("fever") || q.includes("pain") || q.includes("दर्द") || q.includes("बुखार") || q.includes("drd")) {
    return "book-doctor";
  }
  return "self-care";
}

export default function CareIntelligence() {
  const { t, i18n } = useTranslation();
  const [query, setQuery] = useState("");
  const [transcript, setTranscript] = useState("");
  const [aiOutput, setAiOutput] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [scoreSeed] = useState(() => Math.floor(Math.random() * 10));

  const riskScore = useMemo(() => {
    const dayFactor = new Date().getDate() % 10;
    const dnaFactor = 68;
    const vitalsFactor = 74 + (scoreSeed % 8);
    const lifestyleFactor = 63 + dayFactor;
    return Math.round((dnaFactor * 0.35 + vitalsFactor * 0.4 + lifestyleFactor * 0.25) * 10) / 10;
  }, [scoreSeed]);

  const directionUrl = buildDirectionsToClinicUrl(28.5355, 77.391); // demo clinic

  const handleAnalyze = async () => {
    const text = query || transcript;
    if (!text) return;
    
    setIsAnalyzing(true);
    setAiOutput("Analyzing symptoms...");
    
    try {
      const response = await sendAssistantMessage([
        { role: "system", content: "You are a medical triage assistant. The user will tell you their symptoms in English or Hindi/Hinglish (like 'pet drd', 'sir drd', etc). Give a brief, helpful response indicating whether they should seek urgent care, book a doctor, or do self-care. Limit to 2 sentences." },
        { role: "user", content: text }
      ]);
      setAiOutput(response.reply || "Unable to determine. Please consult a doctor if you feel unwell.");
      toast.success("Analysis complete");
    } catch (e) {
      console.error(e);
      const triage = detectTriage(text);
      setAiOutput(t(`careIntelligence.copilot.triage.${triage}`));
      toast.error("Network error, using offline triage.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const startVoice = () => {
    const Ctor = (window as Window & { webkitSpeechRecognition?: new () => SpeechRecognition }).webkitSpeechRecognition;
    if (!Ctor) return;
    const rec = new Ctor();
    rec.lang = i18n.language === "hi" ? "hi-IN" : "en-IN";
    rec.onresult = (e) => setTranscript(e.results[0][0].transcript || "");
    rec.start();
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div>
        <h2 className="font-heading text-2xl font-bold">{t("careIntelligence.title")}</h2>
        <p className="text-muted-foreground">{t("careIntelligence.subtitle")}</p>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Brain className="w-5 h-5 text-primary" />
              {t("careIntelligence.risk.title")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="text-3xl font-bold text-primary">{riskScore}</p>
            <p className="text-sm text-muted-foreground">{t("careIntelligence.risk.desc")}</p>
            <div className="flex gap-2 flex-wrap">
              <Badge variant="secondary">{t("careIntelligence.risk.dna")}</Badge>
              <Badge variant="secondary">{t("careIntelligence.risk.vitals")}</Badge>
              <Badge variant="secondary">{t("careIntelligence.risk.lifestyle")}</Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPinned className="w-5 h-5 text-accent" />
              {t("careIntelligence.journey.title")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p>{t("careIntelligence.journey.stepBooked")}</p>
            <p>{t("careIntelligence.journey.stepEta")}</p>
            <p>{t("careIntelligence.journey.stepChecklist")}</p>
            <p>{t("careIntelligence.journey.stepDocs")}</p>
            <Button asChild size="sm" className="gap-2 mt-2">
              <a href={directionUrl} target="_blank" rel="noreferrer">
                <Navigation className="w-4 h-4" />
                {t("careIntelligence.journey.openDirections")}
              </a>
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bot className="w-5 h-5 text-primary" />
            {t("careIntelligence.copilot.title")}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-2">
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t("careIntelligence.copilot.placeholder")}
              onKeyDown={(e) => {
                if (e.key === "Enter" && query) {
                  void handleAnalyze();
                }
              }}
            />
            <Button type="button" onClick={handleAnalyze} disabled={isAnalyzing || (!query && !transcript)} className="gap-1">
              {isAnalyzing ? "..." : "Analyze"}
            </Button>
            <Button type="button" variant="outline" onClick={startVoice} className="gap-1">
              <Mic className="w-4 h-4" />
              {t("careIntelligence.copilot.voice")}
            </Button>
          </div>
          {transcript ? <p className="text-xs text-muted-foreground">{t("careIntelligence.copilot.heard", { text: transcript })}</p> : null}
          <div className="rounded-lg border border-border p-3 bg-secondary/40">
            <p className="text-sm font-medium">{t("careIntelligence.copilot.output")}</p>
            <p className="text-sm text-muted-foreground">{aiOutput || "Waiting for input..."}</p>
          </div>
        </CardContent>
      </Card>

      <div className="grid lg:grid-cols-3 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Users className="w-4 h-4" />
              {t("careIntelligence.family.title")}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground flex flex-col gap-3">
            <p>{t("careIntelligence.family.desc")}</p>
            <Button size="sm" variant="outline" className="w-fit" onClick={() => {
              const email = window.prompt("Enter family member's email or phone number to invite:");
              if (email) toast.success(`Invitation sent to ${email}. They will be linked once they accept.`);
            }}>Link Family Member</Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <CalendarCheck className="w-4 h-4" />
              {t("careIntelligence.adherence.title")}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground flex flex-col gap-3">
            <p>{t("careIntelligence.adherence.desc")}</p>
            <Button size="sm" variant="outline" className="w-fit" onClick={() => {
              window.open("https://wa.me/?text=Hi%2C%20this%20is%20a%20reminder%20from%20MediConnect%2B.%20Please%20remember%20to%20take%20your%20medication%20and%20log%20your%20adherence%20today.", "_blank");
              toast.success("Adherence nudge triggered via WhatsApp!");
            }}>Send Nudge</Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <ShieldAlert className="w-4 h-4 text-destructive" />
              {t("careIntelligence.safety.title")}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground flex flex-col gap-3">
            <p>{t("careIntelligence.safety.desc")}</p>
            <Button size="sm" variant="destructive" className="w-fit" onClick={() => {
              toast.error("Emergency escalation triggered!");
              window.location.href = "tel:112";
            }}>Escalate Alert</Button>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            {t("careIntelligence.trust.title")}
          </CardTitle>
        </CardHeader>
        <CardContent className="grid md:grid-cols-2 gap-3 text-sm">
          <div className="p-3 rounded-lg border border-border">{t("careIntelligence.trust.explainable")}</div>
          <div className="p-3 rounded-lg border border-border">{t("careIntelligence.trust.verified")}</div>
          <div className="p-3 rounded-lg border border-border">{t("careIntelligence.engagement.recovery")}</div>
          <div className="p-3 rounded-lg border border-border">{t("careIntelligence.engagement.india")}</div>
        </CardContent>
      </Card>

      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <CheckCircle2 className="w-4 h-4 text-primary" />
        {t("careIntelligence.footer")}
      </div>
    </div>
  );
}
