import { useState } from "react";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { FileText, Download, Pill, Calendar, User, Plus } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { getPrescriptions, addPrescription } from "@/services/medicalService";
import { useAsyncSync } from "@/hooks/useAsyncSync";
import { useAuth } from "@/contexts/AuthContext";

const Prescriptions = () => {
  const { t } = useTranslation();
  const [prescriptions] = useAsyncSync(getPrescriptions, []);
  const { userName, userId } = useAuth();
  const [showAdd, setShowAdd] = useState(false);
  const [medicine, setMedicine] = useState("");
  const [dosage, setDosage] = useState("");
  const [notes, setNotes] = useState("");
  const { toast } = useToast();

  const handleAdd = async () => {
    if (!medicine || !dosage) {
      toast({ title: t("prescriptions.toastMissing"), description: t("prescriptions.toastMissingDesc"), variant: "destructive" });
      return;
    }
    const today = new Date();
    const end = new Date(today);
    end.setMonth(end.getMonth() + 3);
    try {
      await addPrescription({
        patientId: userId || undefined,
        medicine,
        dosage,
        doctor: "Self-reported",
        patientName: userName || "Patient",
        date: today.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
        endDate: end.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
        status: "Active",
        notes: notes || "No additional notes",
        addedBy: "patient",
      });
      toast({ title: t("prescriptions.toastAdded"), description: t("prescriptions.toastAddedDesc", { medicine }) });
      setShowAdd(false);
      setMedicine("");
      setDosage("");
      setNotes("");
    } catch (e) {
      toast({ title: t("prescriptions.toastFailed"), variant: "destructive", description: e instanceof Error ? e.message : "" });
    }
  };

  const handleDownload = (p: typeof prescriptions[0]) => {
    const text = `${t("prescriptions.exportTitle")}\n\n${t("prescriptions.medicine")}: ${p.medicine}\n${t("prescriptions.dosage")}: ${p.dosage}\n${t("prescriptions.doctor")}: ${p.doctor}\n${t("prescriptions.date")}: ${p.date} — ${p.endDate}\n${t("prescriptions.notes")}: ${p.notes}\n${t("prescriptions.status")}: ${p.status}`;
    const blob = new Blob([text], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `prescription_${p.medicine.replace(/\s/g, "_")}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: t("prescriptions.toastDownloaded"), description: t("prescriptions.toastDownloadedDesc", { medicine: p.medicine }) });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-heading text-2xl font-bold">{t("prescriptions.title")} 📋</h2>
          <p className="text-muted-foreground">{t("prescriptions.subtitle")}</p>
        </div>
        <Button className="gradient-primary text-primary-foreground gap-2" onClick={() => setShowAdd(true)}>
          <Plus className="w-4 h-4" /> {t("prescriptions.add")}
        </Button>
      </div>

      <div className="space-y-4">
        {prescriptions.map((p, i) => (
          <motion.div key={p.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}>
            <Card className="shadow-card border-border/50">
              <CardContent className="p-5">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center mt-1">
                      <Pill className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-heading font-semibold">{p.medicine}</h3>
                      <p className="text-sm text-muted-foreground">{p.dosage}</p>
                      <div className="flex flex-wrap gap-3 mt-2 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1"><User className="w-3 h-3" />{p.doctor}</span>
                        <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{p.date} — {p.endDate}</span>
                        {p.addedBy === "patient" && <span className="text-xs px-2 py-0.5 rounded-full bg-accent/10 text-accent font-medium">{t("prescriptions.selfReported")}</span>}
                      </div>
                      <p className="text-xs text-muted-foreground mt-2 italic">"{p.notes}"</p>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${p.status === "Active" ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}>{p.status}</span>
                    <Button size="sm" variant="outline" className="text-xs gap-1" onClick={() => handleDownload(p)}><Download className="w-3 h-3" /> {t("prescriptions.download")}</Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Add Prescription Dialog */}
      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle className="font-heading">{t("prescriptions.add")}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div><Label>{t("prescriptions.medicine")}</Label><Input value={medicine} onChange={e => setMedicine(e.target.value)} placeholder={t("prescriptions.medicinePlaceholder")} /></div>
            <div><Label>{t("prescriptions.dosage")}</Label><Input value={dosage} onChange={e => setDosage(e.target.value)} placeholder={t("prescriptions.dosagePlaceholder")} /></div>
            <div><Label>{t("prescriptions.notesOptional")}</Label><Textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder={t("prescriptions.notesPlaceholder")} rows={3} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAdd(false)}>{t("prescriptions.cancel")}</Button>
            <Button className="gradient-primary text-primary-foreground" onClick={handleAdd}>{t("prescriptions.add")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Prescriptions;
