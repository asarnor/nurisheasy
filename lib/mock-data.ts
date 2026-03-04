export type MockRole = 'consumer' | 'vendor' | 'admin';

export interface MockOrganization {
  id: string;
  name: string;
  type: MockRole;
  safetyProfile?: {
    criticalAllergens: string[];
    preferences: string[];
    taxExempt: boolean;
  };
  address?: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
    coordinates?: {
      lat: number;
      lng: number;
    };
  };
  stripeAccountId?: string;
}

export interface MockMenuItem {
  id: string;
  vendorId: string;
  vendorName: string;
  name: string;
  description?: string;
  price: number;
  isAvailable: boolean;
  allergenTags: string[];
  ingredients: string[];
  imageUrl?: string;
  category?: string;
}

export interface MockOrderItem {
  menuItemId: string;
  name: string;
  quantity: number;
  price: number;
}

export interface MockSubOrder {
  vendorId: string;
  vendorName: string;
  status:
    | 'PENDING'
    | 'ACCEPTED'
    | 'PREPARING'
    | 'READY'
    | 'DELIVERED'
    | 'REFUNDED'
    | 'CANCELLED';
  items: MockOrderItem[];
  vendorTotal: number;
  acceptedAt?: string;
  estimatedReadyAt?: string;
}

export interface MockOrder {
  _id: string;
  status: 'PROCESSING' | 'CONFIRMED' | 'FULFILLED' | 'CANCELLED' | 'REFUNDED';
  paymentIntentId: string;
  totalAmount: number;
  platformFee: number;
  subOrders: MockSubOrder[];
  createdAt: string;
  consumerId: {
    _id: string;
    name: string;
  };
}

export interface MockIssue {
  id: string;
  type: string;
  vendorName: string;
  orderId: string;
  message: string;
  severity: 'high' | 'critical';
}

export interface MockUser {
  _id: string;
  name: string;
  type: 'consumer' | 'vendor';
  status: 'active' | 'suspended';
  lastLogin?: string;
}

export interface MockStore {
  organizations: {
    consumer: MockOrganization;
    vendors: MockOrganization[];
    admin: MockOrganization;
  };
  menuItems: MockMenuItem[];
  orders: MockOrder[];
  issues: MockIssue[];
  users: MockUser[];
}

export type MockOrganizationUpdates = Partial<
  Omit<MockOrganization, 'safetyProfile' | 'address'>
> & {
  safetyProfile?: Partial<NonNullable<MockOrganization['safetyProfile']>>;
  address?: Partial<NonNullable<MockOrganization['address']>>;
};

const sumItems = (items: MockOrderItem[]) =>
  items.reduce((total, item) => total + item.price * item.quantity, 0);

const withTotal = (items: MockOrderItem[]) => ({
  items,
  vendorTotal: sumItems(items),
});

