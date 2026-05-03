import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { AnalysisPreview } from "./analysis-preview";
import { FeaturesSection } from "./features-section";
import { Footer } from "./footer";
import { Header } from "./header";
import { Hero } from "./hero";
import { HowItWorks } from "./how-it-works";

export const HomeView = async () => {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  return (
    <main className="flex-1 bg-background text-foreground">
      <Header
        isSignedIn={Boolean(session)}
        userEmail={session?.user.email ?? null}
        userImage={session?.user.image ?? null}
        userName={session?.user.name ?? null}
      />
      <Hero />
      <AnalysisPreview />
      <HowItWorks />
      <FeaturesSection />
      <Footer />
    </main>
  );
};
