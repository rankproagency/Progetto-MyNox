'use server';

import { createAdminClient } from '@/lib/supabase/admin';
import { getProfile } from '@/lib/auth';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

async function requireClubAdmin() {
  const profile = await getProfile();
  if (!profile?.club_id || profile.role !== 'club_admin') redirect('/club/dashboard');
  return profile;
}

export async function createExtra(formData: { name: string; description: string; deposit: number; maxQuantity: number }) {
  const profile = await requireClubAdmin();
  const admin = createAdminClient();
  const { data, error } = await admin
    .from('club_extras')
    .insert({
      club_id: profile.club_id,
      name: formData.name,
      description: formData.description || null,
      deposit: formData.deposit,
      max_quantity: formData.maxQuantity,
    })
    .select()
    .single();
  if (error) return { error: error.message };
  revalidatePath('/club/extras');
  return { data };
}

export async function updateExtra(id: string, formData: { name: string; description: string; deposit: number; maxQuantity: number }) {
  const profile = await requireClubAdmin();
  const admin = createAdminClient();
  const { error } = await admin
    .from('club_extras')
    .update({
      name: formData.name,
      description: formData.description || null,
      deposit: formData.deposit,
      max_quantity: formData.maxQuantity,
    })
    .eq('id', id)
    .eq('club_id', profile.club_id!);
  if (error) return { error: error.message };
  revalidatePath('/club/extras');
  return { error: null };
}

export async function toggleExtra(id: string, isAvailable: boolean) {
  const profile = await requireClubAdmin();
  const admin = createAdminClient();
  const { error } = await admin
    .from('club_extras')
    .update({ is_available: isAvailable })
    .eq('id', id)
    .eq('club_id', profile.club_id!);
  if (error) return { error: error.message };
  revalidatePath('/club/extras');
  return { error: null };
}

export async function deleteExtra(id: string) {
  const profile = await requireClubAdmin();
  const admin = createAdminClient();
  const { error } = await admin
    .from('club_extras')
    .delete()
    .eq('id', id)
    .eq('club_id', profile.club_id!);
  if (error) return { error: error.message };
  revalidatePath('/club/extras');
  return { error: null };
}
