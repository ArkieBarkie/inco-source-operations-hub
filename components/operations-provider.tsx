'use client';

import {createContext, useCallback, useContext, useEffect, useMemo, useRef, useState} from 'react';
import type {PortalSession} from '@/lib/auth-token';
import type {
  ActionItem,
  Article,
  OperationsData,
  OrderCheckRecord,
  Partner,
  PlannedActivity,
  Shipment,
  StockMovement,
  WarehouseDecision,
} from '@/types/operations';
import {createDemoOperations, seedOperations} from '@/data/operations';
import {activityStatusForShipment, shipmentStatusForActivity} from '@/lib/operations';
import {safeOperationsData} from '@/lib/operations-schema';

type DataMode = 'demo' | 'database' | 'unavailable';
type SyncState = 'idle' | 'loading' | 'saving' | 'saved' | 'conflict' | 'error';

type Context = {
  data: OperationsData;
  ready: boolean;
  mode: DataMode;
  syncState: SyncState;
  error: string;
  session: PortalSession | null;
  canEdit: boolean;
  canAdmin: boolean;
  clearError: () => void;
  saveActivity: (value: PlannedActivity) => void;
  saveActivities: (values: PlannedActivity[]) => void;
  deleteActivity: (id: string) => void;
  saveAction: (value: ActionItem) => void;
  deleteAction: (id: string) => void;
  saveMovement: (value: StockMovement) => void;
  savePartner: (value: Partner) => void;
  saveArticle: (value: Article) => void;
  saveShipment: (value: Shipment) => void;
  saveOrderCheck: (value: OrderCheckRecord) => void;
  saveWarehouseDecision: (value: WarehouseDecision) => void;
  deleteShipment: (id: string) => void;
  loadDemoData: () => void;
  clearDemoData: () => void;
  reset: () => void;
};

type StoredEnvelope = {schemaVersion: 9; demoDatasetVersion: 4; seededAt: string; data: OperationsData};

const OperationsContext = createContext<Context | null>(null);
const STORAGE_PREFIX = 'inco-source-operations-v9';
const DEMO_DATASET_VERSION = 4;
const OBSOLETE_STORAGE_PREFIXES = ['inco-source-operations-v8', 'inco-source-operations-v7', 'inco-source-operations-v6', 'inco-source-operations-v5', 'inco-source-operations-v4', 'inco-source-operations-v3', 'inco-source-operations-v2'];
const DEMO_REFRESH_MS = 3 * 24 * 60 * 60 * 1_000;

const upsert = <T extends {id: string}>(items: T[], value: T) =>
  items.some((item) => item.id === value.id)
    ? items.map((item) => (item.id === value.id ? value : item))
    : [...items, value];

const normalizeReference = (value?: string) => (value ?? '').trim().toLocaleLowerCase('nl-NL');

function reconcileLinkedStatuses(value: OperationsData): OperationsData {
  const shipments = new Map(value.shipments.map((shipment) => [normalizeReference(shipment.reference), shipment]));
  return {
    ...value,
    activities: value.activities.map((activity) => {
      const shipment = shipments.get(normalizeReference(activity.reference));
      if (!shipment) return activity;
      const expectedStatus = activityStatusForShipment(shipment.status);
      return activity.status === expectedStatus ? activity : {...activity, status: expectedStatus};
    }),
  };
}

const activityMoment = (activity: PlannedActivity) => {
  const value = `${activity.date}T${activity.actualArrivalTime || activity.endTime || activity.startTime || '12:00'}`;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? new Date().toISOString() : date.toISOString();
};

