import { RepoResultView } from "@/features/repos/_components/repo-result-view";
import { requireAuth } from "@/lib/auth-utils";
import { toRepoResult } from "@/lib/repos/repo-adapters";
import { getRepoForUser } from "@/lib/repos/repo-service";

type RepoIdPageProps = {
  params: Promise<{ id: string }>;
};

const RepoIdPage = async ({ params }: RepoIdPageProps) => {
  const session = await requireAuth();
  const { id } = await params;
  const repo = await getRepoForUser({ id, userId: session.user.id });

  return <RepoResultView result={repo ? toRepoResult(repo) : null} />;
};

export default RepoIdPage;
