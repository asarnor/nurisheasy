'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';

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
      // Mock data for now
      const mockIssues: CriticalIssue[] = [
        {
          id: '1',
          type: 'unresponsive',
          vendorName: 'Vendor A',
          orderId: 'order_123',
          message: 'Vendor unresponsive for 20 minutes',
          severity: 'critical',
        },
        {
          id: '2',
          type: 'unresponsive',
          vendorName: 'Vendor B',
          orderId: 'order_456',
          message: 'Vendor unresponsive for 15 minutes',
          severity: 'high',
        },
      ];
      setIssues(mockIssues);
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
    <div className="min-h-screen bg-gray-50">
      {/* Mobile Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="px-4 py-4">
          <h1 className="text-xl font-bold">Critical Issues</h1>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {loading ? (
          <div className="text-center py-12">
            <p className="text-gray-500">Loading issues...</p>
          </div>
        ) : issues.length === 0 ? (
          <Card className="text-center py-12">
            <p className="text-gray-500">No critical issues</p>
          </Card>
        ) : (
          <div className="space-y-4">
            {issues.map((issue) => (
              <Card
                key={issue.id}
                className={`${
                  issue.severity === 'critical'
                    ? 'border-2 border-red-500 bg-red-50'
                    : 'border border-yellow-300 bg-yellow-50'
                }`}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="font-semibold text-lg mb-2">
                      {issue.vendorName}
                    </h3>
                    <p className="text-gray-700 mb-2">{issue.message}</p>
                    <p className="text-sm text-gray-600">
                      Order ID: {issue.orderId.slice(-8)}
                    </p>
                  </div>
                  {issue.severity === 'critical' && (
                    <span className="px-2 py-1 bg-red-600 text-white text-xs font-bold rounded">
                      CRITICAL
                    </span>
                  )}
                </div>
                <div className="flex gap-2">
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
      </div>
    </div>
  );
}
