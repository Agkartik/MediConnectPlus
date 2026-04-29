import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { Activity, Dumbbell, ArrowRight, ShieldAlert, HeartPulse, Stethoscope, RefreshCw, Pill, Moon, Footprints, Zap } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import { getHealthTwin, simulateHealthTwin } from "@/services/medicalService";
import { useAsyncSync } from "@/hooks/useAsyncSync";
import { Slider } from "@/components/ui/slider";
import { Progress } from "@/components/ui/progress";
import { toast } from "@/hooks/use-toast";

// Simple Debounce function for sliders
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);
    return () => clearTimeout(handler);
  }, [value, delay]);
  return debouncedValue;
}

export default function VirtualTwin() {
  const { t } = useTranslation();
  const { userId, userName } = useAuth();
  const [loading, setLoading] = useState(true);
  const [simulating, setSimulating] = useState(false);
  const [twinData, setTwinData] = useState<any>(null);

  // Slider States
  const [targetAge, setTargetAge] = useState<number>(30);
  const [targetWeight, setTargetWeight] = useState<number>(75);
  const [targetAdherence, setTargetAdherence] = useState<number>(80);
  const [targetSleep, setTargetSleep] = useState<number>(7);
  const [targetStress, setTargetStress] = useState<number>(5);
  const [targetSteps, setTargetSteps] = useState<number>(5000);

  // Simulation Results
  const [projectedScore, setProjectedScore] = useState<number>(70);
  const [insights, setInsights] = useState<string[]>([]);
  const [biologicalAge, setBiologicalAge] = useState<number | null>(null);
  const [organScores, setOrganScores] = useState<{ heartHealth: number; metabolicHealth: number; mentalCognition: number } | null>(null);

  // Debounced input to avoid API spam
  const debouncedAge = useDebounce(targetAge, 600);
  const debouncedWeight = useDebounce(targetWeight, 600);
  const debouncedAdherence = useDebounce(targetAdherence, 600);
  const debouncedSleep = useDebounce(targetSleep, 600);
  const debouncedStress = useDebounce(targetStress, 600);
  const debouncedSteps = useDebounce(targetSteps, 600);

  useEffect(() => {
    if (!userId) return;
    const loadData = async () => {
      try {
        const data = await getHealthTwin(userId);
        setTwinData(data);
        setTargetAge(data.chronologicalAge || 30);
        setTargetWeight(data.currentWeight);
        setTargetAdherence(data.hypertensionAdherence);
        setTargetSleep(data.sleepHours || 7);
        setTargetStress(data.stressLevel || 5);
        setTargetSteps(data.dailySteps || 5000);
        setProjectedScore(data.baseHealthScore);
      } catch (e) {
        toast({ title: t("virtualTwin.toastLoadFailed"), variant: "destructive" });
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [userId]);

  useEffect(() => {
    // Skip initial render or before data loads
    if (!twinData || loading) return;

    // Simulate only if values changed
    if (
      debouncedAge === (twinData.chronologicalAge || 30) &&
      debouncedWeight === twinData.currentWeight &&
      debouncedAdherence === twinData.hypertensionAdherence &&
      debouncedSleep === (twinData.sleepHours || 7) &&
      debouncedStress === (twinData.stressLevel || 5) &&
      debouncedSteps === (twinData.dailySteps || 5000)
    ) {
      if (!biologicalAge) {
        // Trigger initial baseline simulation at load implicitly
      } else {
        return;
      }
    }

    const runSimulation = async () => {
      setSimulating(true);
      try {
        const response = await simulateHealthTwin(userId!, {
          targetWeight: debouncedWeight,
          targetAdherence: debouncedAdherence,
          targetSleep: debouncedSleep,
          targetStress: debouncedStress,
          targetSteps: debouncedSteps,
          targetAge: debouncedAge,
        } as any);
        setProjectedScore(response.projectedHealthScore);
        setInsights(response.insights);
        if (response.biologicalAge) setBiologicalAge(response.biologicalAge);
        if (response.organScores) setOrganScores(response.organScores);
      } catch (e: any) {
        toast({ title: t("virtualTwin.toastSimError"), description: e?.message || t("virtualTwin.toastSimErrorDesc"), variant: "destructive" });
      } finally {
        setSimulating(false);
      }
    };
    runSimulation();
  }, [debouncedAge, debouncedWeight, debouncedAdherence, debouncedSleep, debouncedStress, debouncedSteps, twinData, userId, loading]);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <RefreshCw className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Circular Score calculation (Score / 100 becomes strokeDashoffset mapping)
  const radius = 50;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (projectedScore / 100) * circumference;
  
  // Dynamic color for score circle
  let scoreColorClass = "text-red-500 bg-red-500";
  if (projectedScore >= 70) scoreColorClass = "text-yellow-500 bg-yellow-500";
  if (projectedScore >= 85) scoreColorClass = "text-green-500 bg-green-500";

  const tCAge = targetAge || 30;
  const bioAgeDiff = (biologicalAge || tCAge) - tCAge;

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-10">
      <div>
        <h2 className="font-heading text-2xl font-bold">{t("virtualTwin.title")} 🧬</h2>
        <p className="text-muted-foreground">{t("virtualTwin.subtitle")}</p>
      </div>

      <div className="grid md:grid-cols-2 gap-6 items-start">
        {/* Left Column: Visual Twin Score & Age */}
        <div className="space-y-6">
          <Card className="shadow-lg border-border/50 bg-gradient-to-br from-card to-secondary/30 relative overflow-hidden">
            <CardHeader>
              <CardTitle className="font-heading flex items-center gap-2">
                <Activity className="w-5 h-5 text-primary" />
                {t("virtualTwin.realTimeStatus")}
              </CardTitle>
              <CardDescription>
                {t("virtualTwin.realTimeDesc")}
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col items-center justify-center py-6 relative">
              
              <div className="flex flex-wrap md:flex-nowrap justify-around w-full items-center gap-6">
                
                {/* Score Graphic */}
                <div className={`relative flex items-center justify-center transition-all duration-500 ${simulating ? 'scale-95 opacity-80 blur-[2px]' : 'scale-100 opacity-100 blur-0'}`}>
                  <svg className="w-40 h-40 transform -rotate-90">
                    <circle cx="80" cy="80" r={radius} stroke="currentColor" strokeWidth="12" fill="transparent" className="text-muted" />
                    <circle
                      cx="80"
                      cy="80"
                      r={radius}
                      stroke="currentColor"
                      strokeWidth="12"
                      fill="transparent"
                      strokeDasharray={circumference}
                      strokeDashoffset={strokeDashoffset}
                      className={`transition-all duration-1000 ease-out ${scoreColorClass.split(' ')[0]}`}
                      strokeLinecap="round"
                    />
                  </svg>
                  <div className="absolute flex flex-col items-center justify-center text-center">
                    <span className="text-3xl font-extrabold font-heading">{projectedScore}</span>
                    <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">/ 100</span>
                  </div>
                </div>

                {/* Biological Age Clock */}
                {biologicalAge && (
                  <div className="flex flex-col gap-3 min-w-[130px]">
                    <div className="bg-background/80 p-3 rounded-xl border border-border/50 text-center shadow-sm">
                      <p className="text-[10px] uppercase font-bold text-muted-foreground">{t("virtualTwin.chronologicalAge")}</p>
                      <p className="font-heading text-xl">{tCAge}</p>
                    </div>
                    <div className={`bg-background/80 p-3 rounded-xl border border-border/50 text-center shadow-sm ring-1 transition-colors duration-500 ${
                      bioAgeDiff > 0 ? "ring-red-500/50 bg-red-500/5" : bioAgeDiff < 0 ? "ring-green-500/50 bg-green-500/5" : "ring-primary/20"
                    }`}>
                      <p className="text-[10px] uppercase font-bold text-muted-foreground">{t("virtualTwin.biologicalAge")}</p>
                      <p className={`font-heading text-2xl font-bold transition-colors duration-500 ${
                        bioAgeDiff > 0 ? "text-red-500" : bioAgeDiff < 0 ? "text-green-500" : "text-foreground"
                      }`}>{biologicalAge}</p>
                    </div>
                  </div>
                )}
                
              </div>
            </CardContent>
          </Card>

          {/* New Panel: Organ Health Breakdown (Progress Bars) */}
          {organScores && (
            <Card className="shadow-lg border-border/50 bg-card/60 backdrop-blur-xl">
              <CardHeader className="pb-3">
                <CardTitle className="font-heading text-md flex items-center gap-2">
                  <HeartPulse className="w-4 h-4 text-primary" />
                  {t("virtualTwin.systemBreakdown")}
                </CardTitle>
                <CardDescription className="text-xs">
                  {t("virtualTwin.systemBreakdownDesc")}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="space-y-1">
                  <div className="flex justify-between text-xs font-medium">
                    <span>{t("virtualTwin.cardiovascular")}</span>
                    <span>{organScores.heartHealth}%</span>
                  </div>
                  <Progress value={organScores.heartHealth} className="h-2 bg-muted/60" indicatorClassName="bg-blue-500" />
                </div>
                <div className="space-y-1">
                  <div className="flex justify-between text-xs font-medium">
                    <span>{t("virtualTwin.metabolic")}</span>
                    <span>{organScores.metabolicHealth}%</span>
                  </div>
                  <Progress value={organScores.metabolicHealth} className="h-2 bg-muted/60" indicatorClassName="bg-purple-500" />
                </div>
                <div className="space-y-1">
                  <div className="flex justify-between text-xs font-medium">
                    <span>{t("virtualTwin.cognitive")}</span>
                    <span>{organScores.mentalCognition}%</span>
                  </div>
                  <Progress value={organScores.mentalCognition} className="h-2 bg-muted/60" indicatorClassName="bg-cyan-500" />
                </div>
              </CardContent>
            </Card>
          )}

          {/* AI Insights Panel */}
          <div className="bg-primary/5 rounded-2xl border border-primary/20 p-5 space-y-4 relative overflow-hidden h-fit">
            <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
              <Stethoscope className="w-32 h-32" />
            </div>
            
            <h3 className="font-heading font-semibold text-primary flex items-center gap-2">
              <SparklesIcon className="w-4 h-4" />
              {t("virtualTwin.aiInsights")}
            </h3>
            
            <div className="space-y-3 min-h-[140px]">
              {insights.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center space-y-2 opacity-60 pt-4">
                  <HeartPulse className="w-8 h-8 text-primary" />
                  <p className="text-sm">{t("virtualTwin.adjustSliders")}</p>
                </div>
              ) : (
                insights.map((insight, idx) => (
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.1 }}
                    className="flex items-start gap-3 bg-card p-3 rounded-lg border border-border/40 shadow-sm"
                  >
                    <div className="mt-0.5 bg-primary/10 p-1 rounded-full shrink-0">
                      <ArrowRight className="w-3 h-3 text-primary" />
                    </div>
                    <p className="text-sm leading-snug">{insight}</p>
                  </motion.div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Simulators Controls */}
        <Card className="shadow-lg border-border/50 h-fit">
          <CardHeader className="pb-3 border-b border-border/50 mb-3">
            <CardTitle className="font-heading text-lg">{t("virtualTwin.whatIfTitle")}</CardTitle>
            <CardDescription>{t("virtualTwin.whatIfDesc")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-8">
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <label className="text-sm font-medium flex items-center gap-2">
                  <HeartPulse className="w-4 h-4 text-rose-500" />
                  {t("virtualTwin.sliderAge")}
                </label>
                <span className="text-sm font-bold bg-secondary px-2 py-1 rounded w-16 text-center">{targetAge}</span>
              </div>
              <Slider value={[targetAge]} min={18} max={100} step={1} onValueChange={(vals) => setTargetAge(vals[0])} className="py-2" />
              <div className="flex justify-between text-[10px] uppercase font-bold text-muted-foreground px-1">
                <span>{t("virtualTwin.baselineAge", { value: twinData?.chronologicalAge || 30 })}</span>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <label className="text-sm font-medium flex items-center gap-2">
                  <Dumbbell className="w-4 h-4 text-blue-500" />
                  {t("virtualTwin.sliderWeight")}
                </label>
                <span className="text-sm font-bold bg-secondary px-2 py-1 rounded w-16 text-center">{targetWeight}</span>
              </div>
              <Slider value={[targetWeight]} min={40} max={150} step={1} onValueChange={(vals) => setTargetWeight(vals[0])} className="py-2" />
              <div className="flex justify-between text-[10px] uppercase font-bold text-muted-foreground px-1">
                <span>{t("virtualTwin.baselineWeight", { value: twinData?.currentWeight })}</span>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <label className="text-sm font-medium flex items-center gap-2">
                  <Pill className="w-4 h-4 text-purple-500" />
                  {t("virtualTwin.sliderAdherence")}
                </label>
                <span className="text-sm font-bold bg-secondary px-2 py-1 rounded w-16 text-center">{targetAdherence}%</span>
              </div>
              <Slider value={[targetAdherence]} min={0} max={100} step={5} onValueChange={(vals) => setTargetAdherence(vals[0])} className="py-2" />
              <div className="flex justify-between text-[10px] uppercase font-bold text-muted-foreground px-1">
                <span>{t("virtualTwin.baselineAdherence", { value: twinData?.hypertensionAdherence })}</span>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <label className="text-sm font-medium flex items-center gap-2">
                  <Footprints className="w-4 h-4 text-green-500" />
                  {t("virtualTwin.sliderSteps")}
                </label>
                <span className="text-sm font-bold bg-secondary px-2 py-1 rounded w-16 text-center">{targetSteps}</span>
              </div>
              <Slider value={[targetSteps]} min={0} max={20000} step={500} onValueChange={(vals) => setTargetSteps(vals[0])} className="py-2" />
              <div className="flex justify-between text-[10px] uppercase font-bold text-muted-foreground px-1">
                <span>{t("virtualTwin.baselineSteps", { value: twinData?.dailySteps || 5000 })}</span>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <label className="text-sm font-medium flex items-center gap-2">
                  <Moon className="w-4 h-4 text-indigo-500" />
                  {t("virtualTwin.sliderSleep")}
                </label>
                <span className="text-sm font-bold bg-secondary px-2 py-1 rounded w-16 text-center">{targetSleep}h</span>
              </div>
              <Slider value={[targetSleep]} min={2} max={12} step={0.5} onValueChange={(vals) => setTargetSleep(vals[0])} className="py-2" />
              <div className="flex justify-between text-[10px] uppercase font-bold text-muted-foreground px-1">
                <span>{t("virtualTwin.baselineSleep", { value: twinData?.sleepHours || 7 })}</span>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <label className="text-sm font-medium flex items-center gap-2">
                  <Zap className="w-4 h-4 text-orange-500" />
                  {t("virtualTwin.sliderStress")}
                </label>
                <span className="text-sm font-bold bg-secondary px-2 py-1 rounded w-16 text-center">{targetStress}</span>
              </div>
              <Slider value={[targetStress]} min={1} max={10} step={1} onValueChange={(vals) => setTargetStress(vals[0])} className="py-2" />
              <div className="flex justify-between text-[10px] uppercase font-bold text-muted-foreground px-1">
                <span>{t("virtualTwin.baselineStress", { value: twinData?.stressLevel || 5 })}</span>
              </div>
            </div>

          </CardContent>
        </Card>

      </div>
    </div>
  );
}

function SparklesIcon(props: any) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z" />
    </svg>
  );
}
