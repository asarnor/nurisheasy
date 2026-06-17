export type ConsumerAccountNavId =
  | 'profile'
  | 'settings'
  | 'subscription'
  | 'orders'
  | 'order-settings'
  | 'payments'
  | 'notifications'
  | 'reviews'
  | 'support';

export const CONSUMER_ACCOUNT_NAV: {
  id: ConsumerAccountNavId;
  label: string;
  shortLabel: string;
  href: string;
  icon: string;
  description: string;
}[] = [
  {
    id: 'profile',
    label: 'Profile',
    shortLabel: 'Profile',
    href: '/account/profile',
    icon: '👤',
    description: 'Facility info, dietary restrictions, and delivery address',
  },
  {
    id: 'settings',
    label: 'Account settings',
    shortLabel: 'Account',
    href: '/account/settings',
    icon: '🔐',
    description: 'Sign-in, password, and personal account details',
  },
  {
    id: 'subscription',
    label: 'Subscription',
    shortLabel: 'Plans',
    href: '/account/subscription',
    icon: '📋',
    description: 'Active food service contracts and renewal dates',
  },
  {
    id: 'orders',
    label: 'Order history',
    shortLabel: 'Orders',
    href: '/account/orders',
    icon: '📦',
    description: 'Past and in-progress orders from your vendors',
  },
  {
    id: 'order-settings',
    label: 'Order settings',
    shortLabel: 'Defaults',
    href: '/account/order-settings',
    icon: '⚙️',
    description: 'Default contract terms and weekly schedule preferences',
  },
  {
    id: 'payments',
    label: 'Payments',
    shortLabel: 'Pay',
    href: '/account/payments',
    icon: '💳',
    description: 'Payment methods and billing history',
  },
  {
    id: 'notifications',
    label: 'Notifications',
    shortLabel: 'Alerts',
    href: '/account/notifications',
    icon: '🔔',
    description: 'Email and SMS alerts for orders and contracts',
  },
  {
    id: 'reviews',
    label: 'Reviews',
    shortLabel: 'Reviews',
    href: '/account/reviews',
    icon: '⭐',
    description: 'Ratings you have submitted for vendors',
  },
  {
    id: 'support',
    label: 'Help & support',
    shortLabel: 'Help',
    href: '/account/support',
    icon: '💬',
    description: 'Contact SafePlate and browse common questions',
  },
];
