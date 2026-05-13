'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Search, ChevronLeft, ChevronRight } from 'lucide-react';
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

interface Props {
  users: User[];
  clubs: Club[];
  total: number;
  totalPages: number;
  perPage: number;
  currentPage: number;
  currentQ: string;
  currentRole: string;
  currentStatus: string;
}

export default function UsersTable({
  users, clubs, total, totalPages, perPage,
  currentPage, currentQ, currentRole, currentStatus,
}: Props) {
  const router = useRouter();
  const [localQuery, setLocalQuery] = useState(currentQ);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setLocalQuery(currentQ);
  }, [currentQ]);

  function buildUrl(overrides: Record<string, string | number>) {
    const sp = new URLSearchParams();
    const merged: Record<string, string> = {
      q: currentQ,
      role: currentRole,
      status: currentStatus,
      page: String(currentPage),
      ...Object.fromEntries(Object.entries(overrides).map(([k, v]) => [k, String(v)])),
    };
    for (const [k, v] of Object.entries(merged)) {
      if (v) sp.set(k, v);
    }
    return `/admin/users?${sp.toString()}`;
  }

  function navigate(overrides: Record<string, string | number>) {
    router.push(buildUrl({ page: 1, ...overrides }));
  }

  function handleQueryChange(value: string) {
    setLocalQuery(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => navigate({ q: value }), 350);
  }

  const offset = (currentPage - 1) * perPage;

  const pageNumbers = Array.from({ length: totalPages }, (_, i) => i + 1)
    .filter((p) => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1)
    .reduce<(number | '...')[]>((acc, p, i, arr) => {
      if (i > 0 && (arr[i - 1] as number) !== p - 1) acc.push('...');
      acc.push(p);
      return acc;
    }, []);

  return (
    <div>
      {/* Filtri */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
          <input
            type="text"
            placeholder="Cerca per nome o email…"
            value={localQuery}
            onChange={(e) => handleQueryChange(e.target.value)}
            className="w-full bg-[#111118] border border-white/8 rounded-xl pl-9 pr-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-purple-500/50 transition-colors"
          />
        </div>
        <select
          value={currentRole}
          onChange={(e) => navigate({ role: e.target.value })}
          className="bg-[#111118] border border-white/8 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-purple-500/50 transition-colors appearance-none cursor-pointer min-w-36"
        >
          <option value="">Tutti i ruoli</option>
          <option value="customer">Cliente</option>
          <option value="club_admin">Discoteca</option>
          <option value="club_staff">Staff</option>
          <option value="admin">Admin</option>
        </select>
        <select
          value={currentStatus}
          onChange={(e) => navigate({ status: e.target.value })}
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
            {users.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-5 py-12 text-center text-slate-500">
                  {currentQ || currentRole || currentStatus
                    ? 'Nessun utente corrisponde ai filtri.'
                    : 'Nessun utente trovato.'}
                </td>
              </tr>
            ) : (
              users.map((user) => (
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

        {/* Paginazione */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-5 py-3 border-t border-white/8">
            <p className="text-xs text-slate-500">
              {offset + 1}–{Math.min(offset + perPage, total)} di {total} utenti
            </p>
            <div className="flex items-center gap-1">
              <button
                onClick={() => router.push(buildUrl({ page: Math.max(1, currentPage - 1) }))}
                disabled={currentPage === 1}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft size={16} />
              </button>
              {pageNumbers.map((p, i) =>
                p === '...' ? (
                  <span key={`e-${i}`} className="w-7 h-7 flex items-center justify-center text-slate-500 text-xs">…</span>
                ) : (
                  <button
                    key={p}
                    onClick={() => router.push(buildUrl({ page: p }))}
                    className={`w-7 h-7 rounded-lg text-xs font-medium transition-colors ${
                      p === currentPage ? 'bg-purple-600 text-white' : 'text-slate-400 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    {p}
                  </button>
                )
              )}
              <button
                onClick={() => router.push(buildUrl({ page: Math.min(totalPages, currentPage + 1) }))}
                disabled={currentPage === totalPages}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
