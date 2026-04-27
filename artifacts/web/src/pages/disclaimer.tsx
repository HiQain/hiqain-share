import { Link } from "wouter";
import { AlertTriangle, ArrowLeft, PhoneCall } from "lucide-react";
import { SiteFooter } from "@/components/SiteFooter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const SECTIONS = [
  {
    title: "General Information",
    body:
      "The information and tools provided on Hiqain (hiqain.com) are for general informational and utility purposes only. We make no warranty of any kind, express or implied, about the completeness, accuracy, reliability, or suitability of the services provided.",
  },
  {
    title: "Tool Accuracy",
    body:
      "While we strive to ensure our image compression tools produce accurate results, output file sizes may vary slightly based on image content, format, and compression settings. We recommend verifying the final file size before submission to government portals or official forms.",
  },
  {
    title: "File Privacy",
    body:
      "Files uploaded to Hiqain are processed on our servers and immediately deleted after the compression is complete. We do not store, share, or sell your uploaded images. However, you are responsible for the content of files you upload.",
  },
  {
    title: "Third-Party Links",
    body:
      "Our website may contain links to third-party websites, including government portals and external resources. These links are provided for convenience only. We have no control over the content or privacy practices of those websites and accept no responsibility for them.",
  },
  {
    title: "Limitation of Liability",
    body:
      "Hiqain shall not be liable for any direct, indirect, incidental, or consequential damages arising from the use or inability to use our services. Use of our tools is entirely at your own risk.",
  },
  {
    title: "Changes to This Disclaimer",
    body:
      "We reserve the right to modify this disclaimer at any time. Changes will be posted on this page with an updated date. Continued use of our website constitutes acceptance of any revised disclaimer.",
  },
];

export default function DisclaimerPage() {
  return (
    <div className="min-h-screen w-full bg-background text-foreground flex flex-col">
      <header className="border-b bg-card">
        <div className="container mx-auto flex max-w-6xl flex-col gap-4 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-center gap-3">
            <div className="shrink-0 rounded-lg bg-primary/10 p-2">
              <PhoneCall className="h-5 w-5 text-primary" />
            </div>
            <h1 className="text-lg font-bold tracking-tight sm:text-xl">Disclaimer</h1>
          </div>
          <div>
            <Link href="/">
              <Button variant="outline" size="sm" className="w-full sm:w-auto">
                <ArrowLeft className="mr-1.5 h-4 w-4" />
                Back to Home
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="container mx-auto flex-1 max-w-4xl space-y-6 px-4 py-6 sm:py-8">
        <Card>
          <CardHeader className="space-y-3">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-primary" />
              <CardTitle>Disclaimer</CardTitle>
            </div>
            <p className="text-sm text-muted-foreground">Last updated: February 2026</p>
          </CardHeader>
          <CardContent className="space-y-6">
            {SECTIONS.map((section) => (
              <section key={section.title} className="space-y-2">
                <h2 className="text-base font-semibold">{section.title}</h2>
                <p className="text-sm leading-6 text-muted-foreground">{section.body}</p>
              </section>
            ))}

            <section className="space-y-2">
              <h2 className="text-base font-semibold">Contact Us</h2>
              <p className="text-sm leading-6 text-muted-foreground">
                If you have any questions about this disclaimer, please visit our{" "}
                <Link href="/contact" className="text-primary underline-offset-4 hover:underline">
                  Contact Us
                </Link>{" "}
                page.
              </p>
            </section>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
