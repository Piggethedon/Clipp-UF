import { useState } from "react";
import { useLanguage } from "@/hooks/useLanguage";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MousePointer, CheckCircle, Gift } from "lucide-react";

export default function Demo() {
  const { t } = useLanguage();
  const [currentStep, setCurrentStep] = useState(1);

  const steps = [
    {
      icon: MousePointer,
      title: t('demo.step1'),
      description: "Besök en av våra stödda butiker som Zalando eller CDON"
    },
    {
      icon: Gift,
      title: t('demo.step2'),
      description: "Clipp söker automatiskt efter de bästa rabattkoderna"
    },
    {
      icon: CheckCircle,
      title: t('demo.step3'),
      description: "Få rabattkoden applicerad och spara pengar direkt"
    }
  ];

  return (
    <section className="py-20 px-4">
      <div className="container">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold mb-4 animate-fade-in-up">
            {t('demo.title')}
          </h2>
        </div>

        {/* Step indicator */}
        <div className="flex justify-center mb-12">
          <div className="flex items-center gap-4">
            {steps.map((_, index) => (
              <div key={index} className="flex items-center">
                <button
                  onClick={() => setCurrentStep(index + 1)}
                  className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold transition-all duration-300 ${
                    currentStep >= index + 1
                      ? 'bg-primary text-primary-foreground shadow-glow'
                      : 'bg-muted text-muted-foreground hover:bg-primary/20'
                  }`}
                >
                  {index + 1}
                </button>
                {index < steps.length - 1 && (
                  <div className={`w-16 h-1 mx-2 rounded-full transition-all duration-500 ${
                    currentStep > index + 1 ? 'bg-primary' : 'bg-muted'
                  }`} />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Demo content */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center max-w-6xl mx-auto">
          {/* Steps */}
          <div className="space-y-6">
            {steps.map((step, index) => (
              <Card
                key={index}
                className={`cursor-pointer transition-all duration-300 ${
                  currentStep === index + 1
                    ? 'card-glow scale-105'
                    : 'card-premium hover:scale-[1.02]'
                }`}
                onClick={() => setCurrentStep(index + 1)}
              >
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all duration-300 ${
                      currentStep === index + 1
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted text-muted-foreground'
                    }`}>
                      <step.icon className="w-6 h-6" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold mb-2">{step.title}</h3>
                      <p className="text-muted-foreground">{step.description}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Mock extension popup */}
          <div className="relative">
            <div className="relative">
              {/* Browser mockup */}
              <div className="bg-muted rounded-t-2xl p-4 border">
                <div className="flex items-center gap-2 mb-4">
                  <div className="flex gap-2">
                    <div className="w-3 h-3 bg-destructive rounded-full"></div>
                    <div className="w-3 h-3 bg-warning rounded-full"></div>
                    <div className="w-3 h-3 bg-success rounded-full"></div>
                  </div>
                  <div className="flex-1 bg-background rounded-lg px-4 py-2 text-sm text-muted-foreground">
                    zalando.se/herr/skor
                  </div>
                </div>
              </div>

              {/* Website content mockup */}
              <div className="bg-background rounded-b-2xl p-8 border border-t-0 min-h-[300px]">
                <div className="space-y-4">
                  <div className="h-4 bg-muted rounded w-3/4"></div>
                  <div className="h-4 bg-muted rounded w-1/2"></div>
                  <div className="grid grid-cols-2 gap-4 mt-8">
                    <div className="h-32 bg-muted rounded-xl"></div>
                    <div className="h-32 bg-muted rounded-xl"></div>
                  </div>
                </div>
              </div>

              {/* Extension popup */}
              <div className={`absolute top-20 right-4 transition-all duration-500 ${
                currentStep >= 2 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
              }`}>
                <Card className="card-glow w-80 shadow-large">
                  <CardContent className="p-6">
                    <div className="flex items-center gap-3 mb-4">
                      <img 
                        src="/src/assets/clipp-logo.png" 
                        alt="Clipp" 
                        className="w-8 h-8"
                      />
                      <div>
                        <h4 className="font-semibold">{t('demo.popup_title')}</h4>
                        <Badge variant="secondary" className="bg-success/10 text-success">
                          Ny kod hittad
                        </Badge>
                      </div>
                    </div>
                    
                    <div className="bg-accent/50 rounded-xl p-4 mb-4">
                      <p className="text-sm font-medium">{t('demo.popup_code')}</p>
                    </div>
                    
                    <Button className="btn-hero w-full">
                      {t('demo.popup_button')}
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}