import type { Metadata } from "next";
import { DiscoverReposView } from "@/features/repos/_components/discover-repos-view";

export const metadata: Metadata = {
  title: "Discover repositories | RepoMind",
  description: "Find example GitHub repositories to analyze with RepoMind.",
};

const DiscoverPage = () => <DiscoverReposView />;

export default DiscoverPage;
