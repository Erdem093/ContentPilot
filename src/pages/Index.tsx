import { Link, Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

const points = [
  "AI script + hook + title generation",
  "Approve/reject artifacts per run",
  "Run-level observability and cost tracking",
  "Subscription-ready billing flow",
];

export default function Index() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (user) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="min-h-screen bg-background">
      <main className="max-w-4xl mx-auto px-6 py-20 space-y-12">
        <section className="space-y-5">
          <p className="text-sm uppercase tracking-wide text-muted-foreground">Studio Mind</p>
          <h1 className="text-4xl md:text-5xl font-display font-bold leading-tight">
            Multi-Agent Content Pipeline for Creator Workflows
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl">
            Turn one video idea into structured content outputs, review artifacts fast, and track usage with a
            lightweight production-ready stack.
          </p>
          <div className="flex items-center gap-3">
            <Button asChild size="lg">
              <Link to="/auth">Get Started</Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link to="/auth">Log In</Link>
            </Button>
          </div>
        </section>

        <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {points.map((point) => (
            <Card key={point}>
              <CardContent className="pt-6">
                <p className="font-medium">{point}</p>
              </CardContent>
            </Card>
          ))}
        </section>
      </main>
    </div>
  );
}
