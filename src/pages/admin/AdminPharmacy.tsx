import { useState } from "react";
import { motion } from "framer-motion";
import { Pill, Search, Package, TrendingUp, AlertTriangle, Plus, Truck } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { getPharmacyMedicines, addPharmacyMedicine, updateMedicineStock, updatePharmacyMedicine, getDeliveryOrders, updateDeliveryStatus } from "@/services/medicalService";
import { useAsyncSync } from "@/hooks/useAsyncSync";
import type { PharmacyMedicine } from "@/types/store";

const statusColors: Record<string, string> = {
  Processing: "bg-yellow-500/10 text-yellow-600",
  Shipped: "bg-primary/10 text-primary",
  Delivered: "bg-primary/10 text-primary",
  Cancelled: "bg-destructive/10 text-destructive",
};

const AdminPharmacy = () => {
  const [search, setSearch] = useState("");
  const [medicines] = useAsyncSync(getPharmacyMedicines, []);
  const [orders] = useAsyncSync(getDeliveryOrders, []);
  const [showAdd, setShowAdd] = useState(false);
  const [editStock, setEditStock] = useState<{ id: number | string; name: string; stock: number } | null>(null);
  const [newMed, setNewMed] = useState({
    name: "",
    category: "",
    price: "",
    stock: "",
    requiresPrescription: false,
    description: "",
    usage: "",
    sideEffects: "",
    warnings: "",
  });
  const [editMed, setEditMed] = useState<{
    id: string;
    name: string;
    category: string;
    price: string;
    stock: string;
    requiresPrescription: boolean;
    description: string;
    usage: string;
    sideEffects: string;
    warnings: string;
  } | null>(null);
  const { toast } = useToast();

  const filtered = medicines.filter(i => i.name.toLowerCase().includes(search.toLowerCase()));
  const totalStock = medicines.reduce((s, m) => s + m.stock, 0);
  const totalSold = medicines.reduce((s, m) => s + m.sold, 0);
  const lowStockCount = medicines.filter(m => (m.stock > 0 && m.stock < 100) || m.stock === 0).length;

  const handleAddMedicine = async () => {
    if (!newMed.name || !newMed.category) { toast({ title: "Fill required fields", variant: "destructive" }); return; }
    try {
      await addPharmacyMedicine({
        name: newMed.name,
        category: newMed.category,
        price: parseFloat(newMed.price) || 0,
        stock: parseInt(newMed.stock) || 0,
        requiresPrescription: newMed.requiresPrescription,
        description: newMed.description,
        usage: newMed.usage,
        sideEffects: newMed.sideEffects,
        warnings: newMed.warnings,
      });
      toast({ title: "Medicine Added ✅", description: `${newMed.name} has been added to inventory.` });
      setNewMed({
        name: "",
        category: "",
        price: "",
        stock: "",
        requiresPrescription: false,
        description: "",
        usage: "",
        sideEffects: "",
        warnings: "",
      });
      setShowAdd(false);
    } catch {
      toast({ title: "Failed", variant: "destructive" });
    }
  };

  const handleUpdateStock = async () => {
    if (!editStock) return;
    try {
      await updateMedicineStock(editStock.id, editStock.stock);
      toast({ title: "Stock Updated", description: `${editStock.name} stock set to ${editStock.stock}` });
    } catch {
      toast({ title: "Update failed", variant: "destructive" });
    }
    setEditStock(null);
  };

  const stockKey = (item: PharmacyMedicine) => String(item._mongoId ?? item.id);

  const openEditDetails = (item: PharmacyMedicine) => {
    setEditMed({
      id: stockKey(item),
      name: item.name,
      category: item.category,
      price: String(item.price),
      stock: String(item.stock),
      requiresPrescription: item.requiresPrescription,
      description: item.description ?? "",
      usage: item.usage ?? "",
      sideEffects: item.sideEffects ?? "",
      warnings: item.warnings ?? "",
    });
  };

  const handleSaveEditDetails = async () => {
    if (!editMed) return;
    try {
      await updatePharmacyMedicine(editMed.id, {
        name: editMed.name,
        category: editMed.category,
        price: parseFloat(editMed.price) || 0,
        stock: parseInt(editMed.stock) || 0,
        requiresPrescription: editMed.requiresPrescription,
        description: editMed.description,
        usage: editMed.usage,
        sideEffects: editMed.sideEffects,
        warnings: editMed.warnings,
      });
      toast({ title: "Medicine updated", description: `${editMed.name} details saved.` });
      setEditMed(null);
    } catch {
      toast({ title: "Failed", variant: "destructive" });
    }
  };

  const getStockStatus = (stock: number) => {
    if (stock === 0) return { label: "Out of Stock", color: "bg-destructive/10 text-destructive" };
    if (stock < 100) return { label: "Low Stock", color: "bg-yellow-500/10 text-yellow-600" };
    return { label: "Good", color: "bg-primary/10 text-primary" };
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div><h2 className="font-heading text-2xl font-bold">Pharmacy Management 💊</h2><p className="text-muted-foreground">Monitor inventory, add medicines, and manage deliveries</p></div>
        <Button className="gradient-primary text-primary-foreground gap-2" onClick={() => setShowAdd(true)}><Plus className="w-4 h-4" />Add Medicine</Button>
      </div>

      <div className="grid sm:grid-cols-3 gap-4">
        <Card className="shadow-card border-border/50"><CardContent className="p-5"><Package className="w-5 h-5 text-primary mb-2" /><p className="text-2xl font-heading font-bold">{totalStock.toLocaleString()}</p><p className="text-xs text-muted-foreground">Total Stock Items</p></CardContent></Card>
        <Card className="shadow-card border-border/50"><CardContent className="p-5"><TrendingUp className="w-5 h-5 text-accent mb-2" /><p className="text-2xl font-heading font-bold">{totalSold.toLocaleString()}</p><p className="text-xs text-muted-foreground">Units Sold</p></CardContent></Card>
        <Card className="shadow-card border-border/50"><CardContent className="p-5"><AlertTriangle className="w-5 h-5 text-destructive mb-2" /><p className="text-2xl font-heading font-bold">{lowStockCount}</p><p className="text-xs text-muted-foreground">Low Stock Alerts</p></CardContent></Card>
      </div>

      <Tabs defaultValue="inventory">
        <TabsList>
          <TabsTrigger value="inventory"><Pill className="w-3.5 h-3.5 mr-1" />Inventory ({medicines.length})</TabsTrigger>
          <TabsTrigger value="orders"><Truck className="w-3.5 h-3.5 mr-1" />Orders ({orders.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="inventory" className="mt-4">
          <div className="relative max-w-md mb-4"><Search className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" /><Input placeholder="Search medicines..." className="pl-10" value={search} onChange={e => setSearch(e.target.value)} /></div>
          <Card className="shadow-card border-border/50">
            <CardContent className="p-0">
              <table className="w-full text-sm">
                <thead><tr className="border-b border-border bg-secondary/30">
                  <th className="text-left p-4 font-medium text-muted-foreground">Medicine</th>
                  <th className="text-left p-4 font-medium text-muted-foreground">Category</th>
                  <th className="text-left p-4 font-medium text-muted-foreground">Price</th>
                  <th className="text-left p-4 font-medium text-muted-foreground">Stock</th>
                  <th className="text-left p-4 font-medium text-muted-foreground">Sold</th>
                  <th className="text-left p-4 font-medium text-muted-foreground">Status</th>
                  <th className="text-right p-4 font-medium text-muted-foreground">Actions</th>
                </tr></thead>
                <tbody>
                  {filtered.map((item, i) => {
                    const st = getStockStatus(item.stock);
                    return (
                      <motion.tr key={item.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.05 }} className="border-b border-border/50 hover:bg-secondary/20">
                        <td className="p-4 font-medium flex items-center gap-2"><Pill className="w-4 h-4 text-primary" />{item.name}</td>
                        <td className="p-4 text-muted-foreground">{item.category}</td>
                        <td className="p-4">${item.price.toFixed(2)}</td>
                        <td className="p-4">{item.stock}</td>
                        <td className="p-4">{item.sold}</td>
                        <td className="p-4"><span className={`text-xs px-2 py-1 rounded-full font-medium ${st.color}`}>{st.label}</span></td>
                        <td className="p-4 text-right">
                          <div className="flex justify-end gap-1 flex-wrap">
                            <Button size="sm" variant="secondary" className="text-xs" onClick={() => openEditDetails(item)}>Details</Button>
                            <Button size="sm" variant="outline" className="text-xs" onClick={() => setEditStock({ id: stockKey(item), name: item.name, stock: item.stock })}>Stock</Button>
                          </div>
                        </td>
                      </motion.tr>
                    );
                  })}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="orders" className="mt-4">
          <Card className="shadow-card border-border/50">
            <CardContent className="p-0">
              {orders.length === 0 ? (
                <p className="p-8 text-center text-muted-foreground">No orders yet. Orders appear when patients or doctors purchase medicines.</p>
              ) : (
                <table className="w-full text-sm">
                  <thead><tr className="border-b border-border bg-secondary/30">
                    <th className="text-left p-4 font-medium text-muted-foreground">Buyer</th>
                    <th className="text-left p-4 font-medium text-muted-foreground">Items</th>
                    <th className="text-left p-4 font-medium text-muted-foreground">Total</th>
                    <th className="text-left p-4 font-medium text-muted-foreground">Date</th>
                    <th className="text-left p-4 font-medium text-muted-foreground">Status</th>
                    <th className="text-right p-4 font-medium text-muted-foreground">Actions</th>
                  </tr></thead>
                  <tbody>
                    {orders.map((o, i) => (
                      <motion.tr key={o.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.05 }} className="border-b border-border/50 hover:bg-secondary/20">
                        <td className="p-4"><p className="font-medium">{o.buyerName}</p><p className="text-xs text-muted-foreground capitalize">{o.buyerRole}</p></td>
                        <td className="p-4 text-muted-foreground">{o.items.map(it => it.name).join(", ")}</td>
                        <td className="p-4 font-medium">${o.total.toFixed(2)}</td>
                        <td className="p-4 text-muted-foreground">{o.date}</td>
                        <td className="p-4"><span className={`text-xs px-2 py-1 rounded-full font-medium ${statusColors[o.status] || ""}`}>{o.status}</span></td>
                        <td className="p-4 text-right">
                          <div className="flex justify-end gap-1">
                            {o.status === "Processing" && (
                              <Button size="sm" variant="outline" className="text-xs" onClick={async () => { try { await updateDeliveryStatus(o.id, "Shipped"); toast({ title: "Order Shipped 📦" }); } catch { toast({ title: "Failed", variant: "destructive" }); } }}>Ship</Button>
                            )}
                            {o.status === "Shipped" && (
                              <Button size="sm" className="text-xs gradient-primary text-primary-foreground" onClick={async () => { try { await updateDeliveryStatus(o.id, "Delivered"); toast({ title: "Order Delivered ✅" }); } catch { toast({ title: "Failed", variant: "destructive" }); } }}>Delivered</Button>
                            )}
                            {(o.status === "Processing" || o.status === "Shipped") && (
                              <Button size="sm" variant="outline" className="text-xs text-destructive" onClick={async () => { try { await updateDeliveryStatus(o.id, "Cancelled"); toast({ title: "Order Cancelled", variant: "destructive" }); } catch { toast({ title: "Failed", variant: "destructive" }); } }}>Cancel</Button>
                            )}
                          </div>
                        </td>
                      </motion.tr>
                    ))}
                  </tbody>
                </table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Add Medicine Dialog */}
      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">

          <DialogHeader><DialogTitle className="font-heading">Add New Medicine</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Name *</Label><Input value={newMed.name} onChange={e => setNewMed(p => ({ ...p, name: e.target.value }))} placeholder="e.g. Aspirin 100mg" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Category *</Label><Input value={newMed.category} onChange={e => setNewMed(p => ({ ...p, category: e.target.value }))} placeholder="e.g. Pain Relief" /></div>
              <div><Label>Price ($)</Label><Input type="number" value={newMed.price} onChange={e => setNewMed(p => ({ ...p, price: e.target.value }))} placeholder="9.99" /></div>
            </div>
            <div><Label>Initial Stock</Label><Input type="number" value={newMed.stock} onChange={e => setNewMed(p => ({ ...p, stock: e.target.value }))} placeholder="100" /></div>
            <div><Label>Short summary</Label><Input value={newMed.description} onChange={e => setNewMed(p => ({ ...p, description: e.target.value }))} placeholder="One line on the shop card" /></div>
            <div><Label>Uses &amp; what it treats</Label><Textarea value={newMed.usage} onChange={e => setNewMed(p => ({ ...p, usage: e.target.value }))} placeholder="Conditions, symptoms, or typical use (shown to patients & doctors)" rows={3} /></div>
            <div><Label>Side effects</Label><Textarea value={newMed.sideEffects} onChange={e => setNewMed(p => ({ ...p, sideEffects: e.target.value }))} placeholder="Common side effects — informational only" rows={2} /></div>
            <div><Label>Warnings</Label><Textarea value={newMed.warnings} onChange={e => setNewMed(p => ({ ...p, warnings: e.target.value }))} placeholder="Precautions, interactions, who should avoid" rows={2} /></div>
            <div className="flex items-center justify-between">
              <div><p className="text-sm font-medium">Requires Prescription</p><p className="text-xs text-muted-foreground">Only available with doctor's prescription</p></div>
              <Switch checked={newMed.requiresPrescription} onCheckedChange={v => setNewMed(p => ({ ...p, requiresPrescription: v }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAdd(false)}>Cancel</Button>
            <Button className="gradient-primary text-primary-foreground" onClick={handleAddMedicine}>Add Medicine</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Update Stock Dialog */}
      <Dialog open={!!editStock} onOpenChange={() => setEditStock(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle className="font-heading">Update Stock: {editStock?.name}</DialogTitle></DialogHeader>
          <div><Label>New Stock Quantity</Label><Input type="number" value={editStock?.stock || 0} onChange={e => setEditStock(prev => prev ? { ...prev, stock: parseInt(e.target.value) || 0 } : null)} /></div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditStock(null)}>Cancel</Button>
            <Button className="gradient-primary text-primary-foreground" onClick={handleUpdateStock}>Update</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editMed} onOpenChange={(o) => !o && setEditMed(null)}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle className="font-heading">Medicine details</DialogTitle></DialogHeader>
          {editMed && (
            <div className="space-y-4">
              <div><Label>Name</Label><Input value={editMed.name} onChange={e => setEditMed(p => p ? { ...p, name: e.target.value } : p)} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Category</Label><Input value={editMed.category} onChange={e => setEditMed(p => p ? { ...p, category: e.target.value } : p)} /></div>
                <div><Label>Price ($)</Label><Input type="number" value={editMed.price} onChange={e => setEditMed(p => p ? { ...p, price: e.target.value } : p)} /></div>
              </div>
              <div><Label>Stock</Label><Input type="number" value={editMed.stock} onChange={e => setEditMed(p => p ? { ...p, stock: e.target.value } : p)} /></div>
              <div><Label>Short summary</Label><Input value={editMed.description} onChange={e => setEditMed(p => p ? { ...p, description: e.target.value } : p)} /></div>
              <div><Label>Uses &amp; what it treats</Label><Textarea value={editMed.usage} onChange={e => setEditMed(p => p ? { ...p, usage: e.target.value } : p)} rows={3} /></div>
              <div><Label>Side effects</Label><Textarea value={editMed.sideEffects} onChange={e => setEditMed(p => p ? { ...p, sideEffects: e.target.value } : p)} rows={2} /></div>
              <div><Label>Warnings</Label><Textarea value={editMed.warnings} onChange={e => setEditMed(p => p ? { ...p, warnings: e.target.value } : p)} rows={2} /></div>
              <div className="flex items-center justify-between">
                <div><p className="text-sm font-medium">Requires prescription</p></div>
                <Switch checked={editMed.requiresPrescription} onCheckedChange={v => setEditMed(p => p ? { ...p, requiresPrescription: v } : p)} />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditMed(null)}>Cancel</Button>
            <Button className="gradient-primary text-primary-foreground" onClick={handleSaveEditDetails}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminPharmacy;
