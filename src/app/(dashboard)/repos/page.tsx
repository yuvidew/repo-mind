import ReposView from "@/features/repos/_components/repos-view";
import { requireAuth } from "@/lib/auth-utils";

const ReposPage = async() => {
    await requireAuth();
    return <ReposView />;
};

export default ReposPage;
