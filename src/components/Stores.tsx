import { useLanguage } from "@/hooks/useLanguage";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import storeData from "@/data/stores.json";

export default function Stores() {
  const { t } = useLanguage();

  return (
    <section className="py-20 px-4 bg-gradient-to-br from-secondary/50 to-accent/50">
      <div className="container">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold mb-4 animate-fade-in-up">
            {t('stores.title')}
          </h2>
          <p className="text-xl text-muted-foreground animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
            {t('stores.subtitle')}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {storeData.stores.map((store, index) => (
            <Card 
              key={store.id}
              className="card-glow group cursor-pointer animate-fade-in-up hover:scale-[1.02]"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <CardContent className="p-6">
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-16 h-16 rounded-2xl overflow-hidden shadow-soft">
                    <img 
                      src={store.logo} 
                      alt={`${store.name} logo`}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-foreground">
                      {store.name}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {store.domain}
                    </p>
                  </div>
                </div>
                
                <p className="text-muted-foreground mb-4">
                  {store.description}
                </p>
                
                <div className="flex items-center justify-between">
                  <Badge 
                    variant="secondary"
                    className="bg-primary/10 text-primary border-primary/20"
                  >
                    {store.category}
                  </Badge>
                  
                  {store.active && (
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-success rounded-full animate-pulse" />
                      <span className="text-sm text-success font-medium">Aktiv</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Add more stores teaser */}
        <div className="text-center mt-12">
          <Card className="card-premium max-w-md mx-auto">
            <CardContent className="p-8">
              <div className="text-4xl mb-4">➕</div>
              <h3 className="text-lg font-semibold mb-2">Fler butiker kommer</h3>
              <p className="text-sm text-muted-foreground">
                Vi lägger till nya svenska butiker regelbundet
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  );
}