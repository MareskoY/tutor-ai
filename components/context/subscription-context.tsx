import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  type ReactNode,
} from 'react';

export interface Subscription {
  id: string;
  userId: string;
  provider: string;
  customerId: string;
  subscriptionId: string;
  plan: 'free' | 'pro';
  status: 'active' | 'past_due' | 'canceled' | 'incomplete';
  currentPeriodEnd?: string | null; // ISO date string или null
  createdAt: string;
  updatedAt: string;
}

interface SubscriptionContextType {
  subscription: Subscription | null;
  refreshSubscription: () => void;
}

const SubscriptionContext = createContext<SubscriptionContextType | undefined>(
  undefined,
);

export const SubscriptionProvider = ({ children }: { children: ReactNode }) => {
  const [subscription, setSubscription] = useState<Subscription | null>(null);

  const fetchSubscription = async () => {
    try {
      const res = await fetch('/api/subscription');
      const data = await res.json();
      setSubscription(data.subscription);
    } catch (error) {
      console.error('Ошибка получения подписки', error);
    }
  };

  useEffect(() => {
    fetchSubscription();
  }, []);

  const refreshSubscription = () => {
    fetchSubscription();
  };

  return (
    <SubscriptionContext.Provider value={{ subscription, refreshSubscription }}>
      {children}
    </SubscriptionContext.Provider>
  );
};

export const useSubscription = () => {
  const context = useContext(SubscriptionContext);
  if (!context) {
    throw new Error(
      'useSubscription must be used within a SubscriptionProvider',
    );
  }
  return context;
};
