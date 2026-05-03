import { RepoCard } from "./repo-card";
import type { DemoRepo } from "./repo-demo-data";

type ReposGridProps = {
  repos: DemoRepo[];
};

export const ReposGrid = ({ repos }: ReposGridProps) => {
  return (
    <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {repos.map((repo) => (
        <RepoCard key={repo.id} repo={repo} />
      ))}
    </section>
  );
};
