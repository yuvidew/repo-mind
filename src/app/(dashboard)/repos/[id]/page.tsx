import { RepoResultView } from "@/features/repos/_components/repo-result-view";
import { requireAuth } from "@/lib/auth-utils";

type RepoIdPageProps = {
    params: Promise<{ id: string }>;
};

const RepoIdPage = async ({ params }: RepoIdPageProps) => {
    await requireAuth();
    const { id } = await params;

    return <RepoResultView id={id} />;
};

export default RepoIdPage;
