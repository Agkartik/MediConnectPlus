import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { Activity, Heart, Droplets, Footprints, Moon, TrendingUp, Wifi } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

interface Vital {
  label: string;
  value: string;
  icon: any;
  progress: number;
  status: string;
  color: string;
  baseVal: number;
  unit: string;
}

const baseVitals: Vital[] = [
  { label: "Heart Rate", value: "72 bpm", icon: Heart, progress: 72, status: "Normal", color: "text-primary", baseVal: 72, unit: "bpm" },
  { label: "Blood Pressure", value: "120/80 mmHg", icon: Activity, progress: 65, status: "Normal", color: "text-accent", baseVal: 120, unit: "mmHg" },
  { label: "SpO2", value: "98%", icon: Droplets, progress: 98, status: "Excellent", color: "text-primary", baseVal: 98, unit: "%" },
  { label: "Steps Today", value: "6,432", icon: Footprints, progress: 64, status: "Good", color: "text-accent", baseVal: 6432, unit: "" },
  { label: "Sleep", value: "7.2 hrs", icon: Moon, progress: 72, status: "Good", color: "text-primary", baseVal: 7.2, unit: "hrs" },
  { label: "Calories", value: "1,850 kcal", icon: TrendingUp, progress: 74, status: "On Track", color: "text-accent", baseVal: 1850, unit: "kcal" },
];

function randomize(v: Vital): Vital {
  const fluctuation = () => (Math.random() - 0.5) * 2;
  let newVal = v.baseVal;
  let progress = v.progress;
  let status = v.status;
  let valueStr = v.value;

  switch (v.label) {
    case "Heart Rate": {
      newVal = Math.round(v.baseVal + fluctuation() * 5);
      progress = Math.min(100, Math.max(40, newVal));
      status = newVal > 100 ? "High" : newVal < 60 ? "Low" : "Normal";
      valueStr = `${newVal} bpm`;
      break;
    }
    case "Blood Pressure": {
      const sys = Math.round(120 + fluctuation() * 8);
      const dia = Math.round(80 + fluctuation() * 5);
      progress = Math.min(100, Math.max(30, Math.round((sys / 180) * 100)));
      status = sys > 140 ? "High" : sys < 90 ? "Low" : "Normal";
      valueStr = `${sys}/${dia} mmHg`;
      break;
    }
    case "SpO2": {
      newVal = Math.min(100, Math.max(94, Math.round(98 + fluctuation() * 2)));
      progress = newVal;
      status = newVal >= 97 ? "Excellent" : newVal >= 95 ? "Normal" : "Low";
      valueStr = `${newVal}%`;
      break;
    }
    case "Steps Today": {
      newVal = Math.round(v.baseVal + Math.random() * 50);
      progress = Math.min(100, Math.round((newVal / 10000) * 100));
      status = newVal > 8000 ? "Great" : newVal > 5000 ? "Good" : "Low";
      valueStr = `${newVal.toLocaleString()}`;
      break;
    }
    default:
      break;
  }
  return { ...v, value: valueStr, progress, status, baseVal: v.label === "Steps Today" ? newVal : v.baseVal };
}

const HealthData = () => {
  const { t } = useTranslation();
  const [vitals, setVitals] = useState(baseVitals);
  const [isLive, setIsLive] = useState(true);
  const [lastUpdate, setLastUpdate] = useState(new Date());

  useEffect(() => {
    if (!isLive) return;
    const interval = setInterval(() => {
      setVitals(prev => prev.map(v => randomize(v)));
      setLastUpdate(new Date());
    }, 3000);
    return () => clearInterval(interval);
  }, [isLive]);

  const statusColor = (s: string) => {
    if (["Excellent", "Great", "Normal", "Good", "On Track"].includes(s)) return "bg-primary/10 text-primary";
    if (s === "High") return "bg-destructive/10 text-destructive";
    return "bg-yellow-500/10 text-yellow-600";
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-heading text-2xl font-bold">{t("healthData.title")} 💓</h2>
          <p className="text-muted-foreground">{t("healthData.subtitle")}</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-2 text-xs text-muted-foreground">
            <motion.div animate={{ scale: isLive ? [1, 1.3, 1] : 1 }} transition={{ duration: 1, repeat: isLive ? Infinity : 0 }} className={`w-2 h-2 rounded-full ${isLive ? "bg-primary" : "bg-muted-foreground"}`} />
            {isLive ? t("healthData.live") : t("healthData.paused")} • {lastUpdate.toLocaleTimeString()}
          </span>
          <button onClick={() => setIsLive(!isLive)} className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${isLive ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}>
            <Wifi className="w-3 h-3 inline mr-1" />{isLive ? t("healthData.pause") : t("healthData.resume")}
          </button>
        </div>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {vitals.map((v, i) => (
          <motion.div key={v.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}>
            <Card className="shadow-card border-border/50 hover:shadow-elevated transition-all">
              <CardContent className="p-5">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <v.icon className={`w-5 h-5 ${v.color}`} />
                    <span className="text-sm font-medium">{v.label}</span>
                  </div>
                  <motion.span key={v.status} initial={{ scale: 0.8 }} animate={{ scale: 1 }} className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColor(v.status)}`}>
                    {v.status}
                  </motion.span>
                </div>
                <motion.p key={v.value} initial={{ opacity: 0.5 }} animate={{ opacity: 1 }} className="text-2xl font-heading font-bold mb-3">
                  {v.value}
                </motion.p>
                <motion.div initial={false} animate={{ width: `${v.progress}%` }} className="h-2 rounded-full bg-primary" style={{ maxWidth: "100%" }} />
                <div className="h-2 rounded-full bg-muted -mt-2" />
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

export default HealthData;
