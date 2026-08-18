'use client';

import {createContext, useContext, useEffect, useState} from 'react';
import type {
  ActionItem,
  Article,
  OperationsData,
  Partner,
  PlannedActivity,
  Shipment,
  StockMovement,
} from '@/types/operations';
import {createDemoOperations, seedOperations} from '@/data/operations';

type Context = {
  data: OperationsData;
  ready: boolean;
  saveActivity: (value: PlannedActivity) => void;
  deleteActivity: (id: string) => void;
  saveAction: (value: ActionItem) => void;
  deleteAction: (id: string) => void;
  saveMovement: (value: StockMovement) => void;
  savePartner: (value: Partner) => void;
  saveArticle: (value: Article) => void;
  saveShipment: (value: Shipment) => void;
  deleteShipment: (id: string) => void;
  loadDemoData: () => void;
  clearDemoData: () => void;
  reset: () => void;
};

const OperationsContext = createContext<Context | null>(null);
const STORAGE_KEY = 'inco-source-operations-v7';
const LEGACY_STORAGE_KEYS = ['inco-source-operations-v6', 'inco-source-operations-v5', 'inco-source-operations-v4', 'inco-source-operations-v3', 'inco-source-operations-v2'];

const upsert = <T extends {id: string}>(items: T[], value: T) =>
  items.some((item) => item.id === value.id)
    ? items.map((item) => (item.id === value.id ? value : item))
    : [...items, value];

function migrateData(value: unknown): OperationsData {
  if (!value || typeof value !== 'object') return seedOperations;
  const raw = value as Partial<OperationsData>;
  return {
    activities: Array.isArray(raw.activities) ? raw.activities : [],
    actions: Array.isArray(raw.actions) ? raw.actions : [],
    articles: Array.isArray(raw.articles) ? raw.articles : [],
    locations: Array.isArray(raw.locations) && raw.locations.length ? raw.locations : seedOperations.locations,
    movements: Array.isArray(raw.movements) ? raw.movements : [],
    partners: Array.isArray(raw.partners) ? raw.partners : [],
    shipments: Array.isArray(raw.shipments) ? raw.shipments : [],
    orderChecks: Array.isArray(raw.orderChecks) ? raw.orderChecks : [],
  };
}

function mergeDemoData(current: OperationsData): OperationsData {
  const demo = createDemoOperations();
  return {
    activities: demo.activities.reduce((items, value) => upsert(items, value), current.activities),
    actions: demo.actions.reduce((items, value) => upsert(items, value), current.actions),
    articles: demo.articles.reduce((items, value) => upsert(items, value), current.articles),
    locations: demo.locations.reduce((items, value) => upsert(items, value), current.locations),
    movements: demo.movements.reduce((items, value) => upsert(items, value), current.movements),
    partners: demo.partners.reduce((items, value) => upsert(items, value), current.partners),
    shipments: demo.shipments.reduce((items, value) => upsert(items, value), current.shipments),
    orderChecks: demo.orderChecks.reduce((items, value) => upsert(items, value), current.orderChecks),
  };
}

const isDemoRecord = (value: {id: string}) => value.id.startsWith('demo-');

export function OperationsProvider({children}: {children: React.ReactNode}) {
  const [data, setData] = useState<OperationsData>(seedOperations);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        setData(migrateData(JSON.parse(saved)));
      } else {
        const legacy = LEGACY_STORAGE_KEYS.map((key) => localStorage.getItem(key)).find(Boolean);
        setData(mergeDemoData(legacy ? migrateData(JSON.parse(legacy)) : seedOperations));
      }
    } catch {
      setData(seedOperations);
    } finally {
      setReady(true);
    }
  }, []);

  useEffect(() => {
    if (ready) localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }, [data, ready]);

  return (
    <OperationsContext.Provider
      value={{
        data,
        ready,
        saveActivity: (value) => setData((current) => ({...current, activities: upsert(current.activities, value)})),
        deleteActivity: (id) =>
          setData((current) => ({...current, activities: current.activities.filter((item) => item.id !== id)})),
        saveAction: (value) => setData((current) => ({...current, actions: upsert(current.actions, value)})),
        deleteAction: (id) =>
          setData((current) => ({...current, actions: current.actions.filter((item) => item.id !== id)})),
        saveMovement: (value) => setData((current) => ({...current, movements: upsert(current.movements, value)})),
        savePartner: (value) => setData((current) => ({...current, partners: upsert(current.partners, value)})),
        saveArticle: (value) => setData((current) => ({...current, articles: upsert(current.articles, value)})),
        saveShipment: (value) => setData((current) => ({...current, shipments: upsert(current.shipments, value)})),
        deleteShipment: (id) =>
          setData((current) => ({...current, shipments: current.shipments.filter((item) => item.id !== id)})),
        loadDemoData: () => setData(mergeDemoData),
        clearDemoData: () =>
          setData((current) => ({
            activities: current.activities.filter((item) => !isDemoRecord(item)),
            actions: current.actions.filter((item) => !isDemoRecord(item)),
            articles: current.articles.filter((item) => !isDemoRecord(item)),
            locations: current.locations.filter((item) => !isDemoRecord(item)),
            movements: current.movements.filter((item) => !isDemoRecord(item)),
            partners: current.partners.filter((item) => !isDemoRecord(item)),
            shipments: current.shipments.filter((item) => item.source.system !== 'demo' && !isDemoRecord(item)),
            orderChecks: current.orderChecks.filter((item) => !isDemoRecord(item)),
          })),
        reset: () => setData(seedOperations),
      }}
    >
      {children}
    </OperationsContext.Provider>
  );
}

export const useOperations = () => {
  const value = useContext(OperationsContext);
  if (!value) throw new Error('OperationsProvider ontbreekt');
  return value;
};
