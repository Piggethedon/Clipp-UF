import { Button } from "@/components/ui/button";
import LanguageSwitcher from "./LanguageSwitcher";
import { useLanguage } from "@/hooks/useLanguage";
import clippLogo from "@/assets/clipp-logo.png";
import { Download } from "lucide-react";

export default function Header() {
  const { t } = useLanguage();

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b border-border/50">
      <div className="container flex items-center justify-between py-4 px-4">
        {/* Logo */}
        <div className="flex items-center gap-3">
          <img 
            src={clippLogo} 
            alt="Clipp Logo" 
            className="w-8 h-8"
          />
          <span className="text-xl font-bold bg-gradient-primary bg-clip-text text-transparent">
            Clipp
          </span>
        </div>

        {/* Navigation */}
        <nav className="hidden md:flex items-center gap-8">
          <a href="#features" className="text-muted-foreground hover:text-foreground transition-colors">
            Funktioner
          </a>
          <a href="#stores" className="text-muted-foreground hover:text-foreground transition-colors">
            Butiker
          </a>
          <a href="#demo" className="text-muted-foreground hover:text-foreground transition-colors">
            Demo
          </a>
        </nav>

        {/* Right side */}
        <div className="flex items-center gap-4">
          <LanguageSwitcher />
          <Button size="sm" className="btn-hero">
            <Download className="w-4 h-4 mr-2" />
            {t('hero.cta')}
          </Button>
        </div>
      </div>
    </header>
  );
}