const createMockStore = (): MockStore => {
  const vendors: MockOrganization[] = [
    {
      id: 'vendor_harbor',
      name: 'Harbor Bistro',
      type: 'vendor',
      address: {
        street: '420 Pier Ave',
        city: 'Redwood City',
        state: 'CA',
        zipCode: '94063',
        coordinates: { lat: 37.4889, lng: -122.2317 },
      },
      stripeAccountId: 'acct_mock_harbor',
    },
    {
      id: 'vendor_cedar',
      name: 'Cedar & Spice',
      type: 'vendor',
      address: {
        street: '88 Orchard Rd',
        city: 'Sunnyvale',
        state: 'CA',
        zipCode: '94086',
        coordinates: { lat: 37.3688, lng: -122.0363 },
      },
      stripeAccountId: 'acct_mock_cedar',
    },
  ];

  const consumer: MockOrganization = {
    id: 'consumer_sunnyvale',
    name: 'Sunnyvale Care',
    type: 'consumer',
    safetyProfile: {
      criticalAllergens: ['PEANUT'],
      preferences: ['LOW_SODIUM', 'VEGETARIAN'],
      taxExempt: true,
    },
    address: {
      street: '1100 Care Way',
      city: 'Sunnyvale',
      state: 'CA',
      zipCode: '94085',
      coordinates: { lat: 37.3753, lng: -122.0331 },
    },
  };

  const admin: MockOrganization = {
    id: 'admin_safeplate',
    name: 'SafePlate Admin',
    type: 'admin',
  };

  const menuItems: MockMenuItem[] = [
    {
      id: 'menu_harbor_1',
      vendorId: vendors[0].id,
      vendorName: vendors[0].name,
      name: 'Herb Roasted Chicken Bowl',
      description: 'Roasted chicken, barley, lemon greens, and garlic oil.',
      price: 1299,
      isAvailable: true,
      allergenTags: ['DAIRY'],
      ingredients: ['chicken', 'barley', 'lemon', 'greens', 'garlic'],
      category: 'Bowls',
    },
    {
      id: 'menu_harbor_2',
      vendorId: vendors[0].id,
      vendorName: vendors[0].name,
      name: 'Sunset Veggie Stew',
      description: 'Slow-simmered vegetables with smoked paprika.',
      price: 1099,
      isAvailable: true,
      allergenTags: [],
      ingredients: ['carrot', 'tomato', 'pepper', 'beans'],
      category: 'Stews',
    },
    {
      id: 'menu_harbor_3',
      vendorId: vendors[0].id,
      vendorName: vendors[0].name,
      name: 'Citrus Quinoa Salad',
      description: 'Orange vinaigrette, quinoa, cucumber, and herbs.',
      price: 899,
      isAvailable: true,
      allergenTags: ['WHEAT'],
      ingredients: ['quinoa', 'orange', 'cucumber', 'mint'],
      category: 'Salads',
    },
    {
      id: 'menu_harbor_4',
      vendorId: vendors[0].id,
      vendorName: vendors[0].name,
      name: 'Roasted Sweet Potato Mash',
      description: 'Whipped sweet potato with rosemary.',
      price: 699,
      isAvailable: true,
      allergenTags: [],
      ingredients: ['sweet potato', 'rosemary', 'olive oil'],
      category: 'Sides',
    },
    {
      id: 'menu_cedar_1',
      vendorId: vendors[1].id,
      vendorName: vendors[1].name,
      name: 'Ginger Salmon Bento',
      description: 'Ginger glazed salmon, jasmine rice, sesame greens.',
      price: 1499,
      isAvailable: true,
      allergenTags: ['FISH', 'SESAME'],
      ingredients: ['salmon', 'ginger', 'rice', 'bok choy'],
      category: 'Bento',
    },
    {
      id: 'menu_cedar_2',
      vendorId: vendors[1].id,
      vendorName: vendors[1].name,
      name: 'Turmeric Lentil Soup',
      description: 'Golden lentil soup with coconut milk.',
      price: 999,
      isAvailable: true,
      allergenTags: ['DAIRY'],
      ingredients: ['lentils', 'turmeric', 'coconut milk'],
      category: 'Soups',
    },
    {
      id: 'menu_cedar_3',
      vendorId: vendors[1].id,
      vendorName: vendors[1].name,
      name: 'Market Green Wrap',
      description: 'Spinach wrap with roasted veggies and tahini.',
      price: 899,
      isAvailable: true,
      allergenTags: ['SESAME'],
      ingredients: ['spinach wrap', 'zucchini', 'tahini'],
      category: 'Wraps',
    },
    {
      id: 'menu_cedar_4',
      vendorId: vendors[1].id,
      vendorName: vendors[1].name,
      name: 'Cedar Citrus Rice',
      description: 'Citrus-scented rice with herbs.',
      price: 599,
      isAvailable: true,
      allergenTags: ['SOY'],
      ingredients: ['rice', 'lemon', 'parsley'],
      category: 'Sides',
    },
  ];

  const now = Date.now();

  const order1SubA = withTotal([
    { menuItemId: menuItems[0].id, name: menuItems[0].name, quantity: 2, price: menuItems[0].price },
    { menuItemId: menuItems[3].id, name: menuItems[3].name, quantity: 1, price: menuItems[3].price },
  ]);
  const order1SubB = withTotal([
    { menuItemId: menuItems[4].id, name: menuItems[4].name, quantity: 1, price: menuItems[4].price },
  ]);

  const order2SubA = withTotal([
    { menuItemId: menuItems[1].id, name: menuItems[1].name, quantity: 3, price: menuItems[1].price },
  ]);
  const order2SubB = withTotal([
    { menuItemId: menuItems[5].id, name: menuItems[5].name, quantity: 2, price: menuItems[5].price },
    { menuItemId: menuItems[7].id, name: menuItems[7].name, quantity: 2, price: menuItems[7].price },
  ]);

  const order3SubA = withTotal([
    { menuItemId: menuItems[2].id, name: menuItems[2].name, quantity: 2, price: menuItems[2].price },
  ]);
  const order3SubB = withTotal([
    { menuItemId: menuItems[6].id, name: menuItems[6].name, quantity: 3, price: menuItems[6].price },
  ]);

  const order4SubA = withTotal([
    { menuItemId: menuItems[0].id, name: menuItems[0].name, quantity: 1, price: menuItems[0].price },
  ]);
  const order4SubB = withTotal([
    { menuItemId: menuItems[4].id, name: menuItems[4].name, quantity: 1, price: menuItems[4].price },
  ]);

  const order5SubA = withTotal([
    { menuItemId: menuItems[1].id, name: menuItems[1].name, quantity: 1, price: menuItems[1].price },
  ]);

  const orders: MockOrder[] = [
    {
      _id: 'order_mock_1001',
      status: 'PROCESSING',
      paymentIntentId: 'pi_mock_1001',
      totalAmount: order1SubA.vendorTotal + order1SubB.vendorTotal,
      platformFee: Math.round((order1SubA.vendorTotal + order1SubB.vendorTotal) * 0.1),
      createdAt: new Date(now - 1000 * 60 * 35).toISOString(),
      consumerId: { _id: consumer.id, name: consumer.name },
      subOrders: [
        {
          vendorId: vendors[0].id,
          vendorName: vendors[0].name,
          status: 'PENDING',
          items: order1SubA.items,
          vendorTotal: order1SubA.vendorTotal,
        },
        {
          vendorId: vendors[1].id,
          vendorName: vendors[1].name,
          status: 'ACCEPTED',
          items: order1SubB.items,
          vendorTotal: order1SubB.vendorTotal,
          acceptedAt: new Date(now - 1000 * 60 * 20).toISOString(),
        },
      ],
    },
    {
      _id: 'order_mock_1002',
      status: 'CONFIRMED',
      paymentIntentId: 'pi_mock_1002',
      totalAmount: order2SubA.vendorTotal + order2SubB.vendorTotal,
      platformFee: Math.round((order2SubA.vendorTotal + order2SubB.vendorTotal) * 0.1),
      createdAt: new Date(now - 1000 * 60 * 120).toISOString(),
      consumerId: { _id: consumer.id, name: consumer.name },
      subOrders: [
        {
          vendorId: vendors[0].id,
          vendorName: vendors[0].name,
          status: 'PREPARING',
          items: order2SubA.items,
          vendorTotal: order2SubA.vendorTotal,
          acceptedAt: new Date(now - 1000 * 60 * 100).toISOString(),
        },
        {
          vendorId: vendors[1].id,
          vendorName: vendors[1].name,
          status: 'READY',
          items: order2SubB.items,
          vendorTotal: order2SubB.vendorTotal,
          acceptedAt: new Date(now - 1000 * 60 * 95).toISOString(),
          estimatedReadyAt: new Date(now - 1000 * 60 * 10).toISOString(),
        },
      ],
    },
    {
      _id: 'order_mock_1003',
      status: 'CONFIRMED',
      paymentIntentId: 'pi_mock_1003',
      totalAmount: order3SubA.vendorTotal + order3SubB.vendorTotal,
      platformFee: Math.round((order3SubA.vendorTotal + order3SubB.vendorTotal) * 0.1),
      createdAt: new Date(now - 1000 * 60 * 260).toISOString(),
      consumerId: { _id: consumer.id, name: consumer.name },
      subOrders: [
        {
          vendorId: vendors[0].id,
          vendorName: vendors[0].name,
          status: 'READY',
          items: order3SubA.items,
          vendorTotal: order3SubA.vendorTotal,
          acceptedAt: new Date(now - 1000 * 60 * 210).toISOString(),
          estimatedReadyAt: new Date(now - 1000 * 60 * 5).toISOString(),
        },
        {
          vendorId: vendors[1].id,
          vendorName: vendors[1].name,
          status: 'ACCEPTED',
          items: order3SubB.items,
          vendorTotal: order3SubB.vendorTotal,
          acceptedAt: new Date(now - 1000 * 60 * 200).toISOString(),
        },
      ],
    },
    {
      _id: 'order_mock_1004',
      status: 'FULFILLED',
      paymentIntentId: 'pi_mock_1004',
      totalAmount: order4SubA.vendorTotal + order4SubB.vendorTotal,
      platformFee: Math.round((order4SubA.vendorTotal + order4SubB.vendorTotal) * 0.1),
      createdAt: new Date(now - 1000 * 60 * 900).toISOString(),
      consumerId: { _id: consumer.id, name: consumer.name },
      subOrders: [
        {
          vendorId: vendors[0].id,
          vendorName: vendors[0].name,
          status: 'DELIVERED',
          items: order4SubA.items,
          vendorTotal: order4SubA.vendorTotal,
          acceptedAt: new Date(now - 1000 * 60 * 860).toISOString(),
        },
        {
          vendorId: vendors[1].id,
          vendorName: vendors[1].name,
          status: 'DELIVERED',
          items: order4SubB.items,
          vendorTotal: order4SubB.vendorTotal,
          acceptedAt: new Date(now - 1000 * 60 * 850).toISOString(),
        },
      ],
    },
    {
      _id: 'order_mock_1005',
      status: 'REFUNDED',
      paymentIntentId: 'pi_mock_1005',
      totalAmount: order5SubA.vendorTotal,
      platformFee: Math.round(order5SubA.vendorTotal * 0.1),
      createdAt: new Date(now - 1000 * 60 * 1440).toISOString(),
      consumerId: { _id: consumer.id, name: consumer.name },
      subOrders: [
        {
          vendorId: vendors[0].id,
          vendorName: vendors[0].name,
          status: 'REFUNDED',
          items: order5SubA.items,
          vendorTotal: order5SubA.vendorTotal,
          acceptedAt: new Date(now - 1000 * 60 * 1400).toISOString(),
        },
      ],
    },
  ];

  const issues: MockIssue[] = [
    {
      id: 'issue_1',
      type: 'unresponsive',
      vendorName: vendors[0].name,
      orderId: orders[0]._id,
      message: 'Vendor unresponsive for 18 minutes',
      severity: 'critical',
    },
    {
      id: 'issue_2',
      type: 'late_delivery',
      vendorName: vendors[1].name,
      orderId: orders[2]._id,
      message: 'Order running 12 minutes behind schedule',
      severity: 'high',
    },
  ];

  const users: MockUser[] = [
    {
      _id: 'user_consumer_1',
      name: consumer.name,
      type: 'consumer',
      status: 'active',
      lastLogin: new Date(now - 1000 * 60 * 40).toISOString(),
    },
    {
      _id: 'user_vendor_1',
      name: vendors[0].name,
      type: 'vendor',
      status: 'active',
      lastLogin: new Date(now - 1000 * 60 * 55).toISOString(),
    },
    {
      _id: 'user_vendor_2',
      name: vendors[1].name,
      type: 'vendor',
      status: 'active',
      lastLogin: new Date(now - 1000 * 60 * 95).toISOString(),
    },
    {
      _id: 'user_consumer_2',
      name: 'Maple Grove Living',
      type: 'consumer',
      status: 'suspended',
      lastLogin: new Date(now - 1000 * 60 * 360).toISOString(),
    },
  ];

  return {
    organizations: {
      consumer,
      vendors,
      admin,
    },
    menuItems,
    orders,
    issues,
    users,
  };
};

