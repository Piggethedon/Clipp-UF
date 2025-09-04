import { useLanguage } from "@/hooks/useLanguage";
import { Card, CardContent } from "@/components/ui/card";
import { Zap, Shield, Heart } from "lucide-react";

export default function Features() {
  const { t } = useLanguage();

  const features = [
    {
      icon: Zap,
      title: t('features.auto_scan.title'),
      description: t('features.auto_scan.description'),
      color: "text-primary"
    },
    {
      icon: Shield,
      title: t('features.swedish_stores.title'),
      description: t('features.swedish_stores.description'),
      color: "text-success"
    },
    {
      icon: Heart,
      title: t('features.easy_use.title'),
      description: t('features.easy_use.description'),
      color: "text-warning"
    }
  ];

  return (
    <section className="py-20 px-4">
      <div className="container">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold mb-4 animate-fade-in-up">
            {t('features.title')}
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <Card 
              key={index}
              className="card-premium group cursor-pointer animate-fade-in-up"
              style={{ animationDelay: `${index * 0.2}s` }}
            >
              <CardContent className="p-8 text-center">
                <div className={`w-16 h-16 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-primary/10 to-primary/20 flex items-center justify-center group-hover:scale-110 transition-transform duration-300`}>
                  <feature.icon className={`w-8 h-8 ${feature.color}`} />
                </div>
                
                <h3 className="text-xl font-semibold mb-3 text-foreground">
                  {feature.title}
                </h3>
                
                <p className="text-muted-foreground leading-relaxed">
                  {feature.description}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}