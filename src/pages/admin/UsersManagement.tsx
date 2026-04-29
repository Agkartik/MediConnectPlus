import { useState } from "react";
import { motion } from "framer-motion";
import { Search, Users, Ban, CheckCircle, FileText, Loader2 } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { getRegisteredPatients, updatePatientStatus, approvePatient, getPatientAdminDetail, type AdminPatientDetailResponse } from "@/services/medicalService";
import { useAsyncSync } from "@/hooks/useAsyncSync";
import { useEffect } from "react";


const UsersManagement = () => {
  const [search, setSearch] = useState("");
  const [patients] = useAsyncSync(getRegisteredPatients, []);
  const [reviewPatient, setReviewPatient] = useState<any>(null);
  const [confirmAction, setConfirmAction] = useState<{ id: string; name: string; action: "Suspend" | "Activate" } | null>(null);
  const [detailPatientId, setDetailPatientId] = useState<string | null>(null);
  const [detailPayload, setDetailPayload] = useState<AdminPatientDetailResponse | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const { toast } = useToast();


  const filtered = patients.filter(u => u.name.toLowerCase().includes(search.toLowerCase()));

  useEffect(() => {
    if (!detailPatientId) {
      setDetailPayload(null);
      return;
    }
    let cancelled = false;
    setDetailLoading(true);
    getPatientAdminDetail(detailPatientId)
      .then((data) => {
        if (!cancelled) setDetailPayload(data);
      })
      .catch(() => {
        if (!cancelled) {
          toast({ title: "Could not load patient", variant: "destructive" });
          setDetailPatientId(null);
        }
      })
      .finally(() => {
        if (!cancelled) setDetailLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [detailPatientId]);


  const handleConfirm = async () => {
    if (!confirmAction) return;
    const newStatus = confirmAction.action === "Suspend" ? "Suspended" : "Active";
    try {
      await updatePatientStatus(confirmAction.id, newStatus);
      toast({ title: `User ${confirmAction.action}d`, description: `${confirmAction.name} has been ${confirmAction.action.toLowerCase()}d.` });
    } catch {
      toast({ title: "Update failed", variant: "destructive" });
    }
    setConfirmAction(null);
  };

  const handleApprovePatient = async (id: string, name: string) => {
    try {
      await approvePatient(id);
      toast({ title: "Patient approved", description: `${name} can now use the platform.` });
    } catch {
      toast({ title: "Approval failed", variant: "destructive" });
    }
    setReviewPatient(null);
  };

  return (
    <div className="space-y-6">
      <div><h2 className="font-heading text-2xl font-bold">User Management 👥</h2><p className="text-muted-foreground">Manage all registered patients</p></div>

      <div className="grid sm:grid-cols-3 gap-4">
        <Card className="shadow-card border-border/50"><CardContent className="p-5"><Users className="w-5 h-5 text-primary mb-2" /><p className="text-2xl font-heading font-bold">{patients.length}</p><p className="text-xs text-muted-foreground">Total Patients</p></CardContent></Card>
        <Card className="shadow-card border-border/50"><CardContent className="p-5"><CheckCircle className="w-5 h-5 text-primary mb-2" /><p className="text-2xl font-heading font-bold">{patients.filter(p => p.userStatus !== "Suspended").length}</p><p className="text-xs text-muted-foreground">Active</p></CardContent></Card>
        <Card className="shadow-card border-border/50"><CardContent className="p-5"><Ban className="w-5 h-5 text-destructive mb-2" /><p className="text-2xl font-heading font-bold">{patients.filter(p => p.userStatus === "Suspended").length}</p><p className="text-xs text-muted-foreground">Suspended</p></CardContent></Card>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
        <Input placeholder="Search users..." className="pl-10" value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      <Card className="shadow-card border-border/50">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="border-b border-border bg-secondary/30">
                <th className="text-left p-4 font-medium text-muted-foreground">User</th>
                <th className="text-left p-4 font-medium text-muted-foreground">Condition</th>
                <th className="text-left p-4 font-medium text-muted-foreground">Last Visit</th>
                <th className="text-left p-4 font-medium text-muted-foreground">Coordinates</th>
                <th className="text-left p-4 font-medium text-muted-foreground">Verification</th>
                <th className="text-left p-4 font-medium text-muted-foreground">Status</th>
                <th className="text-right p-4 font-medium text-muted-foreground">Actions</th>
              </tr></thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr><td colSpan={7} className="p-8 text-center text-muted-foreground">No users found. Users appear here when they sign up.</td></tr>
                ) : filtered.map((u, i) => (
                  <motion.tr key={u.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.05 }} className="border-b border-border/50 hover:bg-secondary/20">
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold overflow-hidden">
                          {u.avatar && u.avatar.startsWith("data:image") ? (
                            <img src={u.avatar} alt={u.name} className="w-full h-full object-cover" />
                          ) : (
                            u.avatar || u.name.slice(0, 2).toUpperCase()
                          )}
                        </div>
                        <div><p className="font-medium">{u.name}</p><p className="text-xs text-muted-foreground">Age: {u.age}</p></div>
                      </div>
                    </td>
                    <td className="p-4 text-muted-foreground">{u.condition}</td>
                    <td className="p-4 text-muted-foreground">{u.lastVisit}</td>
                    <td className="p-4 text-muted-foreground text-xs">
                      {typeof u.latitude === "number" && typeof u.longitude === "number"
                        ? `${u.latitude.toFixed(5)}, ${u.longitude.toFixed(5)}`
                        : "Not set"}
                    </td>
                    <td className="p-4">
                      {u.approved === false ? (
                        <span className="text-xs px-2 py-1 rounded-full font-medium bg-yellow-500/10 text-yellow-700 dark:text-yellow-500">Pending</span>
                      ) : (
                        <span className="text-xs px-2 py-1 rounded-full font-medium bg-primary/10 text-primary">Approved</span>
                      )}
                    </td>
                    <td className="p-4">
                      <span className={`text-xs px-2 py-1 rounded-full font-medium ${u.userStatus === "Suspended" ? "bg-destructive/10 text-destructive" : "bg-primary/10 text-primary"}`}>
                        {u.userStatus || "Active"}
                      </span>
                    </td>
                    <td className="p-4 text-right space-y-1 flex flex-col items-end gap-1">
                      <Button
                        size="sm"
                        variant="secondary"
                        className="text-xs"
                        onClick={() => setDetailPatientId(u.id)}
                      >
                        <FileText className="w-3 h-3 mr-1" />
                        Details &amp; reports
                      </Button>
                      {u.approved === false && (

                        <div className="flex gap-1 justify-end">
                          <Button size="sm" variant="outline" className="text-xs" onClick={() => setReviewPatient(u)}>
                            <Search className="w-3 h-3 mr-1" />Review
                          </Button>
                          <Button size="sm" className="text-xs gradient-primary text-primary-foreground" onClick={() => handleApprovePatient(u.id, u.name)}>
                            <CheckCircle className="w-3 h-3 mr-1" />Approve
                          </Button>
                        </div>
                      )}
                      {u.userStatus === "Suspended" ? (
                        <Button size="sm" variant="outline" className="text-xs text-primary" onClick={() => setConfirmAction({ id: u.id, name: u.name, action: "Activate" })}>
                          <CheckCircle className="w-3 h-3 mr-1" />Activate
                        </Button>
                      ) : (
                        <Button size="sm" variant="outline" className="text-xs text-destructive" onClick={() => setConfirmAction({ id: u.id, name: u.name, action: "Suspend" })}>
                          <Ban className="w-3 h-3 mr-1" />Suspend
                        </Button>
                      )}
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={!!confirmAction} onOpenChange={() => setConfirmAction(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-heading">Confirm {confirmAction?.action}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Are you sure you want to {confirmAction?.action.toLowerCase()} <strong>{confirmAction?.name}</strong>?
            {confirmAction?.action === "Suspend" && " They will no longer be able to access the platform."}
            {confirmAction?.action === "Activate" && " They will regain access to the platform."}
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmAction(null)}>Cancel</Button>
            <Button className={confirmAction?.action === "Suspend" ? "bg-destructive text-destructive-foreground hover:bg-destructive/90" : "gradient-primary text-primary-foreground"} onClick={handleConfirm}>
              {confirmAction?.action}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Patient Review Dialog */}
      <Dialog open={!!reviewPatient} onOpenChange={() => setReviewPatient(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-heading">Patient Details Review</DialogTitle>
          </DialogHeader>
          {reviewPatient && (
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center text-primary text-2xl font-bold overflow-hidden">
                  {reviewPatient.avatar && reviewPatient.avatar.startsWith("data:image") ? (
                    <img src={reviewPatient.avatar} alt={reviewPatient.name} className="w-full h-full object-cover" />
                  ) : (
                    reviewPatient.avatar || reviewPatient.name.slice(0, 2).toUpperCase()
                  )}
                </div>
                <div><h3 className="font-heading font-bold text-lg">{reviewPatient.name}</h3><p className="text-muted-foreground">{reviewPatient.email}</p></div>
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="p-3 rounded-lg bg-secondary/50"><p className="text-muted-foreground text-xs">Phone</p><p className="font-medium">{reviewPatient.phone || "Not provided"}</p></div>
                <div className="p-3 rounded-lg bg-secondary/50"><p className="text-muted-foreground text-xs">Birth Date</p><p className="font-medium">{reviewPatient.dob || "Not provided"}</p></div>
                <div className="p-3 rounded-lg bg-secondary/50"><p className="text-muted-foreground text-xs">Gender</p><p className="font-medium">{reviewPatient.gender || "Not provided"}</p></div>
                <div className="p-3 rounded-lg bg-secondary/50"><p className="text-muted-foreground text-xs">Blood Group</p><p className="font-medium">{reviewPatient.bloodGroup || "Not provided"}</p></div>
                <div className="p-3 rounded-lg bg-secondary/50 col-span-2"><p className="text-muted-foreground text-xs">Location Coordinates</p><p className="font-medium">{typeof reviewPatient.latitude === "number" && typeof reviewPatient.longitude === "number" ? `${reviewPatient.latitude}, ${reviewPatient.longitude}` : "Not provided"}</p></div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setReviewPatient(null)}>Close</Button>
            <Button className="gradient-primary text-primary-foreground" onClick={() => handleApprovePatient(reviewPatient.id, reviewPatient.name)}>Approve Patient</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Patient Detail & Reports Dialog */}
      <Dialog open={!!detailPatientId} onOpenChange={(open) => !open && setDetailPatientId(null)}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-heading">Patient profile &amp; misconduct reports</DialogTitle>
          </DialogHeader>
          {detailLoading && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground py-6">
              <Loader2 className="w-4 h-4 animate-spin" />
              Loading…
            </div>
          )}
          {!detailLoading && detailPayload && (
            <div className="space-y-4 text-sm">
              <div className="flex items-center gap-3">
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xl font-bold overflow-hidden">
                  {detailPayload.patient.avatar && detailPayload.patient.avatar.startsWith("data:image") ? (
                    <img src={detailPayload.patient.avatar} alt={detailPayload.patient.name} className="w-full h-full object-cover" />
                  ) : (
                    detailPayload.patient.avatar || detailPayload.patient.name.slice(0, 2).toUpperCase()
                  )}
                </div>
                <div>
                  <p className="font-heading font-semibold text-lg">{detailPayload.patient.name}</p>
                  <p className="text-xs text-muted-foreground">{detailPayload.patient.email}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="p-2 rounded-lg bg-secondary/50">
                  <p className="text-xs text-muted-foreground">Condition</p>
                  <p className="font-medium">{detailPayload.patient.condition}</p>
                </div>
                <div className="p-2 rounded-lg bg-secondary/50">
                  <p className="text-xs text-muted-foreground">Phone</p>
                  <p className="font-medium">{detailPayload.patient.phone || "—"}</p>
                </div>
                <div className="p-2 rounded-lg bg-secondary/50">
                  <p className="text-xs text-muted-foreground">Blood Group</p>
                  <p className="font-medium">{detailPayload.patient.bloodGroup || "—"}</p>
                </div>
                <div className="p-2 rounded-lg bg-secondary/50">
                  <p className="text-xs text-muted-foreground">Gender</p>
                  <p className="font-medium">{detailPayload.patient.gender || "—"}</p>
                </div>
              </div>
              
              <div>
                <p className="font-medium mb-2 text-destructive">Misconduct reports against this patient ({detailPayload.misconductReports.length})</p>
                {detailPayload.misconductReports.length === 0 ? (
                  <p className="text-xs text-muted-foreground">No misconduct reports yet.</p>
                ) : (
                  <ul className="space-y-2 max-h-48 overflow-y-auto border border-border/50 rounded-lg p-2">
                    {detailPayload.misconductReports.map((r) => (
                      <li key={r.id} className="text-xs border-b border-border/30 pb-2 last:border-0">
                        <div className="flex justify-between font-medium">
                          <span>{r.date} · {r.severity}</span>
                          <span className="text-primary">{r.status}</span>
                        </div>
                        <p className="text-muted-foreground mt-1">{r.desc}</p>
                        <p className="text-[10px] text-muted-foreground italic mt-0.5">Reported by: {r.reporterName} ({r.reporterRole})</p>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDetailPatientId(null)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
};

export default UsersManagement;
