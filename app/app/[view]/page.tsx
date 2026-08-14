import { Workspace } from "@/components/finance/workspace";
export default async function WorkspacePage({ params }: { params: Promise<{ view: string }> }) { const { view } = await params; return <Workspace view={view} />; }
