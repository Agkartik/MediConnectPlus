/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

interface RazorpaySuccessResponse {
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
}

interface RazorpayConstructorOptions {
  key: string;
  currency: string;
  order_id: string;
  name: string;
  description: string;
  handler: (response: RazorpaySuccessResponse) => void;
  modal?: { ondismiss?: () => void };
  prefill?: { name?: string; email?: string; contact?: string };
  theme?: { color?: string };
  config?: Record<string, unknown>;
}

declare global {
  interface Window {
    Razorpay?: new (options: RazorpayConstructorOptions) => { open: () => void };
  }
}

export {};