declare global {
  // eslint-disable-next-line no-var
  var __SAFEPLATE_MOCK_STORE__: MockStore | undefined;
}

export const getMockStore = () => {
  if (!globalThis.__SAFEPLATE_MOCK_STORE__) {
    globalThis.__SAFEPLATE_MOCK_STORE__ = createMockStore();
  }
  return globalThis.__SAFEPLATE_MOCK_STORE__;
};

export const resetMockStore = () => {
  globalThis.__SAFEPLATE_MOCK_STORE__ = createMockStore();
};

export const getMockVendorId = (preferredId?: string) => {
  const store = getMockStore();
  if (preferredId) {
    const match = store.organizations.vendors.find((vendor) => vendor.id === preferredId);
    if (match) return match.id;
  }
  return store.organizations.vendors[0].id;
};

export const getMockMenuItems = (role: MockRole, vendorParam?: string) => {
  const store = getMockStore();
  const isCurrentVendor = vendorParam === 'current' || !vendorParam;
  if (role === 'vendor') {
    const vendorId = getMockVendorId(isCurrentVendor ? undefined : vendorParam || undefined);
    return store.menuItems.filter((item) => item.vendorId === vendorId);
  }

  let items = store.menuItems.filter((item) => item.isAvailable);
  if (vendorParam && vendorParam !== 'current') {
    items = items.filter((item) => item.vendorId === vendorParam);
  }
  return items;
};

