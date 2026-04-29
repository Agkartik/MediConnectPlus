import { useState } from "react";
import { motion } from "framer-motion";
import { Shield, AlertTriangle, CheckCircle, Clock, FileText, Eye, Plus } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { getComplianceIssues, updateComplianceStatusWithNotes, addComplianceIssue } from "@/services/medicalService";
import { useAsyncSync } from "@/hooks/useAsyncSync";

const severityColors: Record<string, string> = { High: "bg-destructive/10 text-destructive border-destructive/30", Medium: "bg-yellow-500/10 text-yellow-600 border-yellow-500/30", Low: "bg-muted text-muted-foreground border-border/30" };
const statusColors: Record<string, string> = { Open: "bg-destructive/10 text-destructive", "Under Review": "bg-yellow-500/10 text-yellow-600", Resolved: "bg-primary/10 text-primary" };

const Compliance = () => {
  const [issues] = useAsyncSync(getComplianceIssues, []);
  const [reviewIssue, setReviewIssue] = useState<any>(null);
  const [resolutionNotes, setResolutionNotes] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [newIssue, setNewIssue] = useState({ type: "", entity: "", severity: "Medium" as any, desc: "", status: "Open" as any });
  const { toast } = useToast();

  const openCount = issues.filter(i => i.status !== "Resolved").length;
  const resolvedCount = issues.filter(i => i.status === "Resolved").length;
  const score = issues.length > 0 ? Math.round((resolvedCount / issues.length) * 100) : 100;

  const handleResolve = async (id: string) => {
    try {
      await updateComplianceStatusWithNotes(id, "Resolved", resolutionNotes);
      toast({ title: "Issue Resolved ✅", description: "Compliance issue marked as resolved." });
    } catch {
      toast({ title: "Failed", variant: "destructive" });
    }
    setReviewIssue(null);
  };

  const handleReview = async (id: string) => {
    try {
      await updateComplianceStatusWithNotes(id, "Under Review", resolutionNotes);
      toast({ title: "Under Review 🔍", description: "Issue is now being reviewed." });
    } catch {
      toast({ title: "Failed", variant: "destructive" });
    }
    setReviewIssue(null);
  };

  const handleAddIssue = async () => {
    if (!newIssue.type || !newIssue.entity) { toast({ title: "Fill required fields", variant: "destructive" }); return; }
    try {
      await addComplianceIssue(newIssue);
      toast({ title: "Issue Reported", description: `${newIssue.type} has been logged.` });
      setNewIssue({ type: "", entity: "", severity: "Medium", desc: "", status: "Open" });
      setShowAdd(false);
    } catch {
      toast({ title: "Failed", variant: "destructive" });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div><h2 className="font-heading text-2xl font-bold">Compliance & Security 🛡️</h2><p className="text-muted-foreground">Monitor platform compliance and resolve issues</p></div>
        <Button className="gradient-primary text-primary-foreground gap-2" onClick={() => setShowAdd(true)}><Plus className="w-4 h-4" />Report Issue</Button>
      </div>

      <div className="grid sm:grid-cols-4 gap-4">
        {[
          { label: "Compliance Score", value: `${score}%`, icon: Shield, color: "text-primary" },
          { label: "Open Issues", value: String(openCount), icon: AlertTriangle, color: "text-destructive" },
          { label: "Resolved", value: String(resolvedCount), icon: CheckCircle, color: "text-primary" },
          { label: "Total Issues", value: String(issues.length), icon: Clock, color: "text-accent" },
        ].map((s, i) => (
          <motion.div key={s.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}>
            <Card className="shadow-card border-border/50"><CardContent className="p-5"><s.icon className={`w-5 h-5 ${s.color} mb-2`} /><p className="text-2xl font-heading font-bold">{s.value}</p><p className="text-xs text-muted-foreground">{s.label}</p></CardContent></Card>
          </motion.div>
        ))}
      </div>

      <div className="space-y-4">
        {issues.map((issue, i) => (
          <motion.div key={issue.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}>
            <Card className={`shadow-card border ${severityColors[issue.severity]}`}>
              <CardContent className="p-5 flex items-start gap-4">
                <AlertTriangle className={`w-5 h-5 mt-0.5 ${issue.severity === "High" ? "text-destructive" : issue.severity === "Medium" ? "text-yellow-600" : "text-muted-foreground"}`} />
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-heading font-semibold text-sm">{issue.type}</h3>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColors[issue.status]}`}>{issue.status}</span>
                    <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-secondary text-secondary-foreground">{issue.category || "compliance"}</span>
                  </div>
                  <p className="text-xs text-muted-foreground mb-1">{issue.desc}</p>
                  <p className="text-xs text-muted-foreground">{issue.entity} • {issue.date}</p>
                  {issue.reporterName && (
                    <p className="text-xs text-muted-foreground">Reporter: {issue.reporterName} ({issue.reporterRole}) → {issue.reportedUserName}</p>
                  )}
                </div>
                {issue.status !== "Resolved" && (
                  <div className="flex gap-2">
                    {issue.status === "Open" && (
                      <Button size="sm" variant="outline" className="text-xs" onClick={() => handleReview(issue.id)}><Eye className="w-3 h-3 mr-1" />Review</Button>
                    )}
                    <Button size="sm" className="text-xs gradient-primary text-primary-foreground" onClick={() => handleResolve(issue.id)}><CheckCircle className="w-3 h-3 mr-1" />Resolve</Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Add Issue Dialog */}
      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent>
          <DialogHeader><DialogTitle className="font-heading">Report Compliance Issue</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Issue Type *</Label><Input value={newIssue.type} onChange={e => setNewIssue(p => ({ ...p, type: e.target.value }))} placeholder="e.g. Data Access Violation" /></div>
            <div><Label>Related Entity *</Label><Input value={newIssue.entity} onChange={e => setNewIssue(p => ({ ...p, entity: e.target.value }))} placeholder="e.g. Dr. Smith" /></div>
            <div><Label>Severity</Label>
              <Select value={newIssue.severity} onValueChange={v => setNewIssue(p => ({ ...p, severity: v as any }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="High">High</SelectItem>
                  <SelectItem value="Medium">Medium</SelectItem>
                  <SelectItem value="Low">Low</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div><Label>Description</Label><Input value={newIssue.desc} onChange={e => setNewIssue(p => ({ ...p, desc: e.target.value }))} placeholder="Brief description" /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAdd(false)}>Cancel</Button>
            <Button className="gradient-primary text-primary-foreground" onClick={handleAddIssue}>Report</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Card className="shadow-card border-border/50">
        <CardHeader>
          <CardTitle className="font-heading text-sm">Moderator Notes</CardTitle>
        </CardHeader>
        <CardContent>
          <Input value={resolutionNotes} onChange={(e) => setResolutionNotes(e.target.value)} placeholder="Write notes. Include word 'suspend' to auto-suspend reported user on resolve." />
        </CardContent>
      </Card>
    </div>
  );
};

export default Compliance;
