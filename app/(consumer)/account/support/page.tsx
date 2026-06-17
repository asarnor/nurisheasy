'use client';

import { Card } from '@/components/ui/Card';
import { ConsumerAccountShell } from '@/components/layout/ConsumerAccountShell';

const FAQ = [
  {
    q: 'How do I update dietary restrictions for residents?',
    a: 'Go to Profile and toggle critical allergens and preferences. These apply across the marketplace immediately.',
  },
  {
    q: 'When can I review a vendor?',
    a: 'After a sub-order is marked delivered, open the order detail page and submit a rating for that vendor.',
  },
  {
    q: 'How do food service contracts work?',
    a: 'Choose contract length, weekly prep day, meals, and pickup or delivery at checkout. View active contracts under Subscription.',
  },
  {
    q: 'Who do I contact about a billing issue?',
    a: 'Email support@safeplate.example or call (512) 555-0100 weekdays 8 AM – 6 PM CT.',
  },
];

export default function AccountSupportPage() {
  return (
    <ConsumerAccountShell
      active="support"
      title="Help & support"
      subtitle="Answers to common questions and ways to reach SafePlate."
    >
      <div className="space-y-6">
        <Card>
          <h2 className="text-lg font-semibold mb-3">Contact us</h2>
          <dl className="space-y-3 text-sm">
            <div>
              <dt className="text-slate-500">Email</dt>
              <dd className="font-medium text-slate-900">support@safeplate.example</dd>
            </div>
            <div>
              <dt className="text-slate-500">Phone</dt>
              <dd className="font-medium text-slate-900">(512) 555-0100</dd>
            </div>
            <div>
              <dt className="text-slate-500">Hours</dt>
              <dd className="font-medium text-slate-900">Mon–Fri, 8 AM – 6 PM CT</dd>
            </div>
          </dl>
        </Card>

        <Card>
          <h2 className="text-lg font-semibold mb-4">Frequently asked questions</h2>
          <div className="space-y-4">
            {FAQ.map((item) => (
              <div key={item.q} className="border-b border-slate-100 pb-4 last:border-0 last:pb-0">
                <p className="font-semibold text-slate-900">{item.q}</p>
                <p className="text-sm text-slate-600 mt-1">{item.a}</p>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </ConsumerAccountShell>
  );
}
