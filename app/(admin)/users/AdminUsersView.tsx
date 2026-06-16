'use client';

import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { AdminShell } from '@/components/layout/AdminShell';
import { getMockStore } from '@/lib/mock-data';

interface User {
  _id: string;
  name: string;
  type: 'consumer' | 'vendor';
  status: 'active' | 'suspended';
  lastLogin?: string;
}

export default function UserManagementPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'consumer' | 'vendor'>('all');

  useEffect(() => {
    fetchUsers();
  }, [filter]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      // This would fetch from an admin API endpoint
      const mockUsers: User[] = getMockStore().users;

      const filtered = filter === 'all'
        ? mockUsers
        : mockUsers.filter((u) => u.type === filter);

      setUsers(filtered);
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusToggle = async (userId: string, currentStatus: string) => {
    try {
      // Implement status toggle API call
      setUsers((prev) =>
        prev.map((user) =>
          user._id === userId
            ? {
                ...user,
                status: currentStatus === 'active' ? 'suspended' : 'active',
              }
            : user
        )
      );
    } catch (error) {
      console.error('Error updating user status:', error);
    }
  };

  return (
    <AdminShell
      title="User Management"
      subtitle="Review organization access, monitor activity, and manage vendor compliance."
      active="users"
      actions={<Button>Add User</Button>}
    >
      {/* Filters */}
      <div className="flex flex-wrap gap-2 mb-6">
        <button
          onClick={() => setFilter('all')}
          className={`px-4 py-2 rounded-full text-sm font-semibold ${
            filter === 'all'
              ? 'bg-emerald-600 text-white'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          All
        </button>
        <button
          onClick={() => setFilter('consumer')}
          className={`px-4 py-2 rounded-full text-sm font-semibold ${
            filter === 'consumer'
              ? 'bg-emerald-600 text-white'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          Group Homes
        </button>
        <button
          onClick={() => setFilter('vendor')}
          className={`px-4 py-2 rounded-full text-sm font-semibold ${
            filter === 'vendor'
              ? 'bg-emerald-600 text-white'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          Vendors
        </button>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <p className="text-slate-500">Loading users...</p>
        </div>
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="text-left py-3 px-4 font-semibold">Name</th>
                  <th className="text-left py-3 px-4 font-semibold">Type</th>
                  <th className="text-left py-3 px-4 font-semibold">Status</th>
                  <th className="text-left py-3 px-4 font-semibold">Last Login</th>
                  <th className="text-left py-3 px-4 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user._id} className="border-b border-slate-100">
                    <td className="py-3 px-4">{user.name}</td>
                    <td className="py-3 px-4">
                      <Badge variant="info">
                        {user.type === 'consumer' ? 'Group Home' : 'Vendor'}
                      </Badge>
                    </td>
                    <td className="py-3 px-4">
                      <Badge
                        variant={user.status === 'active' ? 'success' : 'danger'}
                      >
                        {user.status === 'active' ? 'Active' : 'Suspended'}
                      </Badge>
                    </td>
                    <td className="py-3 px-4 text-sm text-slate-500">
                      {user.lastLogin
                        ? new Date(user.lastLogin).toLocaleDateString()
                        : 'Never'}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex flex-wrap gap-3 text-sm font-semibold">
                        <button className="text-sky-600 hover:text-sky-800">
                          Edit
                        </button>
                        <button className="text-slate-500 hover:text-slate-700">
                          Profile
                        </button>
                        <button
                          onClick={() => handleStatusToggle(user._id, user.status)}
                          className={`${
                            user.status === 'active'
                              ? 'text-rose-600 hover:text-rose-800'
                              : 'text-emerald-600 hover:text-emerald-800'
                          }`}
                        >
                          {user.status === 'active' ? 'Suspend' : 'Activate'}
                        </button>
                        <button className="text-rose-600 hover:text-rose-800">
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </AdminShell>
  );
}
