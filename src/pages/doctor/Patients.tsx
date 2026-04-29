import { useState } from "react";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { Search, Activity, Calendar, MessageSquare } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useNavigate } from "react-router-dom";
import { getRegisteredPatients, getPrescriptions, getAppointments } from "@/services/medicalService";
import { useAsyncSync } from "@/hooks/useAsyncSync";
import UserAvatar from "@/components/UserAvatar";


const statusColors: Record<string, string> = { Stable: "bg-primary/10 text-primary", Monitoring: "bg-yellow-500/10 text-yellow-600", Critical: "bg-destructive/10 text-destructive" };

const Patients = () => {
  const { t } = useTranslation();
  const [patients] = useAsyncSync(getRegisteredPatients, []);
  const [prescriptions] = useAsyncSync(getPrescriptions, []);
  const [appointments] = useAsyncSync(getAppointments, []);
  const [search, setSearch] = useState("");
  const [selectedPatient, setSelectedPatient] = useState<string | null>(null);
  const navigate = useNavigate();

  const filtered = patients.filter(p => p.name && (p.name.toLowerCase().includes(search.toLowerCase()) || p.condition.toLowerCase().includes(search.toLowerCase())));


  const patientRecords = selectedPatient ? {
    prescriptions: prescriptions.filter(p => p.patientName === selectedPatient),
    appointments: appointments.filter(a => a.patientName === selectedPatient),
  } : null;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-heading text-2xl font-bold">{t("doctorPatients.title")} 👥</h2>
        <p className="text-muted-foreground">{t("doctorPatients.subtitle")}</p>
      </div>
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
        <Input placeholder={t("doctorPatients.searchPlaceholder")} className="pl-10" value={search} onChange={e => setSearch(e.target.value)} />
      </div>
      <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
        {filtered.map((p, i) => (
          <motion.div key={p.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
            <Card className="shadow-card border-border/50 hover:shadow-elevated transition-all">
              <CardContent className="p-5">
                <div className="flex items-center gap-3 mb-4">
                  <UserAvatar
                    avatar={p.avatar}
                    name={p.name}
                    className="w-12 h-12 bg-accent/10 text-accent font-bold text-sm"
                  />

                  <div className="flex-1">
                    <h3 className="font-heading font-semibold text-sm">{p.name}</h3>
                    <p className="text-xs text-muted-foreground">{t("doctorPatients.age", { age: p.age })} • {p.condition}</p>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded-full font-medium ${statusColors[p.status] || "bg-muted text-muted-foreground"}`}>{p.status}</span>
                </div>
                <div className="flex items-center gap-4 text-xs text-muted-foreground mb-4">
                  <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />Last: {p.lastVisit}</span>
                  <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />Next: {p.nextVisit}</span>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" className="flex-1 text-xs" onClick={() => setSelectedPatient(p.name)}>
                    <Activity className="w-3 h-3 mr-1" />{t("doctorPatients.records")}
                  </Button>
                  <Button size="sm" variant="outline" className="flex-1 text-xs" onClick={() => navigate("/dashboard/doctor/messages")}>
                    <MessageSquare className="w-3 h-3 mr-1" />{t("doctorPatients.message")}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
        {filtered.length === 0 && <p className="text-muted-foreground col-span-full text-center py-8">{t("doctorPatients.empty")}</p>}
      </div>

      <Dialog open={!!selectedPatient} onOpenChange={() => setSelectedPatient(null)}>
        <DialogContent className="sm:max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader><DialogTitle className="font-heading">{t("doctorPatients.recordsFor", { patient: selectedPatient })}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <h4 className="font-medium text-sm mb-2">{t("doctorPatients.prescriptions", { count: patientRecords?.prescriptions.length || 0 })}</h4>
              {patientRecords?.prescriptions.length === 0 && <p className="text-xs text-muted-foreground">{t("doctorPatients.noPrescriptions")}</p>}
              {patientRecords?.prescriptions.map(p => (
                <div key={p.id} className="p-3 rounded-xl bg-secondary/50 border border-border/30 mb-2">
                  <p className="text-sm font-medium">{p.medicine}</p>
                  <p className="text-xs text-muted-foreground">{p.dosage} • {p.date}</p>
                </div>
              ))}
            </div>
            <div>
              <h4 className="font-medium text-sm mb-2">{t("doctorPatients.appointments", { count: patientRecords?.appointments.length || 0 })}</h4>
              {patientRecords?.appointments.length === 0 && <p className="text-xs text-muted-foreground">{t("doctorPatients.noAppointments")}</p>}
              {patientRecords?.appointments.map(a => (
                <div key={a.id} className="p-3 rounded-xl bg-secondary/50 border border-border/30 mb-2">
                  <p className="text-sm font-medium">{a.doctor} — {a.type}</p>
                  <p className="text-xs text-muted-foreground">{a.date} at {a.time} • <span className="capitalize">{a.status}</span></p>
                </div>
              ))}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Patients;