export const createMockMenuItem = (vendorId: string, payload: Partial<MockMenuItem>) => {
  const store = getMockStore();
  const vendor = store.organizations.vendors.find((item) => item.id === vendorId);
  if (!vendor) return null;

  const newItem: MockMenuItem = {
    id: `menu_mock_${Date.now()}`,
    vendorId: vendor.id,
    vendorName: vendor.name,
    name: payload.name || 'New Menu Item',
    description: payload.description || '',
    price: payload.price || 0,
    isAvailable: payload.isAvailable ?? true,
    allergenTags: payload.allergenTags || [],
    ingredients: payload.ingredients || [],
    imageUrl: payload.imageUrl,
    category: payload.category,
  };

  store.menuItems.unshift(newItem);
  return newItem;
};

export const updateMockMenuItem = (menuId: string, payload: Partial<MockMenuItem>) => {
  const store = getMockStore();
  const item = store.menuItems.find((entry) => entry.id === menuId);
  if (!item) return null;

  Object.assign(item, payload);
  return item;
};

export const deleteMockMenuItem = (menuId: string) => {
  const store = getMockStore();
  const initialLength = store.menuItems.length;
  store.menuItems = store.menuItems.filter((entry) => entry.id !== menuId);
  return store.menuItems.length !== initialLength;
};

