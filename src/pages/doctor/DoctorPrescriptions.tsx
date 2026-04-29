import { useState } from "react";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { Plus, Search, User, Pill, Calendar } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { getPrescriptions, addPrescription, getRegisteredPatients } from "@/services/medicalService";
import { useAsyncSync } from "@/hooks/useAsyncSync";
import { useAuth } from "@/contexts/AuthContext";

const DoctorPrescriptions = () => {
  const { t, i18n } = useTranslation();
  const [prescriptions] = useAsyncSync(getPrescriptions, []);
  const [patients] = useAsyncSync(getRegisteredPatients, []);
  const [search, setSearch] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [medicine, setMedicine] = useState("");
  const [dosage, setDosage] = useState("");
  const [notes, setNotes] = useState("");
  const [selectedPatient, setSelectedPatient] = useState("");
  const { userName } = useAuth();
  const { toast } = useToast();

  const filtered = prescriptions.filter(p =>
    p.patientName.toLowerCase().includes(search.toLowerCase()) ||
    p.medicine.toLowerCase().includes(search.toLowerCase())
  );

  const handleAdd = async () => {
    if (!medicine || !dosage || !selectedPatient) {
      toast({ title: t("doctorPrescriptions.toastMissing"), description: t("doctorPrescriptions.toastMissingDesc"), variant: "destructive" });
      return;
    }
    const patient = patients.find(p => p.name === selectedPatient);
    const today = new Date();
    const end = new Date(today);
    end.setMonth(end.getMonth() + 3);
    try {
      await addPrescription({
        patientId: patient?.id,
        medicine,
        dosage,
        doctor: userName || t("doctorPrescriptions.doctorFallback"),
        patientName: selectedPatient,
        date: today.toLocaleDateString(i18n.language, { month: "short", day: "numeric", year: "numeric" }),
        endDate: end.toLocaleDateString(i18n.language, { month: "short", day: "numeric", year: "numeric" }),
        status: "Active",
        notes: notes || t("doctorPrescriptions.noNotes"),
        addedBy: "doctor",
      });
      toast({ title: t("doctorPrescriptions.toastAdded"), description: t("doctorPrescriptions.toastAddedDesc", { medicine, patient: selectedPatient }) });
      setShowAdd(false);
      setMedicine("");
      setDosage("");
      setNotes("");
      setSelectedPatient("");
    } catch (e) {
      toast({ title: t("doctorPrescriptions.toastFailed"), variant: "destructive", description: e instanceof Error ? e.message : "" });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-heading text-2xl font-bold">Prescriptions 📝</h2>
          <p className="text-muted-foreground">{t("doctorPrescriptions.subtitle")}</p>
        </div>
        <Button className="gradient-primary text-primary-foreground gap-2" onClick={() => setShowAdd(true)}><Plus className="w-4 h-4" /> {t("doctorPrescriptions.new")}</Button>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
        <Input placeholder={t("doctorPrescriptions.searchPlaceholder")} className="pl-10" value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      <div className="space-y-3">
        {filtered.map((p, i) => (
          <motion.div key={p.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}>
            <Card className="shadow-card border-border/50">
              <CardContent className="p-4 flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center"><Pill className="w-5 h-5 text-primary" /></div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-heading font-semibold text-sm">{p.medicine}</h3>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${p.status === "Active" ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}>{p.status}</span>
                    {p.addedBy === "patient" && <span className="text-xs px-2 py-0.5 rounded-full bg-accent/10 text-accent font-medium">{t("prescriptions.selfReported")}</span>}
                  </div>
                  <div className="flex gap-3 mt-1 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1"><User className="w-3 h-3" />{p.patientName}</span>
                    <span>{p.dosage}</span>
                    <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{p.date}</span>
                  </div>
                  {p.notes && <p className="text-xs text-muted-foreground mt-1 italic">"{p.notes}"</p>}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
        {filtered.length === 0 && <p className="text-center text-muted-foreground py-8">{t("doctorPrescriptions.empty")}</p>}
      </div>

      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle className="font-heading">{t("doctorPrescriptions.new")}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label>{t("doctorPrescriptions.patient")}</Label>
              <Select value={selectedPatient} onValueChange={setSelectedPatient}>
                <SelectTrigger><SelectValue placeholder={t("doctorPrescriptions.selectPatient")} /></SelectTrigger>
                <SelectContent>
                  {patients.map(p => <SelectItem key={p.id} value={p.name}>{p.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div><Label>{t("prescriptions.medicine")}</Label><Input value={medicine} onChange={e => setMedicine(e.target.value)} placeholder={t("doctorPrescriptions.medicinePlaceholder")} /></div>
            <div><Label>{t("prescriptions.dosage")}</Label><Input value={dosage} onChange={e => setDosage(e.target.value)} placeholder={t("doctorPrescriptions.dosagePlaceholder")} /></div>
            <div><Label>{t("prescriptions.notes")}</Label><Textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder={t("doctorPrescriptions.notesPlaceholder")} rows={3} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAdd(false)}>{t("prescriptions.cancel")}</Button>
            <Button className="gradient-primary text-primary-foreground" onClick={handleAdd}>{t("doctorPrescriptions.add")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default DoctorPrescriptions;
