import ReposView from "@/features/repos/_components/repos-view";
import { requireAuth } from "@/lib/auth-utils";
import { toRepoCard } from "@/lib/repos/repo-adapters";
import { listReposForUser } from "@/lib/repos/repo-service";

const ReposPage = async () => {
  const session = await requireAuth();
  const repos = await listReposForUser(session.user.id);

  return <ReposView repos={repos.map(toRepoCard)} />;
};

export default ReposPage;
