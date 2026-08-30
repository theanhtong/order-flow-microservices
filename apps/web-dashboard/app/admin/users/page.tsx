'use client';

import React, { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Users as UsersIcon, Search, Pencil, Trash2, X, Check, ShieldAlert } from 'lucide-react';
import {
  fetchAdminUsersApi,
  updateAdminUserApi,
  deleteAdminUserApi,
  SystemUser,
} from '../../utils/admin-api';
import { getProfileApi, UserProfile } from '../../utils/auth-api';

const ROLE_LEVELS: Record<string, number> = {
  SYSTEM_ADMIN: 3,
  OPERATOR: 2,
  CUSTOMER: 1,
};

export default function AdminUsersPage() {
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [usersList, setUsersList] = useState<SystemUser[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [userSearchTerm, setUserSearchTerm] = useState('');
  const [userRoleFilter, setUserRoleFilter] = useState('ALL');

  // Edit User State
  const [editingUser, setEditingUser] = useState<SystemUser | null>(null);
  const [editRole, setEditRole] = useState<'CUSTOMER' | 'OPERATOR' | 'SYSTEM_ADMIN'>('CUSTOMER');
  const [editIsActive, setEditIsActive] = useState<boolean>(true);
  const [isSubmittingEdit, setIsSubmittingEdit] = useState(false);

  const loadData = async () => {
    setLoadingUsers(true);
    try {
      const [profileData, usersData] = await Promise.all([
        getProfileApi().catch(() => null),
        fetchAdminUsersApi(),
      ]);
      if (profileData) setCurrentUser(profileData);
      setUsersList(usersData);
    } catch {
      toast.error('Failed to load system users');
    } finally {
      setLoadingUsers(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Security Guard: Check if current logged-in user has authority to manage targetUser
  const canManageUser = (targetUser: SystemUser): boolean => {
    if (!currentUser) return false;
    // 1. Cannot manage yourself
    if (currentUser.id === targetUser.id || currentUser.email === targetUser.email) {
      return false;
    }
    // 2. Peer roles cannot manage each other & lower roles cannot manage higher roles
    const currentLevel = ROLE_LEVELS[currentUser.role] ?? 0;
    const targetLevel = ROLE_LEVELS[targetUser.role] ?? 0;
    if (currentLevel <= targetLevel) {
      return false;
    }
    return true;
  };

  const isSelf = (targetUser: SystemUser): boolean => {
    if (!currentUser) return false;
    return currentUser.id === targetUser.id || currentUser.email === targetUser.email;
  };

  const handleOpenEditModal = (user: SystemUser) => {
    if (!canManageUser(user)) {
      toast.error('You do not have permission to modify this user account');
      return;
    }
    setEditingUser(user);
    setEditRole(user.role);
    setEditIsActive(user.isActive);
  };

  const handleSaveEditUser = async () => {
    if (!editingUser) return;
    setIsSubmittingEdit(true);

    try {
      await updateAdminUserApi(editingUser.id, {
        role: editRole,
        isActive: editIsActive,
      });
      toast.success(`User ${editingUser.email} updated successfully`);
      setEditingUser(null);
      await loadData();
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Failed to update user account';
      toast.error(msg);
    } finally {
      setIsSubmittingEdit(false);
    }
  };

  const handleDeleteUser = async (targetUser: SystemUser) => {
    if (!canManageUser(targetUser)) {
      toast.error('You do not have permission to delete this user account');
      return;
    }
    if (!confirm(`WARNING: Permanently delete user ${targetUser.email}?`)) return;
    try {
      await deleteAdminUserApi(targetUser.id);
      toast.success(`User ${targetUser.email} deleted`);
      await loadData();
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Failed to delete user account';
      toast.error(msg);
    }
  };

  const filteredUsers = usersList.filter((u) => {
    const matchesRole = userRoleFilter === 'ALL' || u.role === userRoleFilter;
    const matchesSearch =
      !userSearchTerm.trim() ||
      u.email.toLowerCase().includes(userSearchTerm.toLowerCase().trim()) ||
      (u.fullName && u.fullName.toLowerCase().includes(userSearchTerm.toLowerCase().trim()));
    return matchesRole && matchesSearch;
  });

  // Calculate available assignable roles based on current user level
  const currentUserLevel = currentUser ? (ROLE_LEVELS[currentUser.role] ?? 0) : 0;
  const availableRoles = [
    { value: 'CUSTOMER', label: 'Customer', level: 1 },
    { value: 'OPERATOR', label: 'Operator', level: 2 },
    { value: 'SYSTEM_ADMIN', label: 'System Admin', level: 3 },
  ].filter((r) => r.level < currentUserLevel);

  return (
    <div className="space-y-4">
      {/* Header & Filter Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 font-sans">
        <div className="flex items-center gap-1 bg-slate-200/70 p-1 rounded-sm border border-slate-200 w-full sm:w-auto">
          {[
            { key: 'ALL', label: 'All' },
            { key: 'CUSTOMER', label: 'Customer' },
            { key: 'OPERATOR', label: 'Operator' },
            { key: 'SYSTEM_ADMIN', label: 'System Admin' },
          ].map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setUserRoleFilter(tab.key)}
              className={`px-3 py-1.5 text-xs rounded-sm transition font-medium ${
                userRoleFilter === tab.key
                  ? 'bg-white text-slate-900 font-bold shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
          <input
            type="text"
            placeholder="Search user email or name..."
            value={userSearchTerm}
            onChange={(e) => setUserSearchTerm(e.target.value)}
            className="w-full ui-input pl-8 pr-3 py-1.5 text-xs"
          />
        </div>
      </div>

      {/* Users Data Table */}
      {loadingUsers ? (
        <div className="ui-card p-8 bg-white border-slate-200 text-center text-xs text-slate-500 font-sans">
          Loading users...
        </div>
      ) : filteredUsers.length === 0 ? (
        <div className="ui-card p-8 bg-white border-slate-200 text-center space-y-3 font-sans">
          <UsersIcon className="w-10 h-10 text-slate-300 mx-auto stroke-[1.2]" />
          <div className="text-sm font-semibold text-slate-700">No users found</div>
        </div>
      ) : (
        <div className="ui-card bg-white border border-slate-200 rounded-sm overflow-hidden font-sans shadow-2xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-700">
                  <th className="p-3">User</th>
                  <th className="p-3">Role</th>
                  <th className="p-3">Status</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredUsers.map((u) => {
                  const isUserSelf = isSelf(u);
                  const canManage = canManageUser(u);

                  return (
                    <tr key={u.id} className="hover:bg-slate-50/60 transition">
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          <div>
                            <div className="font-bold text-slate-900 flex items-center gap-1.5">
                              <span>{u.fullName || 'User'}</span>
                              {isUserSelf && (
                                <span className="px-1.5 py-0.5 text-[10px] bg-blue-100 text-blue-800 font-semibold rounded-xs border border-blue-200">
                                  You
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-slate-500 font-mono">
                              {u.email}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="p-3 font-mono text-[11px]">
                        <span className="ui-badge bg-slate-100 text-slate-700 border-slate-300">
                          {u.role === 'SYSTEM_ADMIN' ? 'System Admin' : u.role === 'OPERATOR' ? 'Operator' : 'Customer'}
                        </span>
                      </td>
                      <td className="p-3 font-mono text-[11px]">
                        {u.isActive ? (
                          <span className="ui-badge bg-emerald-100 text-emerald-800 border-emerald-300">
                            Active
                          </span>
                        ) : (
                          <span className="ui-badge bg-rose-100 text-rose-800 border-rose-300">
                            Inactive
                          </span>
                        )}
                      </td>
                      <td className="p-3 text-right">
                        {canManage ? (
                          <div className="inline-flex items-center space-x-2">
                            <button
                              type="button"
                              onClick={() => handleOpenEditModal(u)}
                              className="px-2.5 py-1 text-[11px] text-slate-700 hover:bg-slate-100 bg-slate-50 rounded-sm transition font-medium border border-slate-300 inline-flex items-center gap-1"
                            >
                              <Pencil className="w-3 h-3 text-slate-500" />
                              <span>Edit</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteUser(u)}
                              className="px-2 py-1 text-[11px] text-rose-600 hover:bg-rose-50 rounded-sm transition font-medium border border-rose-200"
                              title="Delete User"
                            >
                              <Trash2 className="w-3 h-3 text-rose-600" />
                            </button>
                          </div>
                        ) : (
                          <span className="text-[11px] text-slate-400 italic">
                            {isUserSelf ? 'Your Account' : 'No Permission'}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Edit User Modal */}
      {editingUser && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 font-sans">
          <div className="bg-white border border-slate-200 rounded-sm shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div className="font-bold text-sm text-slate-900 flex items-center gap-1.5">
                <Pencil className="w-4 h-4 text-blue-600" />
                <span>Edit User Account</span>
              </div>
              <button
                type="button"
                onClick={() => setEditingUser(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-sm transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              {/* User Email Info */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">User Email</label>
                <div className="bg-slate-50 border border-slate-200 px-3.5 py-2 rounded-sm text-slate-800 font-mono text-xs">
                  {editingUser.email}
                </div>
              </div>

              {/* Full Name Info */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Full Name</label>
                <div className="bg-slate-50 border border-slate-200 px-3.5 py-2 rounded-sm text-slate-800 text-xs">
                  {editingUser.fullName || 'N/A'}
                </div>
              </div>

              {/* Role Select */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">User Role</label>
                {availableRoles.length > 0 ? (
                  <select
                    value={editRole}
                    onChange={(e) => setEditRole(e.target.value as any)}
                    className="w-full bg-white border border-slate-300 rounded-sm px-3.5 py-2 text-xs font-medium text-slate-900 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition"
                  >
                    {availableRoles.map((r) => (
                      <option key={r.value} value={r.value}>
                        {r.label}
                      </option>
                    ))}
                  </select>
                ) : (
                  <div className="text-slate-500 italic text-[11px] p-2.5 bg-slate-50 rounded-sm border border-slate-200 flex items-center gap-1.5">
                    <ShieldAlert className="w-3.5 h-3.5 text-amber-500" />
                    <span>Cannot change role to higher or equal level</span>
                  </div>
                )}
              </div>

              {/* Status Select */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Account Status</label>
                <select
                  value={editIsActive ? 'active' : 'inactive'}
                  onChange={(e) => setEditIsActive(e.target.value === 'active')}
                  className="w-full bg-white border border-slate-300 rounded-sm px-3.5 py-2 text-xs font-medium text-slate-900 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition"
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
            </div>

            <div className="px-4 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setEditingUser(null)}
                className="ui-button-secondary px-3 py-1.5 text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isSubmittingEdit}
                onClick={handleSaveEditUser}
                className="ui-button-primary px-4 py-1.5 text-xs font-semibold disabled:opacity-50"
              >
                {isSubmittingEdit ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
