import { Pill } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { PharmacyMedicine } from "@/types/store";

function Section({ title, body }: { title: string; body: string }) {
  if (!body?.trim()) return null;
  return (
    <div className="space-y-1">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{title}</p>
      <p className="text-sm text-foreground whitespace-pre-wrap">{body.trim()}</p>
    </div>
  );
}

export function MedicineDetailsDialog({
  medicine,
  onClose,
  formatPrice,
}: {
  medicine: PharmacyMedicine | null;
  onClose: () => void;
  formatPrice: (price: number) => string;
}) {
  const { t } = useTranslation();

  return (
    <Dialog open={!!medicine} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-heading flex items-start gap-3 pr-8">
            <span className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
              <Pill className="w-5 h-5 text-primary" />
            </span>
            <span className="text-left">
              {medicine?.name}
              {medicine && (
                <span className="block text-sm font-normal text-muted-foreground mt-1">
                  {medicine.category}
                  {medicine.requiresPrescription ? t("medicineDetails.rxSuffix") : ""}
                </span>
              )}
            </span>
          </DialogTitle>
        </DialogHeader>
        {medicine && (
          <div className="space-y-4 pt-1">
            <p className="text-lg font-bold text-primary">{formatPrice(medicine.price)}</p>
            <Section title={t("medicineDetails.summary")} body={medicine.description} />
            <Section title={t("medicineDetails.uses")} body={medicine.usage} />
            <Section title={t("medicineDetails.sideEffects")} body={medicine.sideEffects} />
            <Section title={t("medicineDetails.warnings")} body={medicine.warnings} />
            {!medicine.description?.trim() &&
              !medicine.usage?.trim() &&
              !medicine.sideEffects?.trim() &&
              !medicine.warnings?.trim() && (
                <p className="text-sm text-muted-foreground">{t("medicineDetails.empty")}</p>
              )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
