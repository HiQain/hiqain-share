import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { useToast } from "@/hooks/use-toast";
import { useLocation, Link } from "wouter";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Zap } from "lucide-react";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1, "Password is required"),
});

const registerSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email(),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

function AuthLayout({ children, title, subtitle }: { children: React.ReactNode, title: string, subtitle: string }) {
  return (
    <div className="min-h-[80vh] flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-card border border-border rounded-2xl shadow-sm p-8">
        <div className="flex flex-col items-center mb-8">
          <Link href="/" className="mb-6">
            <div className="bg-primary text-primary-foreground p-2 rounded-lg">
              <Zap className="h-6 w-6 fill-current" />
            </div>
          </Link>
          <h1 className="text-2xl font-bold tracking-tight mb-1">{title}</h1>
          <p className="text-sm text-muted-foreground">{subtitle}</p>
        </div>
        {children}
      </div>
    </div>
  );
}

export function Login() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  const form = useForm<z.infer<typeof loginSchema>>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  function onSubmit() {
    toast({ title: "Coming soon", description: "Accounts are not fully implemented yet." });
    setTimeout(() => setLocation("/"), 1500);
  }

  return (
    <AuthLayout title="Welcome back" subtitle="Log in to access your saved boards.">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
               <FormItem>
                 <FormLabel>Email</FormLabel>
                 <FormControl>
                   <Input type="email" placeholder="you@example.com" {...field} />
                 </FormControl>
                 <FormMessage />
               </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
               <FormItem>
                 <div className="flex items-center justify-between">
                   <FormLabel>Password</FormLabel>
                   <a href="#" className="text-xs text-primary hover:underline">Forgot password?</a>
                 </div>
                 <FormControl>
                   <Input type="password" {...field} />
                 </FormControl>
                 <FormMessage />
               </FormItem>
            )}
          />
          <Button type="submit" className="w-full mt-2">Log In</Button>
        </form>
      </Form>
      <div className="mt-6 text-center text-sm text-muted-foreground">
        Don't have an account? <Link href="/register" className="text-primary font-medium hover:underline">Sign up</Link>
      </div>
    </AuthLayout>
  );
}

export function Register() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  const form = useForm<z.infer<typeof registerSchema>>({
    resolver: zodResolver(registerSchema),
    defaultValues: { name: "", email: "", password: "" },
  });

  function onSubmit() {
    toast({ title: "Coming soon", description: "Accounts are not fully implemented yet." });
    setTimeout(() => setLocation("/"), 1500);
  }

  return (
    <AuthLayout title="Create an account" subtitle="Sign up for pro features and history.">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
               <FormItem>
                 <FormLabel>Name</FormLabel>
                 <FormControl>
                   <Input placeholder="Alex" {...field} />
                 </FormControl>
                 <FormMessage />
               </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
               <FormItem>
                 <FormLabel>Email</FormLabel>
                 <FormControl>
                   <Input type="email" placeholder="you@example.com" {...field} />
                 </FormControl>
                 <FormMessage />
               </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
               <FormItem>
                 <FormLabel>Password</FormLabel>
                 <FormControl>
                   <Input type="password" {...field} />
                 </FormControl>
                 <FormMessage />
               </FormItem>
            )}
          />
          <Button type="submit" className="w-full mt-2">Sign Up</Button>
        </form>
      </Form>
      <div className="mt-6 text-center text-sm text-muted-foreground">
        Already have an account? <Link href="/login" className="text-primary font-medium hover:underline">Log in</Link>
      </div>
    </AuthLayout>
  );
}
