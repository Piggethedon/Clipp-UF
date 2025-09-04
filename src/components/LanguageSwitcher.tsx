import { useLanguage } from "@/hooks/useLanguage";
import { Button } from "@/components/ui/button";
import { Globe } from "lucide-react";

export default function LanguageSwitcher() {
  const { currentLanguage, changeLanguage, languages } = useLanguage();

  return (
    <div className="flex items-center gap-2">
      <Globe className="w-4 h-4 text-muted-foreground" />
      <div className="flex rounded-lg border overflow-hidden">
        {languages.map((lang) => (
          <Button
            key={lang}
            variant={currentLanguage === lang ? "default" : "ghost"}
            size="sm"
            className={`rounded-none px-3 py-1 text-xs font-medium transition-all duration-200 ${
              currentLanguage === lang
                ? 'bg-primary text-primary-foreground'
                : 'bg-transparent hover:bg-muted'
            }`}
            onClick={() => changeLanguage(lang)}
          >
            {lang.toUpperCase()}
          </Button>
        ))}
      </div>
    </div>
  );
}