const localTime = (value?: string) => value
  ? new Intl.DateTimeFormat('nl-NL', {hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Europe/Amsterdam'}).format(new Date(value))
  : undefined;

function migrateData(value: unknown): OperationsData {
  const raw = value && typeof value === 'object' ? value as Partial<OperationsData> : {};
  const migrated = reconcileLinkedStatuses({
    activities: Array.isArray(raw.activities) ? raw.activities : [],
    actions: Array.isArray(raw.actions) ? raw.actions : [],
    articles: Array.isArray(raw.articles) ? raw.articles : [],
    locations: Array.isArray(raw.locations) && raw.locations.length ? raw.locations : seedOperations.locations,
    movements: Array.isArray(raw.movements) ? raw.movements : [],
    partners: Array.isArray(raw.partners) ? raw.partners : [],
    shipments: Array.isArray(raw.shipments) ? raw.shipments.map((shipment) => ({
      ...shipment,
      source: {
        ...shipment.source,
        originSystem: shipment.source?.originSystem ?? shipment.source?.system,
        externalIdentities: shipment.source?.externalIdentities ?? (shipment.source?.externalId ? [{source: shipment.source.system, externalId: shipment.source.externalId}] : undefined),
      },
      externalIdentities: shipment.externalIdentities ?? (shipment.source?.externalId ? [{source: shipment.source.system, externalId: shipment.source.externalId}] : undefined),
    })) : [],
    orderChecks: Array.isArray(raw.orderChecks) ? raw.orderChecks : [],
    warehouseDecisions: Array.isArray(raw.warehouseDecisions) ? raw.warehouseDecisions : [],
  });
  const parsed = safeOperationsData(migrated);
  return parsed.success ? parsed.data : seedOperations;
}

function mergeDemoData(current: OperationsData): OperationsData {
  const demo = createDemoOperations();
  return reconcileLinkedStatuses({
    activities: demo.activities.reduce((items, value) => upsert(items, value), current.activities),
    actions: demo.actions.reduce((items, value) => upsert(items, value), current.actions),
    articles: demo.articles.reduce((items, value) => upsert(items, value), current.articles),
    locations: demo.locations.reduce((items, value) => upsert(items, value), current.locations),
    movements: demo.movements.reduce((items, value) => upsert(items, value), current.movements),
    partners: demo.partners.reduce((items, value) => upsert(items, value), current.partners),
    shipments: demo.shipments.reduce((items, value) => upsert(items, value), current.shipments),
    orderChecks: demo.orderChecks.reduce((items, value) => upsert(items, value), current.orderChecks),
    warehouseDecisions: current.warehouseDecisions,
  });
}

const isDemoRecord = (value: {id: string}) => value.id.startsWith('demo-');
const storageKey = (tenantId: string) => `${STORAGE_PREFIX}:${tenantId}`;

export function OperationsProvider({children, session}: {children: React.ReactNode; session: PortalSession | null}) {
  const [data, setData] = useState<OperationsData>(seedOperations);
  const [ready, setReady] = useState(false);
  const [mode, setMode] = useState<DataMode>('unavailable');
  const [syncState, setSyncState] = useState<SyncState>('idle');
  const [error, setError] = useState('');
  const versionRef = useRef(0);
  const lastSavedRef = useRef('');
  const dataRef = useRef(data);
  const savingRef = useRef(false);
  const saveQueuedRef = useRef(false);

  const canEdit = session?.role === 'editor' || session?.role === 'admin';
  const canAdmin = session?.role === 'admin';
  useEffect(() => { dataRef.current = data; }, [data]);

  useEffect(() => {
    let active = true;
    if (!session) {
      setReady(true);
      return () => { active = false; };
    }
    setSyncState('loading');
    void fetch('/api/operations', {cache: 'no-store'})
      .then(async (response) => {
        const result = await response.json() as {mode?: DataMode; data?: unknown; version?: number; error?: string};
        if (!response.ok) throw new Error(result.error || 'De portaldata kon niet worden geladen.');
        if (!active) return;
        if (result.mode === 'database') {
          const parsed = safeOperationsData(result.data);
          if (!parsed.success) throw new Error('De centrale portaldata heeft een ongeldig formaat.');
          const serialized = JSON.stringify(parsed.data);
          lastSavedRef.current = serialized;
          versionRef.current = result.version ?? 0;
          setData(parsed.data);
          setMode('database');
          setSyncState('saved');
          return;
        }

        const key = storageKey(session.tenantId);
        let next = seedOperations;
        let seededAt = new Date().toISOString();
        try {
          for (const obsoletePrefix of OBSOLETE_STORAGE_PREFIXES) {
            localStorage.removeItem(`${obsoletePrefix}:${session.tenantId}`);
            if (session.tenantId === 'inco-source') localStorage.removeItem(obsoletePrefix);
          }
          const saved = localStorage.getItem(key);
          if (saved) {
            const parsed = JSON.parse(saved) as Partial<StoredEnvelope> | OperationsData;
            if ('schemaVersion' in parsed && parsed.schemaVersion === 9 && parsed.demoDatasetVersion === DEMO_DATASET_VERSION && 'data' in parsed) {
              next = migrateData(parsed.data);
              seededAt = typeof parsed.seededAt === 'string' ? parsed.seededAt : seededAt;
            }
          }
          if (!Number.isFinite(new Date(seededAt).getTime()) || Date.now() - new Date(seededAt).getTime() > DEMO_REFRESH_MS) {
            next = mergeDemoData(next);
            seededAt = new Date().toISOString();
          } else if (!next.shipments.some(isDemoRecord)) next = mergeDemoData(next);
          localStorage.setItem(key, JSON.stringify({schemaVersion: 9, demoDatasetVersion: DEMO_DATASET_VERSION, seededAt, data: next} satisfies StoredEnvelope));
        } catch {
          next = mergeDemoData(seedOperations);
          setError('Lokale portaldata was beschadigd of niet leesbaar en is vervangen door verse testdata.');
        }
        setData(next);
        setMode('demo');
        setSyncState('saved');
      })
      .catch((caught) => {
        if (!active) return;
        setMode('unavailable');
        setSyncState('error');
        setError(caught instanceof Error ? caught.message : 'De portaldata kon niet worden geladen.');
      })
      .finally(() => { if (active) setReady(true); });
    return () => { active = false; };
  }, [session]);

  useEffect(() => {
    if (!ready || !session || mode !== 'demo') return;
    try {
      const key = storageKey(session.tenantId);
      const previous = localStorage.getItem(key);
      let seededAt = new Date().toISOString();
      if (previous) {
        try {
          const parsed = JSON.parse(previous) as Partial<StoredEnvelope>;
          if (typeof parsed.seededAt === 'string') seededAt = parsed.seededAt;
        } catch { /* De actuele, valide state vervangt de kapotte envelope. */ }
      }
      localStorage.setItem(key, JSON.stringify({schemaVersion: 9, demoDatasetVersion: DEMO_DATASET_VERSION, seededAt, data} satisfies StoredEnvelope));
      setSyncState('saved');
    } catch {
      setSyncState('error');
      setError('Opslaan in deze browser is mislukt. Controleer beschikbare opslagruimte of gebruik database-stand.');
    }
  }, [data, mode, ready, session]);

  const persistDatabase = useCallback(async () => {
    if (!session || mode !== 'database' || !canEdit || !ready) return;
    if (savingRef.current) {
      saveQueuedRef.current = true;
      return;
    }
    const snapshot = dataRef.current;
    const serialized = JSON.stringify(snapshot);
    if (serialized === lastSavedRef.current) return;
    savingRef.current = true;
    setSyncState('saving');
    try {
      const response = await fetch('/api/operations', {
        method: 'PUT',
        headers: {'Content-Type': 'application/json', 'X-Correlation-Id': crypto.randomUUID()},
        body: JSON.stringify({expectedVersion: versionRef.current, clientMutationId: crypto.randomUUID(), data: snapshot}),
      });
      const result = await response.json() as {version?: number; data?: unknown; error?: string; code?: string};
      if (response.status === 409 && result.code === 'version_conflict') {
        setSyncState('conflict');
        setError(result.error || 'De gegevens zijn door een andere gebruiker gewijzigd. Herlaad de pagina.');
        return;
      }
      if (!response.ok || typeof result.version !== 'number') throw new Error(result.error || 'Opslaan is mislukt.');
      versionRef.current = result.version;
      lastSavedRef.current = serialized;
      setSyncState('saved');
      setError('');
    } catch (caught) {
      setSyncState('error');
      setError(caught instanceof Error ? caught.message : 'Opslaan is mislukt.');
    } finally {
      savingRef.current = false;
      if (saveQueuedRef.current) {
        saveQueuedRef.current = false;
        void persistDatabase();
      }
    }
  }, [canEdit, mode, ready, session]);

  useEffect(() => {
    if (!ready || mode !== 'database' || !canEdit || JSON.stringify(data) === lastSavedRef.current) return;
    const timer = window.setTimeout(() => void persistDatabase(), 350);
    return () => window.clearTimeout(timer);
  }, [canEdit, data, mode, persistDatabase, ready]);

  const mutate = useCallback((updater: (current: OperationsData) => OperationsData) => {
    if (!canEdit) {
      setError('Je account heeft alleen leesrechten. Vraag een beheerder om editorrechten voor wijzigingen.');
      return;
    }
    setData((current) => {
      const parsed = safeOperationsData(updater(current));
      if (!parsed.success) {
        const issue = parsed.error.issues[0];
        queueMicrotask(() => setError(`De wijziging is niet opgeslagen omdat de invoer ongeldig is: ${issue?.message ?? 'schemafout'}.`));
        return current;
      }
      return parsed.data;
    });
  }, [canEdit]);

  const saveActivityValue = useCallback((current: OperationsData, value: PlannedActivity) => {
    const linkedShipment = current.shipments.find((shipment) => normalizeReference(shipment.reference) === normalizeReference(value.reference));
    if (!linkedShipment) return {...current, activities: upsert(current.activities, value)};
    const shipmentIsFinal = ['Afgeleverd', 'Geannuleerd'].includes(linkedShipment.status);
    const activity = shipmentIsFinal ? {...value, status: activityStatusForShipment(linkedShipment.status)} : value;
    const nextShipmentStatus = shipmentStatusForActivity(activity.status);
    if (shipmentIsFinal || nextShipmentStatus === linkedShipment.status) return {...current, activities: upsert(current.activities, activity)};

    const now = new Date().toISOString();
    const source = {
      ...linkedShipment.source,
      system: 'manual' as const,
      originSystem: linkedShipment.source.originSystem ?? linkedShipment.source.system,
      updatedAt: now,
      syncStatus: linkedShipment.source.system === 'odoo' || linkedShipment.source.originSystem === 'odoo' ? 'pending' as const : 'local' as const,
    };
    const shipment: Shipment = {
      ...linkedShipment,
      status: nextShipmentStatus,
      updatedAt: now,
      actualPickupAt: nextShipmentStatus === 'Onderweg' && !linkedShipment.actualPickupAt ? activityMoment(activity) : linkedShipment.actualPickupAt,
      actualDeliveryAt: nextShipmentStatus === 'Afgeleverd' ? activityMoment(activity) : linkedShipment.actualDeliveryAt,
      source,
      events: [...linkedShipment.events, {
        id: crypto.randomUUID(),
        occurredAt: now,
        status: nextShipmentStatus,
        title: `Planningstatus gesynchroniseerd · ${activity.status}`,
        detail: `Gekoppelde activiteit ${activity.reference} is bijgewerkt naar ${activity.status}.`,
        location: activity.destinationLocation || undefined,
        source,
      }],
    };
    return {...current, activities: upsert(current.activities, activity), shipments: upsert(current.shipments, shipment)};
  }, []);

  const value = useMemo<Context>(() => ({
    data,
    ready,
    mode,
    syncState,
    error,
    session,
    canEdit,
    canAdmin,
    clearError: () => setError(''),
    saveActivity: (activity) => mutate((current) => saveActivityValue(current, activity)),
    saveActivities: (activities) => mutate((current) => activities.reduce(saveActivityValue, current)),
    deleteActivity: (id) => mutate((current) => ({...current, activities: current.activities.filter((item) => item.id !== id)})),
    saveAction: (action) => mutate((current) => ({...current, actions: upsert(current.actions, action)})),
    deleteAction: (id) => mutate((current) => ({...current, actions: current.actions.filter((item) => item.id !== id)})),
    saveMovement: (movement) => mutate((current) => ({...current, movements: upsert(current.movements, movement)})),
    savePartner: (partner) => mutate((current) => ({...current, partners: upsert(current.partners, partner)})),
    saveArticle: (article) => mutate((current) => ({...current, articles: upsert(current.articles, article)})),
    saveShipment: (shipment) => mutate((current) => ({
      ...current,
      shipments: upsert(current.shipments, shipment),
      activities: current.activities.map((activity) => normalizeReference(activity.reference) === normalizeReference(shipment.reference)
        ? {...activity, status: activityStatusForShipment(shipment.status), actualArrivalTime: ['Aangekomen', 'Afgeleverd'].includes(shipment.status) ? localTime(shipment.actualDeliveryAt || shipment.updatedAt) : activity.actualArrivalTime}
        : activity),
    })),
    saveOrderCheck: (record) => mutate((current) => ({...current, orderChecks: upsert(current.orderChecks, record)})),
    saveWarehouseDecision: (decision) => mutate((current) => ({...current, warehouseDecisions: upsert(current.warehouseDecisions, decision)})),
    deleteShipment: (id) => mutate((current) => ({...current, shipments: current.shipments.filter((item) => item.id !== id)})),
    loadDemoData: () => mutate(mergeDemoData),
    clearDemoData: () => mutate((current) => ({
      activities: current.activities.filter((item) => !isDemoRecord(item)),
      actions: current.actions.filter((item) => !isDemoRecord(item)),
      articles: current.articles.filter((item) => !isDemoRecord(item)),
      locations: current.locations.filter((item) => !isDemoRecord(item)),
      movements: current.movements.filter((item) => !isDemoRecord(item)),
      partners: current.partners.filter((item) => !isDemoRecord(item)),
      shipments: current.shipments.filter((item) => item.source.system !== 'demo' && !isDemoRecord(item)),
      orderChecks: current.orderChecks.filter((item) => !isDemoRecord(item)),
      warehouseDecisions: current.warehouseDecisions,
    })),
    reset: () => mutate(() => mode === 'demo' ? mergeDemoData(seedOperations) : seedOperations),
  }), [canAdmin, canEdit, data, error, mode, mutate, ready, saveActivityValue, session, syncState]);

  return <OperationsContext.Provider value={value}>{children}</OperationsContext.Provider>;
}

export const useOperations = () => {
  const value = useContext(OperationsContext);
  if (!value) throw new Error('OperationsProvider ontbreekt');
  return value;
};
