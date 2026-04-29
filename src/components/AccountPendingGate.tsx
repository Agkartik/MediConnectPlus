import { useState, type ReactNode } from "react";
import { Shield } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";

export default function AccountPendingGate({ children }: { children: ReactNode }) {
  const { role, approved, logout, refreshSession } = useAuth();
  const [checking, setChecking] = useState(false);

  if (role !== "doctor" || approved) return <>{children}</>;

  const onRecheck = async () => {
    setChecking(true);
    try {
      await refreshSession();
    } finally {
      setChecking(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-12rem)] px-4">
      <Card className="w-full max-w-md shadow-card border-border/50">
        <CardHeader>
          <CardTitle className="font-heading flex items-center gap-2 text-lg">
            <Shield className="w-5 h-5 text-primary" />
            Awaiting admin verification
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm text-muted-foreground">
          <p>
            Your doctor profile is registered. An administrator must approve it before you can use appointments, messages, pharmacy checkout, and video calls.
          </p>
          <p>You will see the full doctor dashboard as soon as an admin approves your account.</p>
          <div className="flex flex-col sm:flex-row gap-2 pt-2">
            <Button className="gradient-primary text-primary-foreground" disabled={checking} onClick={onRecheck}>
              {checking ? "Checking…" : "I’ve been approved — refresh"}
            </Button>
            <Button variant="outline" onClick={() => logout()}>
              Sign out
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
