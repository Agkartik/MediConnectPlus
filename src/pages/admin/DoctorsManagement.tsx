import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Search, Stethoscope, CheckCircle, XCircle, Star, FileText, Ban, Loader2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import {
  getAllDoctorsForAdmin,
  approveDoctor,
  rejectDoctor,
  updateDoctorStatus,
  getDoctorAdminDetail,
  type AdminDoctorDetailResponse,
} from "@/services/medicalService";
import { useAsyncSync } from "@/hooks/useAsyncSync";
import UserAvatar from "@/components/UserAvatar";


const DoctorsManagement = () => {
  const [search, setSearch] = useState("");
  const [splitDoctors] = useAsyncSync(getAllDoctorsForAdmin, { approved: [], pending: [] });
  const [reviewDoc, setReviewDoc] = useState<any>(null);
  const [confirmAction, setConfirmAction] = useState<{ id: string; name: string; action: string } | null>(null);
  const [detailDoctorId, setDetailDoctorId] = useState<string | null>(null);
  const [detailPayload, setDetailPayload] = useState<AdminDoctorDetailResponse | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (!detailDoctorId) {
      setDetailPayload(null);
      return;
    }
    let cancelled = false;
    setDetailLoading(true);
    setDetailPayload(null);
    getDoctorAdminDetail(detailDoctorId)
      .then((data) => {
        if (!cancelled) setDetailPayload(data);
      })
      .catch(() => {
        if (!cancelled) {
          toast({ title: "Could not load doctor", variant: "destructive" });
          setDetailDoctorId(null);
        }
      })
      .finally(() => {
        if (!cancelled) setDetailLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [detailDoctorId]);

  const pendingDoctors = splitDoctors.pending;
  const activeDoctors = splitDoctors.approved;

  const handleApprove = async (id: string, name: string) => {
    try {
      await approveDoctor(id);
      toast({ title: "Doctor Approved ✅", description: `${name} has been approved and can now see patients.` });
    } catch {
      toast({ title: "Failed", variant: "destructive" });
    }
    setReviewDoc(null);
  };

  const handleReject = async (id: string, name: string) => {
    try {
      await rejectDoctor(id);
      toast({ title: "Doctor Rejected", description: `${name}'s application has been rejected.`, variant: "destructive" });
    } catch {
      toast({ title: "Failed", variant: "destructive" });
    }
    setReviewDoc(null);
  };

  const handleStatusChange = async () => {
    if (!confirmAction) return;
    const newStatus = confirmAction.action === "Suspend" ? "Suspended" : "Active";
    try {
      await updateDoctorStatus(confirmAction.id, newStatus);
      toast({ title: `Doctor ${confirmAction.action}d`, description: `${confirmAction.name} has been ${confirmAction.action.toLowerCase()}d.` });
    } catch {
      toast({ title: "Failed", variant: "destructive" });
    }
    setConfirmAction(null);
  };

  return (
    <div className="space-y-6">
      <div><h2 className="font-heading text-2xl font-bold">Doctor Management 🩺</h2><p className="text-muted-foreground">Approve, manage and monitor platform doctors</p></div>

      <div className="grid sm:grid-cols-3 gap-4">
        <Card className="shadow-card border-border/50"><CardContent className="p-5"><Stethoscope className="w-5 h-5 text-primary mb-2" /><p className="text-2xl font-heading font-bold">{activeDoctors.length}</p><p className="text-xs text-muted-foreground">Active Doctors</p></CardContent></Card>
        <Card className="shadow-card border-border/50"><CardContent className="p-5"><FileText className="w-5 h-5 text-accent mb-2" /><p className="text-2xl font-heading font-bold">{pendingDoctors.length}</p><p className="text-xs text-muted-foreground">Pending Approval</p></CardContent></Card>
        <Card className="shadow-card border-border/50"><CardContent className="p-5"><Ban className="w-5 h-5 text-destructive mb-2" /><p className="text-2xl font-heading font-bold">{activeDoctors.filter(d => d.status === "Suspended").length}</p><p className="text-xs text-muted-foreground">Suspended</p></CardContent></Card>
      </div>

      <Tabs defaultValue={pendingDoctors.length > 0 ? "pending" : "active"}>
        <TabsList>
          <TabsTrigger value="pending">Pending ({pendingDoctors.length})</TabsTrigger>
          <TabsTrigger value="active">Active ({activeDoctors.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="space-y-4 mt-4">
          {pendingDoctors.length === 0 ? (
            <Card className="shadow-card border-border/50"><CardContent className="p-8 text-center text-muted-foreground">No pending doctor applications. New doctors appear here when they sign up.</CardContent></Card>
          ) : pendingDoctors.map((d, i) => (
            <motion.div key={d.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}>
              <Card className="shadow-card border-border/50">
                <CardContent className="p-5 flex items-center gap-4">
                  <UserAvatar
                    avatar={d.avatar}
                    name={d.name}
                    className="w-12 h-12 bg-accent/10 text-accent"
                  />

                  <div className="flex-1">
                    <h3 className="font-heading font-semibold">{d.name}</h3>
                    <p className="text-xs text-muted-foreground">{d.specialty} • Fee: {d.fee}</p>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" className="text-xs" onClick={() => setReviewDoc(d)}><FileText className="w-3 h-3 mr-1" />Review</Button>
                    <Button size="sm" className="gradient-primary text-primary-foreground text-xs" onClick={() => handleApprove(d.id, d.name)}><CheckCircle className="w-3 h-3 mr-1" />Approve</Button>
                    <Button size="sm" variant="outline" className="text-xs text-destructive" onClick={() => handleReject(d.id, d.name)}><XCircle className="w-3 h-3 mr-1" />Reject</Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </TabsContent>

        <TabsContent value="active" className="mt-4">
          <div className="relative max-w-md mb-4">
            <Search className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Search doctors..." className="pl-10" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            {activeDoctors.filter(d => d.name.toLowerCase().includes(search.toLowerCase())).map((d, i) => (
              <motion.div key={d.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                <Card className="shadow-card border-border/50">
                  <CardContent className="p-5">
                    <div className="flex items-center gap-3 mb-3">
                      <UserAvatar
                        avatar={d.avatar}
                        name={d.name}
                        className="w-12 h-12 gradient-primary text-primary-foreground border-2 border-primary/20"
                      />

                      <div className="flex-1">
                        <h3 className="font-heading font-semibold text-sm">{d.name}</h3>
                        <p className="text-xs text-muted-foreground">{d.specialty}</p>
                      </div>
                      <span className={`text-xs px-2 py-1 rounded-full font-medium ${d.status === "Suspended" ? "bg-destructive/10 text-destructive" : "bg-primary/10 text-primary"}`}>
                        {d.status || "Active"}
                      </span>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-center mb-3">
                      <div className="p-2 rounded-lg bg-secondary/50"><p className="text-lg font-bold flex items-center justify-center gap-1"><Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />{d.rating != null ? d.rating : "—"}</p><p className="text-xs text-muted-foreground">Rating</p></div>
                      <div className="p-2 rounded-lg bg-secondary/50"><p className="text-lg font-bold">{d.reviews}</p><p className="text-xs text-muted-foreground">Reviews</p></div>
                      <div className="p-2 rounded-lg bg-secondary/50"><p className="text-lg font-bold text-primary">{d.fee}</p><p className="text-xs text-muted-foreground">Fee</p></div>
                    </div>
                    <div className="flex justify-end flex-wrap gap-2">
                      <Button
                        size="sm"
                        variant="secondary"
                        className="text-xs"
                        onClick={() => setDetailDoctorId(d.id)}
                      >
                        <FileText className="w-3 h-3 mr-1" />
                        Details &amp; reports
                      </Button>
                      {d.status === "Suspended" ? (
                        <Button size="sm" variant="outline" className="text-xs text-primary" onClick={() => setConfirmAction({ id: d.id, name: d.name, action: "Activate" })}>
                          <CheckCircle className="w-3 h-3 mr-1" />Activate
                        </Button>
                      ) : (
                        <Button size="sm" variant="outline" className="text-xs text-destructive" onClick={() => setConfirmAction({ id: d.id, name: d.name, action: "Suspend" })}>
                          <Ban className="w-3 h-3 mr-1" />Suspend
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      {/* Review Dialog */}
      <Dialog open={!!reviewDoc} onOpenChange={() => setReviewDoc(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle className="font-heading">Doctor Application Review</DialogTitle></DialogHeader>
          {reviewDoc && (
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <UserAvatar
                  avatar={reviewDoc.avatar}
                  name={reviewDoc.name}
                  className="w-16 h-16 bg-accent/10 text-accent text-xl"
                />

                <div><h3 className="font-heading font-bold text-lg">{reviewDoc.name}</h3><p className="text-muted-foreground">{reviewDoc.specialty}</p><p className="text-xs text-muted-foreground">{reviewDoc.email || "No email"}</p></div>
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="p-3 rounded-lg bg-secondary/50"><p className="text-muted-foreground text-xs">Fee</p><p className="font-medium">{reviewDoc.fee}</p></div>
                <div className="p-3 rounded-lg bg-secondary/50"><p className="text-muted-foreground text-xs">Experience</p><p className="font-medium">{reviewDoc.experience} Years</p></div>
                <div className="p-3 rounded-lg bg-secondary/50"><p className="text-muted-foreground text-xs">License #</p><p className="font-medium">{reviewDoc.license}</p></div>
                <div className="p-3 rounded-lg bg-secondary/50"><p className="text-muted-foreground text-xs">Qualification</p><p className="font-medium">{reviewDoc.qualification || "Not provided"}</p></div>
                <div className="p-3 rounded-lg bg-secondary/50"><p className="text-muted-foreground text-xs">Phone</p><p className="font-medium">{reviewDoc.phone || "Not provided"}</p></div>
                <div className="p-3 rounded-lg bg-secondary/50"><p className="text-muted-foreground text-xs">Verification</p><p className="font-medium">{reviewDoc.verificationStatus || "pending"}</p></div>
                <div className="p-3 rounded-lg bg-secondary/50"><p className="text-muted-foreground text-xs">Modes</p><p className="font-medium capitalize">{reviewDoc.modes?.join(", ") || "N/A"}</p></div>
                <div className="p-3 rounded-lg bg-secondary/50"><p className="text-muted-foreground text-xs">Distance</p><p className="font-medium">{reviewDoc.distance || "N/A"}</p></div>
                <div className="p-3 rounded-lg bg-secondary/50 col-span-2"><p className="text-muted-foreground text-xs">Clinic Address</p><p className="font-medium">{reviewDoc.practiceAddress || reviewDoc.hospital || "Not provided"}</p></div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" className="text-destructive" onClick={() => { handleReject(reviewDoc.id, reviewDoc.name); }}>Reject</Button>
            <Button className="gradient-primary text-primary-foreground" onClick={() => { handleApprove(reviewDoc.id, reviewDoc.name); }}>Approve</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!detailDoctorId}
        onOpenChange={(open) => {
          if (!open) setDetailDoctorId(null);
        }}
      >
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-heading">Doctor profile &amp; misconduct reports</DialogTitle>
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
                <UserAvatar
                  avatar={detailPayload.doctor.avatar}
                  name={detailPayload.doctor.name}
                  className="w-20 h-20 border-4 border-primary/10 text-2xl gradient-primary text-primary-foreground"
                />

                <div>
                  <p className="font-heading font-semibold">{detailPayload.doctor.name}</p>
                  <p className="text-xs text-muted-foreground">{detailPayload.doctor.email}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="p-2 rounded-lg bg-secondary/50">
                  <p className="text-xs text-muted-foreground">Specialty</p>
                  <p className="font-medium">{detailPayload.doctor.specialty}</p>
                </div>
                <div className="p-2 rounded-lg bg-secondary/50">
                  <p className="text-xs text-muted-foreground">Fee</p>
                  <p className="font-medium">{detailPayload.doctor.fee}</p>
                </div>
                <div className="p-2 rounded-lg bg-secondary/50">
                  <p className="text-xs text-muted-foreground">License #</p>
                  <p className="font-medium">{detailPayload.doctor.license || "—"}</p>
                </div>
                <div className="p-2 rounded-lg bg-secondary/50">
                  <p className="text-xs text-muted-foreground">Experience</p>
                  <p className="font-medium">{detailPayload.doctor.experience || "—"}</p>
                </div>
                <div className="p-2 rounded-lg bg-secondary/50 col-span-2">
                  <p className="text-xs text-muted-foreground">Qualification</p>
                  <p className="font-medium">{detailPayload.doctor.qualification || "—"}</p>
                </div>
                <div className="p-2 rounded-lg bg-secondary/50 col-span-2">
                  <p className="text-xs text-muted-foreground">Practice / clinic</p>
                  <p className="font-medium">{detailPayload.doctor.practiceAddress || detailPayload.doctor.hospital || "—"}</p>
                </div>
              </div>
              <div>
                <p className="font-medium mb-2">Reports filed against this doctor ({detailPayload.misconductReports.length})</p>
                {detailPayload.misconductReports.length === 0 ? (
                  <p className="text-xs text-muted-foreground">No misconduct reports yet.</p>
                ) : (
                  <ul className="space-y-2 max-h-48 overflow-y-auto border border-border/50 rounded-lg p-2">
                    {detailPayload.misconductReports.map((r) => (
                      <li key={r.id} className="text-xs border-b border-border/30 pb-2 last:border-0">
                        <span className="font-medium">{r.date}</span> · {r.severity} · {r.status}
                        <p className="text-muted-foreground mt-1">{r.desc}</p>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDetailDoctorId(null)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirm Status Dialog */}
      <Dialog open={!!confirmAction} onOpenChange={() => setConfirmAction(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle className="font-heading">Confirm {confirmAction?.action}</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">
            Are you sure you want to {confirmAction?.action.toLowerCase()} <strong>{confirmAction?.name}</strong>?
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmAction(null)}>Cancel</Button>
            <Button className={confirmAction?.action === "Suspend" ? "bg-destructive text-destructive-foreground hover:bg-destructive/90" : "gradient-primary text-primary-foreground"} onClick={handleStatusChange}>
              {confirmAction?.action}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default DoctorsManagement;
