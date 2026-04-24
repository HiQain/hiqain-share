import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { Wifi, Zap, Clock, ShieldCheck } from "lucide-react";

export function HowItWorks() {
  return (
    <div className="py-16 md:py-24">
      <div className="container mx-auto px-4 max-w-4xl">
        <div className="text-center mb-16">
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-4">Sharing made frictionless</h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            No accounts. No cables. No emailing yourself. QuickShare connects devices instantly on the same network.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-12 mb-20">
          <div className="space-y-8">
            <div className="flex gap-4">
              <div className="bg-primary/10 p-3 rounded-xl h-12 w-12 flex items-center justify-center shrink-0">
                <Wifi className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h3 className="text-xl font-semibold mb-2">Same Wi-Fi, same board</h3>
                <p className="text-muted-foreground">
                  Just open QuickShare on your phone and your laptop while connected to the same network. You'll instantly land on the same shared board.
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="bg-primary/10 p-3 rounded-xl h-12 w-12 flex items-center justify-center shrink-0">
                <Zap className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h3 className="text-xl font-semibold mb-2">Instant transfer</h3>
                <p className="text-muted-foreground">
                  Drop a file, paste a link, or type a snippet. It appears instantly on all other connected devices.
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="bg-primary/10 p-3 rounded-xl h-12 w-12 flex items-center justify-center shrink-0">
                <Clock className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h3 className="text-xl font-semibold mb-2">Auto-expiring</h3>
                <p className="text-muted-foreground">
                  We don't keep your data forever. Everything you share is automatically wiped from the board after 30 minutes.
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="bg-primary/10 p-3 rounded-xl h-12 w-12 flex items-center justify-center shrink-0">
                <ShieldCheck className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h3 className="text-xl font-semibold mb-2">Secure & Private</h3>
                <p className="text-muted-foreground">
                  Files are only accessible to devices on your local network. No public links, no cloud storage bloat.
                </p>
              </div>
            </div>
          </div>

          <div className="bg-muted/30 rounded-2xl p-8 border border-border flex items-center justify-center">
            <div className="bg-card shadow-lg rounded-xl p-6 w-full max-w-sm transform rotate-2">
              <div className="flex items-center justify-between border-b pb-4 mb-4">
                <div className="h-3 w-1/3 bg-muted rounded-full"></div>
                <div className="h-3 w-8 bg-primary/20 rounded-full"></div>
              </div>
              <div className="h-24 bg-muted/50 rounded-lg mb-4 border-2 border-dashed border-muted flex items-center justify-center">
                <div className="h-4 w-12 bg-muted rounded-sm"></div>
              </div>
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 bg-primary/20 rounded-md"></div>
                <div className="h-3 w-1/2 bg-muted rounded-full"></div>
              </div>
            </div>
          </div>
        </div>

        <div className="text-center bg-primary text-primary-foreground rounded-2xl p-12">
          <h2 className="text-3xl font-bold mb-4">Ready to clear your tab clutter?</h2>
          <p className="mb-8 text-primary-foreground/80 max-w-lg mx-auto">
            Stop emailing yourself links and photos. Try QuickShare right now.
          </p>
          <Link href="/">
            <Button size="lg" variant="secondary" className="rounded-full font-semibold">
              Open Board
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