export const getMockOrders = (role: MockRole, options?: { orderId?: string; vendorId?: string }) => {
  const store = getMockStore();
  let orders = [...store.orders];

  if (role === 'consumer') {
    orders = orders.filter((order) => order.consumerId._id === store.organizations.consumer.id);
  }

  if (role === 'vendor') {
    const vendorId = getMockVendorId(options?.vendorId);
    orders = orders.filter((order) =>
      order.subOrders.some((subOrder) => subOrder.vendorId === vendorId)
    );
  }

  if (options?.orderId) {
    orders = orders.filter((order) => order._id === options.orderId);
  }

  return orders;
};

export const createMockOrder = (items: { menuItemId: string; quantity: number }[]) => {
  const store = getMockStore();
  const menuItems = items
    .map((entry) => {
      const menuItem = store.menuItems.find((item) => item.id === entry.menuItemId);
      if (!menuItem) return null;
      return {
        menuItem,
        quantity: entry.quantity,
      };
    })
    .filter(Boolean) as Array<{ menuItem: MockMenuItem; quantity: number }>;

  if (menuItems.length === 0) {
    return null;
  }

  const vendorGroups = new Map<string, MockOrderItem[]>();
  menuItems.forEach(({ menuItem, quantity }) => {
    const group = vendorGroups.get(menuItem.vendorId) || [];
    group.push({
      menuItemId: menuItem.id,
      name: menuItem.name,
      quantity,
      price: menuItem.price,
    });
    vendorGroups.set(menuItem.vendorId, group);
  });

  const subOrders: MockSubOrder[] = [];
  let totalAmount = 0;

  vendorGroups.forEach((groupItems, vendorId) => {
    const vendor = store.organizations.vendors.find((entry) => entry.id === vendorId);
    const vendorTotal = sumItems(groupItems);
    totalAmount += vendorTotal;
    subOrders.push({
      vendorId,
      vendorName: vendor?.name || 'Vendor',
      status: 'PENDING',
      items: groupItems,
      vendorTotal,
    });
  });

  const order: MockOrder = {
    _id: `order_mock_${Date.now()}`,
    status: 'PROCESSING',
    paymentIntentId: `pi_mock_${Date.now()}`,
    totalAmount,
    platformFee: Math.round(totalAmount * 0.1),
    createdAt: new Date().toISOString(),
    consumerId: {
      _id: store.organizations.consumer.id,
      name: store.organizations.consumer.name,
    },
    subOrders,
  };

  store.orders.unshift(order);
  return order;
};

