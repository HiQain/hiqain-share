import { Check, Zap, Globe, FileText, Database, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useGetStats } from "@workspace/api-client-react";

export function Upgrade() {
  const { data: stats } = useGetStats({ query: { refetchInterval: 30000 } });

  const plans = [
    {
      name: "Free",
      price: "$0",
      description: "Perfect for quick, everyday sharing.",
      features: [
        "Shared local network board",
        "Up to 10MB per file",
        "30-minute retention",
        "Basic activity feed"
      ],
      buttonText: "Current Plan",
      buttonVariant: "outline" as const,
      highlight: false
    },
    {
      name: "Pro",
      price: "$4",
      period: "/month",
      description: "For power users who need more capacity.",
      features: [
        "Everything in Free",
        "Up to 100MB per file",
        "24-hour retention",
        "Saved board history",
        "Custom device names"
      ],
      buttonText: "Upgrade to Pro",
      buttonVariant: "default" as const,
      highlight: true
    },
    {
      name: "Team",
      price: "$12",
      period: "/month",
      description: "Secure sharing for offices and teams.",
      features: [
        "Everything in Pro",
        "Unlimited file sizes",
        "Password-protected rooms",
        "Audit logs & admin controls",
        "Custom domains"
      ],
      buttonText: "Contact Sales",
      buttonVariant: "outline" as const,
      highlight: false
    }
  ];

  return (
    <div className="py-16 md:py-24 animate-in fade-in duration-500">
      <div className="container mx-auto px-4 max-w-6xl">
        <div className="text-center mb-16">
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-4">Simple pricing, powerful sharing</h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            QuickShare is free forever for basic network sharing. Upgrade for larger files, longer retention, and advanced controls.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {plans.map((plan) => (
            <Card key={plan.name} className={`relative flex flex-col transition-all duration-300 hover:-translate-y-1 ${plan.highlight ? 'border-primary shadow-lg scale-105 z-10' : 'border-border hover:shadow-md'}`}>
              {plan.highlight && (
                <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-primary text-primary-foreground px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider flex items-center gap-1">
                  <Zap className="h-3 w-3" /> Most Popular
                </div>
              )}
              <CardHeader>
                <CardTitle className="text-2xl">{plan.name}</CardTitle>
                <CardDescription className="h-10">{plan.description}</CardDescription>
              </CardHeader>
              <CardContent className="flex-1">
                <div className="mb-6 flex items-baseline">
                  <span className="text-4xl font-bold">{plan.price}</span>
                  {plan.period && <span className="text-muted-foreground ml-1">{plan.period}</span>}
                </div>
                <ul className="space-y-3">
                  {plan.features.map((feature, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <Check className="h-5 w-5 text-primary shrink-0" />
                      <span className="text-sm text-foreground/80">{feature}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
              <CardFooter>
                <Button className="w-full" variant={plan.buttonVariant}>
                  {plan.buttonText}
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>

        {/* Global Stats Section */}
        <div className="mt-24 bg-card rounded-2xl border border-border p-8 shadow-sm">
          <div className="text-center mb-8">
             <h2 className="text-2xl font-bold">Trusted by networks everywhere</h2>
             <p className="text-muted-foreground">Live global stats across all QuickShare instances</p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            <div className="flex flex-col items-center text-center">
              <div className="h-12 w-12 bg-primary/10 rounded-full flex items-center justify-center mb-4">
                <FileText className="h-6 w-6 text-primary" />
              </div>
              <div className="text-4xl font-bold text-foreground mb-1">{stats?.totalFiles.toLocaleString() || "..."}</div>
              <div className="text-sm text-muted-foreground">Files Shared</div>
            </div>
            <div className="flex flex-col items-center text-center">
              <div className="h-12 w-12 bg-primary/10 rounded-full flex items-center justify-center mb-4">
                <Globe className="h-6 w-6 text-primary" />
              </div>
              <div className="text-4xl font-bold text-foreground mb-1">{stats?.activeDevices.toLocaleString() || "..."}</div>
              <div className="text-sm text-muted-foreground">Active Devices</div>
            </div>
            <div className="flex flex-col items-center text-center">
              <div className="h-12 w-12 bg-primary/10 rounded-full flex items-center justify-center mb-4">
                <Database className="h-6 w-6 text-primary" />
              </div>
              <div className="text-4xl font-bold text-foreground mb-1">
                {stats ? `${(stats.totalBytes / 1024 / 1024 / 1024).toFixed(1)} GB` : "..."}
              </div>
              <div className="text-sm text-muted-foreground">Data Transferred</div>
            </div>
            <div className="flex flex-col items-center text-center">
              <div className="h-12 w-12 bg-primary/10 rounded-full flex items-center justify-center mb-4">
                <Shield className="h-6 w-6 text-primary" />
              </div>
              <div className="text-4xl font-bold text-foreground mb-1">100%</div>
              <div className="text-sm text-muted-foreground">Local Network</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
