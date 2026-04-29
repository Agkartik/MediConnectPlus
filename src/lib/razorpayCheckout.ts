/** Loads Razorpay Checkout script once */
export function loadRazorpayScript(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if (window.Razorpay) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = "https://checkout.razorpay.com/v1/checkout.js";
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("Failed to load Razorpay script"));
    document.body.appendChild(s);
  });
}

/**
 * Standard Checkout layout: UPI, cards, wallets, net banking (order matches Razorpay docs).
 * Requires live Key ID + INR order; methods also depend on what is enabled on your Razorpay account.
 */
export function razorpayPaymentMethodConfig() {
  return {
    display: {
      blocks: {
        mediconnect: {
          name: "UPI, cards, wallets & net banking",
          instruments: [
            { method: "upi" as const },
            { method: "card" as const },
            { method: "wallet" as const },
            { method: "netbanking" as const },
          ],
        },
      },
      sequence: ["block.mediconnect"],
      preferences: { show_default_blocks: false },
    },
  };
}
