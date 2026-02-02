'use client';

import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';

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
      // For now, we'll mock the data structure
      const mockUsers: User[] = [
        {
          _id: '1',
          name: 'Sunnyvale Care',
          type: 'consumer',
          status: 'active',
          lastLogin: new Date().toISOString(),
        },
        {
          _id: '2',
          name: "Joe's Pizza",
          type: 'vendor',
          status: 'active',
          lastLogin: new Date().toISOString(),
        },
      ];

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
    <div className="min-h-screen bg-gray-50">
      <div className="flex">
        {/* Sidebar */}
        <aside className="w-64 bg-white shadow-sm min-h-screen p-6 hidden md:block">
          <h2 className="text-2xl font-bold mb-8">SafePlate Admin</h2>
          <nav className="space-y-2">
            <a
              href="/admin/dashboard"
              className="block px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg"
            >
              Dashboard
            </a>
            <a
              href="/admin/orders"
              className="block px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg"
            >
              Orders
            </a>
            <a
              href="/admin/users"
              className="block px-4 py-2 bg-green-100 text-green-700 rounded-lg font-medium"
            >
              User Management
            </a>
          </nav>
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-6">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-3xl font-bold">User Management</h1>
            <Button>Add User</Button>
          </div>

          {/* Filters */}
          <div className="flex gap-2 mb-6">
            <button
              onClick={() => setFilter('all')}
              className={`px-4 py-2 rounded-lg ${
                filter === 'all'
                  ? 'bg-green-600 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-100'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setFilter('consumer')}
              className={`px-4 py-2 rounded-lg ${
                filter === 'consumer'
                  ? 'bg-green-600 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-100'
              }`}
            >
              Group Homes
            </button>
            <button
              onClick={() => setFilter('vendor')}
              className={`px-4 py-2 rounded-lg ${
                filter === 'vendor'
                  ? 'bg-green-600 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-100'
              }`}
            >
              Vendors
            </button>
          </div>

          {loading ? (
            <div className="text-center py-12">
              <p className="text-gray-500">Loading users...</p>
            </div>
          ) : (
            <Card>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-3 px-4 font-semibold">Name</th>
                      <th className="text-left py-3 px-4 font-semibold">Type</th>
                      <th className="text-left py-3 px-4 font-semibold">Status</th>
                      <th className="text-left py-3 px-4 font-semibold">Last Login</th>
                      <th className="text-left py-3 px-4 font-semibold">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((user) => (
                      <tr key={user._id} className="border-b border-gray-100">
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
                        <td className="py-3 px-4 text-sm text-gray-600">
                          {user.lastLogin
                            ? new Date(user.lastLogin).toLocaleDateString()
                            : 'Never'}
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex gap-2">
                            <button className="text-blue-600 hover:text-blue-800">
                              Edit
                            </button>
                            <button className="text-gray-600 hover:text-gray-800">
                              Profile
                            </button>
                            <button
                              onClick={() => handleStatusToggle(user._id, user.status)}
                              className={`${
                                user.status === 'active'
                                  ? 'text-red-600 hover:text-red-800'
                                  : 'text-green-600 hover:text-green-800'
                              }`}
                            >
                              {user.status === 'active' ? 'Suspend' : 'Activate'}
                            </button>
                            <button className="text-red-600 hover:text-red-800">
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
        </main>
      </div>
    </div>
  );
}
