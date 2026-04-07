import { useEffect, useState } from 'react';
import { Plus, Search, Pencil, Trash2, X } from 'lucide-react';
import { apiFetch } from '../../api';
import { useAuth } from '../../context/AuthContext';

interface AppUser {
  id: string;
  userName: string;
  email: string;
  roles: string[];
}

interface UserFormState {
  email: string;
  password: string;
  confirmPassword: string;
  role: string;
}

const EMPTY_FORM: UserFormState = { email: '', password: '', confirmPassword: '', role: 'donor' };

function PasswordStrengthHint({ password }: { password: string }) {
  if (!password) return null;
  const reqs = [
    { met: password.length >= 14, label: '14+ chars' },
  ];
  return (
    <div className="flex flex-wrap gap-1 mt-1">
      {reqs.map((r) => (
        <span
          key={r.label}
          className={`text-xs px-1.5 py-0.5 rounded ${
            r.met
              ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300'
              : 'bg-slate-100 text-slate-400 dark:bg-slate-800'
          }`}
        >
          {r.label}
        </span>
      ))}
    </div>
  );
}

function UserFormModal({
  title,
  initial,
  isSelf,
  onSave,
  onClose,
  isEdit,
}: {
  title: string;
  initial: Partial<UserFormState>;
  isSelf?: boolean;
  onSave: (data: UserFormState) => Promise<void>;
  onClose: () => void;
  isEdit?: boolean;
}) {
  const [form, setForm] = useState<UserFormState>({ ...EMPTY_FORM, ...initial });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function set(field: keyof UserFormState, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (form.password && form.password !== form.confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    setSaving(true);
    try {
      await onSave(form);
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'An error occurred.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl shadow-xl p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-semibold text-[#0f172a] dark:text-white">{title}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-white">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Email address
            </label>
            <input
              type="email"
              required={!isEdit}
              value={form.email}
              onChange={(e) => set('email', e.target.value)}
              className="w-full border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-safira-blue"
              placeholder="user@example.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Role
            </label>
            <select
              value={form.role}
              onChange={(e) => set('role', e.target.value)}
              disabled={isSelf}
              className="w-full border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-safira-blue disabled:opacity-60"
            >
              <option value="donor">Donor</option>
              <option value="admin">Admin</option>
            </select>
            {isSelf && (
              <p className="text-xs text-slate-400 mt-1">You cannot change your own role.</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Password {isEdit && <span className="text-slate-400">(leave blank to keep unchanged)</span>}
            </label>
            <input
              type="password"
              required={!isEdit}
              value={form.password}
              onChange={(e) => set('password', e.target.value)}
              className="w-full border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-safira-blue"
              autoComplete="new-password"
            />
            <PasswordStrengthHint password={form.password} />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Confirm password
            </label>
            <input
              type="password"
              required={!isEdit && !!form.password}
              value={form.confirmPassword}
              onChange={(e) => set('confirmPassword', e.target.value)}
              className="w-full border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-safira-blue"
              autoComplete="new-password"
            />
          </div>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm text-slate-600 dark:text-slate-300 border border-slate-300 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 text-sm font-medium text-white bg-safira-blue rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-60"
            >
              {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function DeleteConfirmModal({
  user,
  onConfirm,
  onClose,
}: {
  user: AppUser;
  onConfirm: () => Promise<void>;
  onClose: () => void;
}) {
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleConfirm() {
    setDeleting(true);
    setError(null);
    try {
      await onConfirm();
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Delete failed.');
      setDeleting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-sm bg-white dark:bg-slate-900 rounded-2xl shadow-xl p-6">
        <h2 className="text-lg font-semibold text-[#0f172a] dark:text-white mb-2">Delete User</h2>
        <p className="text-sm text-slate-600 dark:text-slate-300 mb-5">
          Are you sure you want to delete{' '}
          <span className="font-semibold">{user.userName}</span>? This cannot be undone.
        </p>
        {error && (
          <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2 mb-4">
            {error}
          </p>
        )}
        <div className="flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-slate-600 dark:text-slate-300 border border-slate-300 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={deleting}
            className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors disabled:opacity-60"
          >
            {deleting ? 'Deleting…' : 'Delete'}
          </button>
        </div>
      </div>
    </div>
  );
}

const PAGE_SIZE = 15;
const ROLE_FILTERS = ['All', 'Admin', 'Donor'] as const;
type RoleFilter = typeof ROLE_FILTERS[number];

function Pagination({ current, total, onChange, count, pageSize }: {
  current: number;
  total: number;
  onChange: (page: number) => void;
  count: number;
  pageSize: number;
}) {
  if (total <= 1) return null;
  const from = (current - 1) * pageSize + 1;
  const to = Math.min(current * pageSize, count);

  const pages: (number | '...')[] = [];
  if (total <= 7) {
    for (let i = 1; i <= total; i++) pages.push(i);
  } else {
    pages.push(1);
    if (current > 3) pages.push('...');
    for (let i = Math.max(2, current - 1); i <= Math.min(total - 1, current + 1); i++) pages.push(i);
    if (current < total - 2) pages.push('...');
    pages.push(total);
  }

  return (
    <div className="flex items-center justify-between mt-4">
      <p className="text-xs text-slate-500">{from}–{to} of {count}</p>
      <div className="flex items-center gap-1">
        <button
          onClick={() => onChange(current - 1)}
          disabled={current === 1}
          className="px-2.5 py-1.5 text-xs font-medium text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          Prev
        </button>
        {pages.map((p, i) =>
          p === '...' ? (
            <span key={`ellipsis-${i}`} className="px-2 text-slate-400 text-xs">…</span>
          ) : (
            <button
              key={p}
              onClick={() => onChange(p as number)}
              className={`px-2.5 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
                p === current
                  ? 'bg-safira-blue text-white border-safira-blue'
                  : 'text-slate-600 border-slate-200 hover:bg-slate-50'
              }`}
            >
              {p}
            </button>
          )
        )}
        <button
          onClick={() => onChange(current + 1)}
          disabled={current === total}
          className="px-2.5 py-1.5 text-xs font-medium text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          Next
        </button>
      </div>
    </div>
  );
}

export default function UserManagementPage() {
  const { session } = useAuth();
  const [users, setUsers] = useState<AppUser[]>([]);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<RoleFilter>('All');
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [showCreate, setShowCreate] = useState(false);
  const [editUser, setEditUser] = useState<AppUser | null>(null);
  const [deleteUser, setDeleteUser] = useState<AppUser | null>(null);

  async function loadUsers() {
    setLoading(true);
    setError(null);
    try {
      const data = await apiFetch('/api/admin/users');
      setUsers(data);
    } catch {
      setError('Failed to load users.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadUsers();
  }, []);

  function handleSearchChange(e: React.ChangeEvent<HTMLInputElement>) {
    setSearch(e.target.value);
    setCurrentPage(1);
  }

  function handleRoleFilter(role: RoleFilter) {
    setRoleFilter(role);
    setCurrentPage(1);
  }

  async function handleCreate(form: UserFormState) {
    await apiFetch('/api/admin/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: form.email,
        password: form.password,
        confirmPassword: form.confirmPassword,
        role: form.role,
      }),
    });
    await loadUsers();
  }

  async function handleEdit(form: UserFormState) {
    if (!editUser) return;
    const body: Record<string, string> = { role: form.role };
    if (form.email) body.email = form.email;
    if (form.password) {
      body.password = form.password;
      body.confirmPassword = form.confirmPassword;
    }
    await apiFetch(`/api/admin/users/${editUser.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    await loadUsers();
  }

  async function handleDelete() {
    if (!deleteUser) return;
    await apiFetch(`/api/admin/users/${deleteUser.id}`, { method: 'DELETE' });
    await loadUsers();
  }

  const filtered = users.filter((u) => {
    const matchesSearch =
      search.trim() === '' ||
      (u.email || u.userName).toLowerCase().includes(search.toLowerCase());
    const matchesRole =
      roleFilter === 'All' ||
      u.roles.map((r) => r.toLowerCase()).includes(roleFilter.toLowerCase());
    return matchesSearch && matchesRole;
  });

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const roleLabel = (roles: string[]) => {
    if (roles.includes('admin')) return 'Admin';
    if (roles.includes('donor')) return 'Donor';
    return roles.join(', ') || 'None';
  };

  const roleBadgeClass = (roles: string[]) => {
    if (roles.includes('admin'))
      return 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300';
    return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300';
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[#0f172a] dark:text-white">User Management</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Manage admin and donor accounts
          </p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 bg-safira-blue text-white text-sm font-semibold px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus size={16} />
          Add User
        </button>
      </div>

      {/* Search + Role Filter */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="relative max-w-sm flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search by email..."
            value={search}
            onChange={handleSearchChange}
            className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-safira-blue"
          />
        </div>
        <div className="flex items-center gap-1">
          {ROLE_FILTERS.map((r) => (
            <button
              key={r}
              onClick={() => handleRoleFilter(r)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
                roleFilter === r
                  ? 'bg-safira-blue text-white border-safira-blue'
                  : 'text-slate-600 border-slate-200 hover:bg-slate-50 dark:text-slate-300 dark:border-slate-700 dark:hover:bg-slate-800'
              }`}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <p className="text-sm text-red-600 mb-4">{error}</p>
      )}

      {loading ? (
        <p className="text-sm text-slate-500 dark:text-slate-400">Loading users...</p>
      ) : (
        <>
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800">
                <th className="text-left px-4 py-3 font-semibold text-slate-600 dark:text-slate-300">
                  Email
                </th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600 dark:text-slate-300">
                  Role
                </th>
                <th className="text-right px-4 py-3 font-semibold text-slate-600 dark:text-slate-300">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {paginated.length === 0 ? (
                <tr>
                  <td colSpan={3} className="px-4 py-8 text-center text-slate-400">
                    No users found.
                  </td>
                </tr>
              ) : (
                paginated.map((user) => {
                  const isSelf = user.userName === session.userName;
                  return (
                    <tr
                      key={user.id}
                      className="border-b border-slate-100 dark:border-slate-800 last:border-0 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                    >
                      <td className="px-4 py-3 text-[#0f172a] dark:text-white font-medium">
                        {user.email || user.userName}
                        {isSelf && (
                          <span className="ml-2 text-xs text-slate-400">(you)</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs font-semibold px-2 py-1 rounded-full ${roleBadgeClass(user.roles)}`}>
                          {roleLabel(user.roles)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => setEditUser(user)}
                            title="Edit user"
                            className="p-1.5 text-slate-400 hover:text-safira-blue hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-colors"
                          >
                            <Pencil size={15} />
                          </button>
                          <button
                            onClick={() => !isSelf && setDeleteUser(user)}
                            title={isSelf ? 'Cannot delete yourself' : 'Delete user'}
                            disabled={isSelf}
                            className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        <Pagination
          current={currentPage}
          total={totalPages}
          onChange={setCurrentPage}
          count={filtered.length}
          pageSize={PAGE_SIZE}
        />
        </>
      )}

      {showCreate && (
        <UserFormModal
          title="Add New User"
          initial={EMPTY_FORM}
          onSave={handleCreate}
          onClose={() => setShowCreate(false)}
        />
      )}

      {editUser && (
        <UserFormModal
          title="Edit User"
          initial={{ email: editUser.email || editUser.userName, role: editUser.roles[0] ?? 'donor', password: '', confirmPassword: '' }}
          isSelf={editUser.userName === session.userName}
          onSave={handleEdit}
          onClose={() => setEditUser(null)}
          isEdit
        />
      )}

      {deleteUser && (
        <DeleteConfirmModal
          user={deleteUser}
          onConfirm={handleDelete}
          onClose={() => setDeleteUser(null)}
        />
      )}
    </div>
  );
}
