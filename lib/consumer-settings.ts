import {
  DEFAULT_CONTRACT_OPTIONS,
  type OrderContractOptions,
} from '@/lib/contract-options';

export interface ConsumerSettings {
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  defaultContractOptions: OrderContractOptions;
  notifyOrderUpdates: boolean;
  notifyDeliveryReminders: boolean;
  notifyContractRenewal: boolean;
  notifyReviewReminders: boolean;
  notifyMarketing: boolean;
  notificationQuietHoursStart: string;
  notificationQuietHoursEnd: string;
  orderingStepAcknowledged?: boolean;
}

export const DEFAULT_CONSUMER_SETTINGS: ConsumerSettings = {
  contactName: '',
  contactEmail: '',
  contactPhone: '',
  defaultContractOptions: DEFAULT_CONTRACT_OPTIONS,
  notifyOrderUpdates: true,
  notifyDeliveryReminders: true,
  notifyContractRenewal: true,
  notifyReviewReminders: true,
  notifyMarketing: false,
  notificationQuietHoursStart: '22:00',
  notificationQuietHoursEnd: '07:00',
};

export const mergeConsumerSettings = (
  partial?: Partial<ConsumerSettings> | null
): ConsumerSettings => ({
  ...DEFAULT_CONSUMER_SETTINGS,
  ...partial,
  defaultContractOptions: {
    ...DEFAULT_CONSUMER_SETTINGS.defaultContractOptions,
    ...partial?.defaultContractOptions,
    mealPeriods: partial?.defaultContractOptions?.mealPeriods?.length
      ? partial.defaultContractOptions.mealPeriods
      : DEFAULT_CONSUMER_SETTINGS.defaultContractOptions.mealPeriods,
  },
});
