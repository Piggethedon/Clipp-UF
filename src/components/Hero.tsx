import { Button } from "@/components/ui/button";
import { useLanguage } from "@/hooks/useLanguage";
import clippLogo from "@/assets/clipp-logo.png";
import { Download, Play } from "lucide-react";

export default function Hero() {
  const { t } = useLanguage();

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-background via-primary/5 to-primary/10" />
      
      {/* Animated background elements */}
      <div className="absolute inset-0">
        <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-primary/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-primary-glow/10 rounded-full blur-3xl animate-pulse delay-1000" />
      </div>

      <div className="container relative z-10 text-center px-4 animate-fade-in-up">
        {/* Logo */}
        <div className="mb-8 animate-bounce-in">
          <img 
            src={clippLogo} 
            alt="Clipp Logo" 
            className="w-24 h-24 mx-auto mb-4 drop-shadow-lg"
          />
          <div className="inline-flex items-baseline gap-2">
            <h1 className="text-5xl md:text-7xl font-bold text-foreground">
              {t('hero.title')}
            </h1>
            <span className="text-5xl md:text-7xl font-bold bg-gradient-primary bg-clip-text text-transparent">
              {t('hero.subtitle')}
            </span>
          </div>
        </div>

        {/* Description */}
        <p className="text-xl md:text-2xl text-muted-foreground max-w-3xl mx-auto mb-12 leading-relaxed">
          {t('hero.description')}
        </p>

        {/* CTA buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
          <Button 
            size="lg" 
            className="btn-hero group transition-all duration-300 min-w-[200px]"
          >
            <Download className="w-5 h-5 mr-2 group-hover:animate-bounce" />
            {t('hero.cta')}
          </Button>
          
          <Button 
            variant="outline" 
            size="lg"
            className="btn-ghost min-w-[200px]"
          >
            <Play className="w-5 h-5 mr-2" />
            {t('hero.secondary_cta')}
          </Button>
        </div>

        {/* Stats */}
        <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-8 max-w-2xl mx-auto">
          {[
            { value: "5+", label: "Svenska butiker" },
            { value: "1000+", label: "Rabattkoder" },
            { value: "20%", label: "Genomsnittlig besparing" }
          ].map((stat, index) => (
            <div 
              key={index} 
              className="text-center animate-fade-in-up"
              style={{ animationDelay: `${0.6 + index * 0.2}s` }}
            >
              <div className="text-3xl font-bold text-primary">{stat.value}</div>
              <div className="text-sm text-muted-foreground">{stat.label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}