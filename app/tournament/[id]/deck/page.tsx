import { redirect } from 'next/navigation';

export default async function DeckPhotoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  redirect(`/tournament/${id}`);
}
