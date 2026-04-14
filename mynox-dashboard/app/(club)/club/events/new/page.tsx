import { redirect } from 'next/navigation';
import { getProfile } from '@/lib/auth';
import EventForm from '@/components/club/EventForm';

export default async function NewEventPage() {
  const profile = await getProfile();
  if (!profile?.club_id) return <p className="text-slate-400">Club non configurato. Contatta l&apos;amministratore.</p>;

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Nuovo evento</h1>
        <p className="text-slate-400 mt-1">Compila i dettagli per creare un nuovo evento.</p>
      </div>
      <EventForm clubId={profile.club_id} />
    </div>
  );
}
