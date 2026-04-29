import { useState } from "react";
import { useTranslation } from "react-i18next";
import { motion, AnimatePresence } from "framer-motion";
import { Pill, Search, ShoppingCart, Plus, Minus, Package, CreditCard, CheckCircle, X, Truck, MapPin, Clock } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import {
  getPharmacyMedicines,
  addDeliveryOrder,
  getDeliveryOrders,
  getPaymentConfig,
  createRazorpayCartOrder,
  verifyRazorpayAndCreateOrder,
} from "@/services/medicalService";
import { useAsyncSync } from "@/hooks/useAsyncSync";
import { loadRazorpayScript, razorpayPaymentMethodConfig } from "@/lib/razorpayCheckout";
import { MedicineDetailsDialog } from "@/components/pharmacy/MedicineDetailsDialog";
import type { PharmacyMedicine } from "@/types/store";

type OrderStatus = "idle" | "cart" | "checkout" | "processing" | "confirmed";

function formatMoney(amount: number, useInr: boolean) {
  if (useInr) return `₹${amount.toFixed(2)}`;
  return `$${amount.toFixed(2)}`;
}

const Pharmacy = () => {
  const { t } = useTranslation();
  const [medicines] = useAsyncSync(getPharmacyMedicines, []);
  const [orders] = useAsyncSync(getDeliveryOrders, []);
  const [payConfig] = useAsyncSync(getPaymentConfig, {
    razorpayEnabled: false,
    keyId: null,
    currency: "INR",
    allowUnpaidPharmacyOrders: false,
    allowUnpaidAppointments: false,
  });
  const { userName, email } = useAuth();
  const useInr = payConfig.razorpayEnabled;
  const [search, setSearch] = useState("");
  const [cart, setCart] = useState<Record<number, number>>({});
  const [orderStatus, setOrderStatus] = useState<OrderStatus>("idle");
  const [showCart, setShowCart] = useState(false);
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [detailMed, setDetailMed] = useState<PharmacyMedicine | null>(null);
  const { toast } = useToast();

  const filtered = medicines.filter(m => m.name.toLowerCase().includes(search.toLowerCase()) || m.category.toLowerCase().includes(search.toLowerCase()));
  const cartCount = Object.values(cart).reduce((a, b) => a + b, 0);
  const cartTotal = medicines.reduce((sum, m) => sum + (cart[m.id] || 0) * m.price, 0);
  const cartItems = medicines.filter(m => cart[m.id]);
  const myOrders = orders.filter(o => o.buyerName === userName && o.buyerRole === "patient");

  const addToCart = (id: number) => setCart(prev => ({ ...prev, [id]: (prev[id] || 0) + 1 }));
  const removeFromCart = (id: number) => setCart(prev => {
    const n = (prev[id] || 0) - 1;
    if (n <= 0) { const { [id]: _, ...rest } = prev; return rest; }
    return { ...prev, [id]: n };
  });

  const handleCheckout = async () => {
    if (!address) {
      toast({ title: "Address required", description: "Please enter a delivery address.", variant: "destructive" });
      return;
    }
    if (!payConfig.razorpayEnabled && !payConfig.allowUnpaidPharmacyOrders) {
      toast({
        title: "Payment required",
        description: "Add RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET to backend/.env, or set ALLOW_UNPAID_PHARMACY_ORDERS=true for demo-only checkout.",
        variant: "destructive",
      });
      return;
    }
    setOrderStatus("processing");
    try {
      if (payConfig.razorpayEnabled && payConfig.keyId) {
        await loadRazorpayScript();
        const order = await createRazorpayCartOrder({
          items: cartItems.map((m) => ({ name: m.name, qty: cart[m.id]! })),
          address,
          buyerName: userName,
          buyerRole: "patient",
        });
        setOrderStatus("checkout");
        await new Promise<void>((resolve, reject) => {
          if (!window.Razorpay) {
            reject(new Error("Razorpay failed to load"));
            return;
          }
          const rzp = new window.Razorpay({
            key: order.keyId,
            currency: order.currency,
            order_id: order.orderId,
            name: "MediConnect+",
            description: "Pharmacy delivery",
            config: razorpayPaymentMethodConfig(),
            handler: (response) => {
              void (async () => {
                try {
                  await verifyRazorpayAndCreateOrder({
                    razorpay_order_id: response.razorpay_order_id,
                    razorpay_payment_id: response.razorpay_payment_id,
                    razorpay_signature: response.razorpay_signature,
                    items: cartItems.map((m) => ({ name: m.name, qty: cart[m.id]! })),
                    address,
                    buyerName: userName,
                    buyerRole: "patient",
                  });
                  setOrderStatus("confirmed");
                  toast({
                    title: "Order placed! 🎉",
                    description: `Paid ${formatMoney(order.totalInr, true)} — order confirmed.`,
                  });
                  resolve();
                } catch (err) {
                  reject(err);
                }
              })();
            },
            modal: {
              ondismiss: () => {
                setOrderStatus("checkout");
                reject(new Error("Payment cancelled"));
              },
            },
            prefill: { name: userName, email: email ?? undefined },
            theme: { color: "#0d9488" },
          });
          rzp.open();
        });
        return;
      }

      if (!payConfig.allowUnpaidPharmacyOrders) {
        setOrderStatus("checkout");
        toast({
          title: "Razorpay required",
          description: "Configure Razorpay on the server to pay with UPI or cards, or enable ALLOW_UNPAID_PHARMACY_ORDERS=true for unpaid demo orders.",
          variant: "destructive",
        });
        return;
      }

      await addDeliveryOrder({
        items: cartItems.map((m) => ({ name: m.name, qty: cart[m.id], price: m.price })),
        total: cartTotal,
        buyerName: userName,
        buyerRole: "patient",
        address,
      });
      setOrderStatus("confirmed");
      toast({
        title: "Order placed! 🎉",
        description: `Your order of ${formatMoney(cartTotal, useInr)} has been placed successfully.`,
      });
    } catch (e) {
      setOrderStatus("checkout");
      if (e instanceof Error && e.message === "Payment cancelled") return;
      toast({ title: "Order failed", description: e instanceof Error ? e.message : "Try again", variant: "destructive" });
    }
  };

  const handleCloseOrder = () => {
    setOrderStatus("idle");
    setShowCart(false);
    setCart({});
    setAddress("");
    setPhone("");
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto w-full">
      <Tabs defaultValue="shop">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h2 className="font-heading text-2xl font-bold">{t("pharmacy.title")} 💊</h2>
            <p className="text-muted-foreground">{t("pharmacy.subtitle")}</p>
          </div>
          <div className="flex items-center gap-3">
            <TabsList>
              <TabsTrigger value="shop">{t("pharmacy.shop")}</TabsTrigger>
              <TabsTrigger value="orders">{t("pharmacy.myOrders", { count: myOrders.length })}</TabsTrigger>
            </TabsList>
            {cartCount > 0 && (
              <Button className="gradient-primary text-primary-foreground gap-2" onClick={() => { setShowCart(true); setOrderStatus("cart"); }}>
                <ShoppingCart className="w-4 h-4" /> {t("pharmacy.cart")} ({cartCount}) — {formatMoney(cartTotal, useInr)}
              </Button>
            )}
          </div>
        </div>

        <TabsContent value="shop" className="mt-6 space-y-4">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
            <Input placeholder={t("pharmacy.searchPlaceholder")} className="pl-10" value={search} onChange={e => setSearch(e.target.value)} />
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((m, i) => (
              <motion.div key={m.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                <Card className="shadow-card border-border/50 hover:shadow-elevated transition-all">
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between mb-3">
                      <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                        <Pill className="w-5 h-5 text-primary" />
                      </div>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${m.stock > 0 ? "bg-primary/10 text-primary" : "bg-destructive/10 text-destructive"}`}>
                        {m.stock > 0 ? t("pharmacy.inStock") : t("pharmacy.outOfStock")}
                      </span>
                    </div>
                    <h3 className="font-heading font-semibold text-sm mb-1">{m.name}</h3>
                    <p className="text-xs text-muted-foreground mb-1 line-clamp-2">
                      {m.category}
                      {m.description ? ` · ${m.description}` : ""}
                    </p>
                    {m.requiresPrescription && <span className="text-[10px] px-1.5 py-0.5 rounded bg-accent/10 text-accent font-medium">{t("pharmacy.rxRequired")}</span>}
                    <p className="text-lg font-bold text-primary my-2">{formatMoney(m.price, useInr)}</p>
                    <Button size="sm" variant="outline" className="w-full mb-2 text-xs" onClick={() => setDetailMed(m)}>
                      {t("pharmacy.viewDetails")}
                    </Button>
                    {m.stock > 0 ? (
                      cart[m.id] ? (
                        <div className="flex items-center gap-3">
                          <Button size="sm" variant="outline" onClick={() => removeFromCart(m.id)}><Minus className="w-3 h-3" /></Button>
                          <span className="font-medium text-sm">{cart[m.id]}</span>
                          <Button size="sm" variant="outline" onClick={() => addToCart(m.id)}><Plus className="w-3 h-3" /></Button>
                        </div>
                      ) : (
                        <Button size="sm" className="w-full gradient-primary text-primary-foreground" onClick={() => addToCart(m.id)}>
                          <ShoppingCart className="w-3 h-3 mr-1" /> {t("pharmacy.addToCart")}
                        </Button>
                      )
                    ) : (
                      <Button size="sm" variant="outline" className="w-full" disabled>{t("pharmacy.unavailable")}</Button>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="orders" className="mt-6 space-y-4">
          {myOrders.length === 0 ? (
            <Card className="shadow-card border-border/50"><CardContent className="p-8 text-center text-muted-foreground">{t("pharmacy.noOrders")}</CardContent></Card>
          ) : (
            myOrders.map(o => (
              <Card key={o.id} className="shadow-card border-border/50">
                <CardContent className="p-5">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Package className="w-5 h-5 text-primary" />
                      <span className="font-heading font-semibold">{t("pharmacy.orderNumber", { id: o.id.slice(-5) })}</span>
                    </div>
                    <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                      o.status === "Delivered" ? "bg-primary/10 text-primary" :
                      o.status === "Shipped" ? "bg-accent/10 text-accent" :
                      o.status === "Cancelled" ? "bg-destructive/10 text-destructive" :
                      "bg-muted text-muted-foreground"
                    }`}>{o.status}</span>
                  </div>
                  <div className="space-y-1 text-sm">
                    {o.items.map((it, i) => (
                      <div key={i} className="flex justify-between text-muted-foreground">
                        <span>{it.name} × {it.qty}</span>
                        <span>{formatMoney(it.price * it.qty, useInr)}</span>
                      </div>
                    ))}
                  </div>
                  <div className="flex items-center justify-between mt-3 pt-3 border-t border-border/50">
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{o.date}</span>
                      <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{o.address}</span>
                    </div>
                    <span className="font-bold text-primary">{formatMoney(o.total, useInr)}</span>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>
      </Tabs>

      <MedicineDetailsDialog
        medicine={detailMed}
        onClose={() => setDetailMed(null)}
        formatPrice={(p) => formatMoney(p, useInr)}
      />

      {/* Cart & Checkout Dialog */}
      <Dialog open={showCart} onOpenChange={open => { if (!open && orderStatus !== "processing") { setShowCart(false); if (orderStatus === "confirmed") handleCloseOrder(); } }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-heading">
              {orderStatus === "confirmed" ? `${t("pharmacy.orderConfirmedTitle")} 🎉` : orderStatus === "processing" ? t("pharmacy.processingOrder") : t("pharmacy.yourCartTitle")}
            </DialogTitle>
          </DialogHeader>

          {orderStatus === "confirmed" ? (
            <div className="text-center py-8 space-y-4">
              <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="w-20 h-20 mx-auto rounded-full bg-primary/10 flex items-center justify-center">
                <CheckCircle className="w-10 h-10 text-primary" />
              </motion.div>
              <h3 className="font-heading text-xl font-bold">{t("pharmacy.orderPlacedSuccess")}</h3>
              <p className="text-muted-foreground text-sm">{t("pharmacy.deliveryEta")}</p>
              <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                <Truck className="w-4 h-4" /> {t("pharmacy.deliveringTo", { address })}
              </div>
              <p className="text-lg font-bold text-primary">{formatMoney(cartTotal, useInr)}</p>
              <Button className="gradient-primary text-primary-foreground" onClick={handleCloseOrder}>{t("pharmacy.done")}</Button>
            </div>
          ) : orderStatus === "processing" ? (
            <div className="text-center py-12 space-y-4">
              <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }} className="w-12 h-12 mx-auto border-4 border-primary/20 border-t-primary rounded-full" />
              <p className="text-muted-foreground">{t("pharmacy.processingOrder")}</p>
            </div>
          ) : (
            <>
              <div className="space-y-3 max-h-48 overflow-y-auto">
                {cartItems.map(m => (
                  <div key={m.id} className="flex items-center gap-3 p-3 rounded-xl bg-secondary/50">
                    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center"><Pill className="w-4 h-4 text-primary" /></div>
                    <div className="flex-1">
                      <p className="text-sm font-medium">{m.name}</p>
                      <p className="text-xs text-muted-foreground">{formatMoney(m.price, useInr)} × {cart[m.id]}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => removeFromCart(m.id)}><Minus className="w-3 h-3" /></Button>
                      <span className="text-sm font-medium w-4 text-center">{cart[m.id]}</span>
                      <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => addToCart(m.id)}><Plus className="w-3 h-3" /></Button>
                    </div>
                    <p className="text-sm font-bold">{formatMoney(m.price * cart[m.id], useInr)}</p>
                  </div>
                ))}
              </div>
              <div className="space-y-3 pt-3 border-t border-border">
                <div><Label>{t("pharmacy.deliveryAddress")} *</Label><Input value={address} onChange={e => setAddress(e.target.value)} placeholder={t("pharmacy.addressPlaceholder")} /></div>
                <div><Label>{t("pharmacy.phone")}</Label><Input value={phone} onChange={e => setPhone(e.target.value)} placeholder={t("pharmacy.phonePlaceholder")} /></div>
              </div>
              <div className="border-t border-border pt-4 space-y-2">
                <div className="flex justify-between text-sm"><span className="text-muted-foreground">{t("pharmacy.subtotal")}</span><span>{formatMoney(cartTotal, useInr)}</span></div>
                <div className="flex justify-between text-sm"><span className="text-muted-foreground">{t("pharmacy.delivery")}</span><span className="text-primary">{t("pharmacy.free")}</span></div>
                <div className="flex justify-between font-bold text-lg"><span>{t("pharmacy.total")}</span><span className="text-primary">{formatMoney(cartTotal, useInr)}</span></div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowCart(false)}>{t("pharmacy.continueShopping")}</Button>
                <div className="space-y-2 w-full sm:w-auto sm:ml-auto">
                  {!payConfig.razorpayEnabled && (
                    <p className="text-[11px] text-muted-foreground text-right max-w-xs sm:max-w-sm">
                      {t("pharmacy.razorpayHint")}
                    </p>
                  )}
                  <Button className="gradient-primary text-primary-foreground gap-2 w-full sm:w-auto" onClick={handleCheckout}>
                    <CreditCard className="w-4 h-4" /> {payConfig.razorpayEnabled ? t("pharmacy.payWithRzp") : t("pharmacy.placeOrderDemo")}
                  </Button>
                </div>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Pharmacy;
