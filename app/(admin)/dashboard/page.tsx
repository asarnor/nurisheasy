'use client';

import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';

interface DashboardStats {
  activeOrders: number;
  criticalIssues: number;
  totalRevenue: number;
}

interface RecentOrder {
  _id: string;
  date: string;
  status: string;
  amount: number;
  expectedPayout: number;
}

interface CriticalIssue {
  id: string;
  type: string;
  vendorName: string;
  orderId: string;
  message: string;
}

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<DashboardStats>({
    activeOrders: 0,
    criticalIssues: 0,
    totalRevenue: 0,
  });
  const [recentOrders, setRecentOrders] = useState<RecentOrder[]>([]);
  const [criticalIssues, setCriticalIssues] = useState<CriticalIssue[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
    // Refresh every 30 seconds
    const interval = setInterval(fetchDashboardData, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchDashboardData = async () => {
    try {
      // Fetch orders
      const ordersResponse = await fetch('/api/orders');
      if (ordersResponse.ok) {
        const ordersData = await ordersResponse.json();
        const orders = ordersData.orders || [];
        
        const activeOrders = orders.filter(
          (o: any) => o.status === 'PROCESSING' || o.status === 'CONFIRMED'
        ).length;
        
        const totalRevenue = orders.reduce(
          (sum: number, o: any) => sum + (o.totalAmount || 0),
          0
        );

        const recent = orders
          .slice(0, 10)
          .map((o: any) => ({
            _id: o._id,
            date: o.createdAt,
            status: o.status,
            amount: o.totalAmount,
            expectedPayout: o.totalAmount - (o.platformFee || 0),
          }));

        setStats({
          activeOrders,
          criticalIssues: 0, // Would come from separate endpoint
          totalRevenue,
        });
        setRecentOrders(recent);
      }

      // Fetch critical issues (mock for now)
      setCriticalIssues([
        {
          id: '1',
          type: 'unresponsive',
          vendorName: 'Vendor A',
          orderId: 'order_123',
          message: 'Vendor unresponsive for 20 minutes',
        },
      ]);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { variant: 'success' | 'danger' | 'warning' | 'info'; label: string }> = {
      CONFIRMED: { variant: 'success', label: 'Accepted' },
      PROCESSING: { variant: 'info', label: 'Active' },
      CANCELLED: { variant: 'danger', label: 'Suspended' },
    };

    const statusInfo = statusMap[status] || { variant: 'info' as const, label: status };
    return <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>;
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
              className="block px-4 py-2 bg-green-100 text-green-700 rounded-lg font-medium"
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
              href="/admin/earnings"
              className="block px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg"
            >
              Earnings
            </a>
            <a
              href="/admin/reports"
              className="block px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg"
            >
              Reports
            </a>
            <a
              href="/admin/users"
              className="block px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg"
            >
              User Management
            </a>
          </nav>
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-6">
          <h1 className="text-3xl font-bold mb-6">Dashboard</h1>

          {/* Key Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <Card>
              <h3 className="text-sm font-medium text-gray-600 mb-2">Active Orders</h3>
              <p className="text-3xl font-bold">{stats.activeOrders}</p>
            </Card>
            <Card>
              <h3 className="text-sm font-medium text-gray-600 mb-2">Critical Issues</h3>
              <p className="text-3xl font-bold text-red-600">{stats.criticalIssues}</p>
            </Card>
            <Card>
              <h3 className="text-sm font-medium text-gray-600 mb-2">Total Revenue</h3>
              <p className="text-3xl font-bold">${(stats.totalRevenue / 100).toFixed(2)}</p>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Recent Orders */}
            <Card>
              <h2 className="text-xl font-semibold mb-4">Recent Orders</h2>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-2">Date</th>
                      <th className="text-left py-2">Status</th>
                      <th className="text-left py-2">Amount</th>
                      <th className="text-left py-2">Expected Payout</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentOrders.map((order) => (
                      <tr key={order._id} className="border-b border-gray-100">
                        <td className="py-2">
                          {new Date(order.date).toLocaleDateString()}
                        </td>
                        <td className="py-2">{getStatusBadge(order.status)}</td>
                        <td className="py-2">${(order.amount / 100).toFixed(2)}</td>
                        <td className="py-2">
                          ${(order.expectedPayout / 100).toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>

            {/* Critical Issues */}
            <Card>
              <h2 className="text-xl font-semibold mb-4">Critical Issues</h2>
              <div className="space-y-3">
                {criticalIssues.length === 0 ? (
                  <p className="text-gray-500 text-sm">No critical issues</p>
                ) : (
                  criticalIssues.map((issue) => (
                    <div
                      key={issue.id}
                      className="p-3 bg-red-50 border border-red-200 rounded-lg"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <p className="font-semibold text-red-800">
                            Urgent! {issue.message}
                          </p>
                          <p className="text-sm text-red-600 mt-1">
                            {issue.vendorName} • Order #{issue.orderId.slice(-8)}
                          </p>
                        </div>
                        <Button size="sm" variant="danger">
                          View
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </Card>
          </div>
        </main>
      </div>
    </div>
  );
}
