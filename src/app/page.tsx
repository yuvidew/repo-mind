import { HomeView } from "@/features/home/_components/home-view";
import { requireAuth } from "@/lib/auth-utils";

const Home = async () => {
  await requireAuth();
  return <HomeView />;
};

export default Home;
