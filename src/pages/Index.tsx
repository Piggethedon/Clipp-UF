import Header from "@/components/Header";
import Hero from "@/components/Hero";
import Features from "@/components/Features";
import Stores from "@/components/Stores";
import Demo from "@/components/Demo";
import { useLanguage } from "@/hooks/useLanguage";

const Index = () => {
  const { t } = useLanguage();

  return (
    <div className="min-h-screen">
      <Header />
      
      <main>
        <Hero />
        
        <section id="features">
          <Features />
        </section>
        
        <section id="stores">
          <Stores />
        </section>
        
        <section id="demo">
          <Demo />
        </section>
      </main>

      <footer className="bg-muted/50 border-t border-border/50 py-12">
        <div className="container px-4">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            {/* Footer logo */}
            <div className="flex items-center gap-3">
              <img 
                src="/src/assets/clipp-logo.png" 
                alt="Clipp Logo" 
                className="w-6 h-6"
              />
              <span className="font-semibold text-foreground">
                Clipp
              </span>
            </div>

            {/* Footer links */}
            <div className="flex items-center gap-6 text-sm text-muted-foreground">
              <a href="#privacy" className="hover:text-foreground transition-colors">
                {t('footer.privacy')}
              </a>
              <a href="#terms" className="hover:text-foreground transition-colors">
                {t('footer.terms')}
              </a>
              <a href="#support" className="hover:text-foreground transition-colors">
                {t('footer.support')}
              </a>
            </div>

            {/* Copyright */}
            <div className="text-sm text-muted-foreground">
              © 2024 Clipp. Alla rättigheter förbehållna.
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
