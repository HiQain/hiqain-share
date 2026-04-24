export function TermsOfService() {
  return (
    <div className="py-16 md:py-24">
      <div className="container mx-auto px-4 max-w-4xl">
        <div className="mb-12">
          <h1 className="text-4xl font-bold tracking-tight mb-4">Terms of Service</h1>
          <p className="text-lg text-muted-foreground">
            This is mock terms content for demonstration purposes only.
          </p>
        </div>

        <div className="space-y-8 rounded-2xl border border-border bg-card p-6 md:p-8 shadow-sm">
          <section className="space-y-3">
            <h2 className="text-2xl font-semibold">1. Acceptance of Terms</h2>
            <p className="text-muted-foreground">
              By using QR Code Generator, users agree to these sample terms, our related policies, and
              any future updates. This text is placeholder copy and should be replaced with final legal
              language before launch.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-2xl font-semibold">2. Permitted Use</h2>
            <p className="text-muted-foreground">
              Users may access the service for lawful business and personal use. They may not misuse
              the platform, interfere with operations, attempt unauthorized access, or upload harmful
              content. These examples are illustrative only.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-2xl font-semibold">3. Service Availability</h2>
            <p className="text-muted-foreground">
              We may modify, suspend, or discontinue parts of the service at any time. We aim to keep
              the platform available and reliable, but uninterrupted access is not guaranteed in this
              draft version.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-2xl font-semibold">4. Limitation of Liability</h2>
            <p className="text-muted-foreground">
              To the maximum extent permitted by law, the company is not liable for indirect,
              incidental, or consequential damages arising from use of the service. Replace this
              placeholder with reviewed legal text before publishing.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