const updateOrderStatusFromSubOrders = (order: MockOrder) => {
  if (order.subOrders.every((subOrder) => subOrder.status === 'DELIVERED')) {
    order.status = 'FULFILLED';
    return;
  }

  if (order.subOrders.some((subOrder) => subOrder.status === 'REFUNDED')) {
    order.status = 'REFUNDED';
    return;
  }

  if (order.subOrders.some((subOrder) => subOrder.status === 'CANCELLED')) {
    order.status = 'CANCELLED';
    return;
  }

  if (order.subOrders.every((subOrder) => subOrder.status !== 'PENDING')) {
    order.status = 'CONFIRMED';
    return;
  }

  order.status = 'PROCESSING';
};

export const acceptMockSubOrder = (orderId: string, vendorId: string) => {
  const store = getMockStore();
  const order = store.orders.find((entry) => entry._id === orderId);
  if (!order) return null;

  const subOrder = order.subOrders.find((entry) => entry.vendorId === vendorId);
  if (!subOrder) return null;

  if (subOrder.status !== 'PENDING') {
    return order;
  }

  subOrder.status = 'ACCEPTED';
  subOrder.acceptedAt = new Date().toISOString();

  updateOrderStatusFromSubOrders(order);
  return order;
};

export const updateMockSubOrderStatus = (
  orderId: string,
  vendorId: string,
  status: MockSubOrder['status']
) => {
  const store = getMockStore();
  const order = store.orders.find((entry) => entry._id === orderId);
  if (!order) return null;

  const subOrder = order.subOrders.find((entry) => entry.vendorId === vendorId);
  if (!subOrder) return null;

  subOrder.status = status;
  if (status === 'ACCEPTED' || status === 'PREPARING') {
    subOrder.acceptedAt = subOrder.acceptedAt || new Date().toISOString();
  }
  if (status === 'READY') {
    subOrder.estimatedReadyAt = new Date().toISOString();
  }

  updateOrderStatusFromSubOrders(order);
  return order;
};

export const refundMockSubOrder = (orderId: string, subOrderIndex: number) => {
  const store = getMockStore();
  const order = store.orders.find((entry) => entry._id === orderId);
  if (!order || subOrderIndex < 0 || subOrderIndex >= order.subOrders.length) {
    return null;
  }

  order.subOrders[subOrderIndex].status = 'REFUNDED';
  updateOrderStatusFromSubOrders(order);
  return order;
};

export const getMockOrganization = (role: MockRole, vendorId?: string) => {
  const store = getMockStore();
  if (role === 'vendor') {
    const id = getMockVendorId(vendorId);
    return store.organizations.vendors.find((entry) => entry.id === id) || store.organizations.vendors[0];
  }
  if (role === 'admin') {
    return store.organizations.admin;
  }
  return store.organizations.consumer;
};

export const updateMockOrganization = (
  role: MockRole,
  updates: MockOrganizationUpdates,
  vendorId?: string
) => {
  const organization = getMockOrganization(role, vendorId);
  if (!organization) return null;

  const { safetyProfile, address, ...baseUpdates } = updates;
  Object.assign(organization, baseUpdates);

  if (safetyProfile) {
    organization.safetyProfile = {
      criticalAllergens: organization.safetyProfile?.criticalAllergens || [],
      preferences: organization.safetyProfile?.preferences || [],
      taxExempt: organization.safetyProfile?.taxExempt || false,
      ...safetyProfile,
    };
  }

  if (address) {
    organization.address = {
      street: organization.address?.street || '',
      city: organization.address?.city || '',
      state: organization.address?.state || '',
      zipCode: organization.address?.zipCode || '',
      coordinates: organization.address?.coordinates,
      ...address,
    };
  }

  return organization;
};
