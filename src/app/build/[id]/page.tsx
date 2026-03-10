import { getTemplateById, templates } from "@/data/templates";
import { notFound } from "next/navigation";
import AdBuilder from "@/components/AdBuilder";

export function generateStaticParams() {
  return templates.map((t) => ({ id: t.id }));
}

export default async function BuildPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const template = getTemplateById(id);
  if (!template) notFound();

  return <AdBuilder template={template} />;
}
