import { Globe } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const LANGS = ["en", "hi"] as const;

export function LanguageSwitcher({ className }: { className?: string }) {
  const { i18n, t } = useTranslation();
  const code = LANGS.includes(i18n.language as (typeof LANGS)[number]) ? i18n.language : "en";

  return (
    <div className={`flex items-center gap-2 ${className ?? ""}`}>
      <Globe className="w-4 h-4 text-muted-foreground shrink-0" aria-hidden />
      <Select value={code} onValueChange={(v) => void i18n.changeLanguage(v)}>
        <SelectTrigger className="h-9 w-[min(100%,9rem)] text-xs border-border/80 bg-background/80">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {LANGS.map((lng) => (
            <SelectItem key={lng} value={lng}>
              {t(`languages.${lng}`)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
