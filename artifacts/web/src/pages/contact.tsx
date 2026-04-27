import { useState, type FormEvent } from "react";
import { Link } from "wouter";
import { ArrowLeft, MessageSquare, PhoneCall } from "lucide-react";
import { SiteFooter } from "@/components/SiteFooter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type FormState = {
  name: string;
  email: string;
  subject: string;
  message: string;
};

const INITIAL_FORM: FormState = {
  name: "",
  email: "",
  subject: "",
  message: "",
};

export default function ContactPage() {
  const [form, setForm] = useState<FormState>(INITIAL_FORM);
  const [submitted, setSubmitted] = useState(false);

  function updateField<K extends keyof FormState>(field: K, value: FormState[K]) {
    setForm((current) => ({ ...current, [field]: value }));
    setSubmitted(false);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitted(true);
    setForm(INITIAL_FORM);
  }

  return (
    <div className="min-h-screen w-full bg-background text-foreground flex flex-col">
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 h-16 flex items-center gap-3 max-w-6xl">
          <div className="bg-primary/10 p-2 rounded-lg">
            <PhoneCall className="h-5 w-5 text-primary" />
          </div>
          <h1 className="text-xl font-bold tracking-tight">Contact Us</h1>
          <div className="ml-auto">
            <Link href="/">
              <Button variant="outline" size="sm">
                <ArrowLeft className="mr-1.5 h-4 w-4" />
                Back to Home
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="container mx-auto flex-1 max-w-3xl px-4 py-8">
        <div className="grid gap-6">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5 text-primary" />
                <CardTitle>Contact form</CardTitle>
              </div>
              <CardDescription>Fill out the form below and submit your message.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {submitted ? (
                <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
                  Thanks for reaching out. Your message has been captured on this page and is ready
                  for backend integration whenever you want to connect it to email or an API.
                </div>
              ) : null}

              <form className="space-y-4" onSubmit={handleSubmit}>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="name">Full name</Label>
                    <Input
                      id="name"
                      value={form.name}
                      onChange={(event) => updateField("name", event.target.value)}
                      placeholder="Enter your name"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email address</Label>
                    <Input
                      id="email"
                      type="email"
                      value={form.email}
                      onChange={(event) => updateField("email", event.target.value)}
                      placeholder="name@example.com"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="subject">Subject</Label>
                  <Input
                    id="subject"
                    value={form.subject}
                    onChange={(event) => updateField("subject", event.target.value)}
                    placeholder="What do you need help with?"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="message">Message</Label>
                  <Textarea
                    id="message"
                    value={form.message}
                    onChange={(event) => updateField("message", event.target.value)}
                    placeholder="Write your message here"
                    className="min-h-36"
                    required
                  />
                </div>

                <Button type="submit" className="w-full sm:w-auto">
                  Send message
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
