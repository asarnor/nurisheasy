'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { AdminShell } from '@/components/layout/AdminShell';
import { getMockStore } from '@/lib/mock-data';

interface CriticalIssue {
  id: string;
  type: string;
  vendorName: string;
  orderId: string;
  message: string;
  severity: 'high' | 'critical';
}

export default function TriagePage() {
  const router = useRouter();
  const [issues, setIssues] = useState<CriticalIssue[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchIssues();
    // Poll for new issues every 10 seconds
    const interval = setInterval(fetchIssues, 10000);
    return () => clearInterval(interval);
  }, []);

  const fetchIssues = async () => {
    try {
      // This would fetch from an admin API endpoint
      setIssues(getMockStore().issues);
    } catch (error) {
      console.error('Error fetching issues:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCallVendor = async (vendorName: string) => {
    // Trigger Twilio call
    try {
      // This would call an API endpoint to trigger Twilio call
      alert(`Calling ${vendorName}...`);
    } catch (error) {
      console.error('Error calling vendor:', error);
    }
  };

  const handleMarkCritical = (issueId: string) => {
    setIssues((prev) =>
      prev.map((issue) =>
        issue.id === issueId
          ? { ...issue, severity: 'critical' as const }
          : issue
      )
    );
  };

  return (
    <AdminShell
      title="Critical Issues"
      subtitle="Escalate vendor alerts and resolve time-sensitive disputes."
      active="triage"
    >
      {loading ? (
        <div className="text-center py-12">
          <p className="text-slate-500">Loading issues...</p>
        </div>
      ) : issues.length === 0 ? (
        <Card className="text-center py-12">
          <p className="text-slate-500">No critical issues</p>
        </Card>
      ) : (
        <div className="space-y-4">
          {issues.map((issue) => (
            <Card
              key={issue.id}
              className={`${
                issue.severity === 'critical'
                  ? 'border-2 border-rose-400/70 bg-rose-50'
                  : 'border border-amber-300/70 bg-amber-50'
              }`}
            >
              <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 mb-4">
                <div className="flex-1">
                  <h3 className="font-semibold text-lg mb-2 text-slate-900">
                    {issue.vendorName}
                  </h3>
                  <p className="text-slate-700 mb-2">{issue.message}</p>
                  <p className="text-sm text-slate-500">
                    Order ID: {issue.orderId.slice(-8)}
                  </p>
                </div>
                {issue.severity === 'critical' && (
                  <span className="px-3 py-1 bg-rose-600 text-white text-xs font-bold rounded-full">
                    CRITICAL
                  </span>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  onClick={() => handleCallVendor(issue.vendorName)}
                  className="flex-1"
                  variant="primary"
                >
                  Call Vendor
                </Button>
                {issue.severity !== 'critical' && (
                  <Button
                    onClick={() => handleMarkCritical(issue.id)}
                    variant="danger"
                    className="flex-1"
                  >
                    Mark Critical
                  </Button>
                )}
                <Button
                  onClick={() => router.push(`/admin/disputes/${issue.orderId}`)}
                  variant="outline"
                >
                  View Order
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </AdminShell>
  );
}
