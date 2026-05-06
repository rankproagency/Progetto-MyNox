'use client';

import { useState } from 'react';
import { Search } from 'lucide-react';
import UserRoleEditor from './UserRoleEditor';

interface Club { id: string; name: string }

interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  clubId: string | null;
  memberSince: string | null;
  createdAt: string;
  lastSignIn: string | null;
  confirmed: boolean;
}

const ROLE_LABELS: Record<string, string> = {
  admin:      'Admin',
  club_admin: 'Discoteca',
  customer:   'Cliente',
};

export default function UsersTable({ users, clubs }: { users: User[]; clubs: Club[] }) {
  const [query, setQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const q = query.trim().toLowerCase();

  const filtered = users.filter((u) => {
    const matchesQuery = !q || u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q);
    const matchesRole = !roleFilter || u.role === roleFilter;
    const matchesStatus = !statusFilter || (statusFilter === 'confirmed' ? u.confirmed : !u.confirmed);
    return matchesQuery && matchesRole && matchesStatus;
  });

  return (
    <div>
      {/* Filtri */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
          <input
            type="text"
            placeholder="Cerca per nome o email…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full bg-[#111118] border border-white/8 rounded-xl pl-9 pr-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-purple-500/50 transition-colors"
          />
        </div>
        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          className="bg-[#111118] border border-white/8 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-purple-500/50 transition-colors appearance-none cursor-pointer min-w-36"
        >
          <option value="">Tutti i ruoli</option>
          <option value="customer">Cliente</option>
          <option value="club_admin">Discoteca</option>
          <option value="admin">Admin</option>
        </select>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="bg-[#111118] border border-white/8 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-purple-500/50 transition-colors appearance-none cursor-pointer min-w-36"
        >
          <option value="">Tutti gli stati</option>
          <option value="confirmed">Confermati</option>
          <option value="pending">In attesa</option>
        </select>
      </div>

      {/* Tabella */}
      <div className="bg-[#111118] border border-white/8 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/8">
              <th className="text-left px-5 py-3 text-slate-400 font-medium">Nome</th>
              <th className="text-left px-5 py-3 text-slate-400 font-medium hidden md:table-cell">Email</th>
              <th className="text-left px-5 py-3 text-slate-400 font-medium">Ruolo</th>
              <th className="text-left px-5 py-3 text-slate-400 font-medium hidden md:table-cell">Registrato il</th>
              <th className="text-left px-5 py-3 text-slate-400 font-medium hidden md:table-cell">Ultimo accesso</th>
              <th className="text-left px-5 py-3 text-slate-400 font-medium">Stato</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-5 py-12 text-center text-slate-500">
                  {q || roleFilter || statusFilter ? 'Nessun utente corrisponde ai filtri.' : 'Nessun utente trovato.'}
                </td>
              </tr>
            ) : (
              filtered.map((user) => (
                <tr key={user.id} className="border-b border-white/5 hover:bg-white/3 transition-colors">
                  <td className="px-5 py-4 text-white font-medium">{user.name}</td>
                  <td className="px-5 py-4 text-slate-300 hidden md:table-cell">{user.email}</td>
                  <td className="px-5 py-4">
                    <UserRoleEditor
                      userId={user.id}
                      currentRole={user.role}
                      currentClubId={user.clubId}
                      clubs={clubs}
                    />
                  </td>
                  <td className="px-5 py-4 text-slate-400 hidden md:table-cell">
                    {new Date(user.createdAt).toLocaleDateString('it-IT', {
                      day: '2-digit', month: 'short', year: 'numeric',
                    })}
                  </td>
                  <td className="px-5 py-4 text-slate-400 hidden md:table-cell">
                    {user.lastSignIn
                      ? new Date(user.lastSignIn).toLocaleDateString('it-IT', {
                          day: '2-digit', month: 'short', year: 'numeric',
                        })
                      : '—'}
                  </td>
                  <td className="px-5 py-4">
                    {user.confirmed ? (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border bg-green-500/10 text-green-400 border-green-500/20">
                        Confermato
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border bg-amber-500/10 text-amber-400 border-amber-500/20">
                        In attesa
                      </span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {filtered.length > 0 && filtered.length < users.length && (
        <p className="text-xs text-slate-500 mt-3">
          {filtered.length} di {users.length} utenti
        </p>
      )}
    </div>
  );
}
