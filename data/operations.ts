import type {
  ActionItem,
  Article,
  Location,
  OperationsData,
  OrderCheckRecord,
  Partner,
  PlannedActivity,
  Shipment,
  ShipmentDirection,
  ShipmentStatus,
  StockMovement,
} from '@/types/operations';
import {companyProfile} from '@/data/company-profile';
import {activityStatusForShipment} from '@/lib/operations';

const baseLocations: Location[] = [
  {
    id: 'amstelveen',
    name: 'Eigen magazijn Amstelveen',
    type: 'Eigen magazijn',
    address: 'Noorddammerweg 111-03, 1187 ZS Amstelveen',
    palletCapacity: 110,
    currentPalletUsage: 68,
    contactDetails: 'Jorn / Hidde',
  },
  {
    id: 'extern',
    name: 'Extern magazijn / 3PL',
    type: 'Extern magazijn',
    address: 'TESTLOCATIE · Waddinxveen',
    palletCapacity: 240,
    currentPalletUsage: 94,
    contactDetails: 'Scan Global Logistics · testcontact',
  },
  {
    id: 'transit',
    name: 'Onderweg',
    type: 'Onderweg',
    address: 'In transport',
    currentPalletUsage: 12,
    contactDetails: 'Jorn / Hidde',
  },
];

export const seedOperations: OperationsData = {
  activities: [],
  actions: [],
  articles: [],
  locations: baseLocations,
  movements: [],
  orderChecks: [],
  partners: [],
  shipments: [],
  warehouseDecisions: [],
};

const weekAt = (dayIndex: number, hour: number, minute = 0) => {
  const date = new Date();
  const currentDayIndex = (date.getDay() + 6) % 7;
  date.setDate(date.getDate() - currentDayIndex + dayIndex);
  date.setHours(hour, minute, 0, 0);
  return date.toISOString();
};

const shiftHours = (value: string, hours: number) => {
  const date = new Date(value);
  date.setTime(date.getTime() + hours * 60 * 60 * 1_000);
  return date.toISOString();
};

const dateAt = (offsetDays: number) => {
  const date = new Date();
  date.setDate(date.getDate() + offsetDays);
  return date.toLocaleDateString('sv-SE', {timeZone: 'Europe/Amsterdam'});
};

const localDate = (value: string) => new Date(value).toLocaleDateString('sv-SE', {timeZone: 'Europe/Amsterdam'});
const localTime = (value: string) => new Intl.DateTimeFormat('nl-NL', {
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
  timeZone: 'Europe/Amsterdam',
}).format(new Date(value));

const currentBusinessDay = () => Math.min((new Date().getDay() + 6) % 7, 4);

const partnerRows: Array<[string, Partner['kind'], string, string, string, string, string, string, string, string, string, string]> = [
  ['supplier-medicore', 'Leverancier', 'MediCore GmbH', 'Anna Keller', 'anna.keller@example.com', '+49 40 555 0101', 'Medische disposables', 'Maandag en donderdag', '08:30', 'Hamburg, Duitsland', '4–8 pallets per levering', 'TESTDATA · Bloktijd altijd schriftelijk bevestigen.'],
  ['supplier-nordic', 'Leverancier', 'Nordic Care AB', 'Lars Nilsson', 'lars.nilsson@example.com', '+46 40 555 0110', 'Wondzorg en verbandmiddelen', 'Dinsdag', '10:00', 'Malmö, Zweden', '2–5 pallets per levering', 'TESTDATA · Temperatuurregistratie meesturen.'],
  ['supplier-iberia', 'Leverancier', 'Iberia Medical SL', 'Lucía Martín', 'lucia.martin@example.com', '+34 93 555 0192', 'Diagnostische hulpmiddelen', 'Woensdag', '13:00', 'Barcelona, Spanje', '3–6 pallets per levering', 'TESTDATA · Paklijst één werkdag voor vertrek delen.'],
  ['supplier-alpine', 'Leverancier', 'Alpine Diagnostics AG', 'Marco Frei', 'marco.frei@example.com', '+41 61 555 0144', 'Diagnostiek en meetapparatuur', 'Vrijdag', '09:30', 'Basel, Zwitserland', '1–3 pallets per levering', 'TESTDATA · Douanedocumenten vooraf controleren.'],
  ['supplier-benelux', 'Leverancier', 'Benelux Medical BV', 'Sanne de Groot', 'sanne.degroot@example.com', '+31 40 555 0155', 'Verbruiksartikelen', 'Dagelijks', '11:00', 'Eindhoven, Nederland', '1–4 pallets per levering', 'TESTDATA · Zelfde-dag-aanvraag mogelijk tot 10:00.'],
  ['supplier-sterilab', 'Leverancier', 'SteriLab SAS', 'Élodie Bernard', 'elodie.bernard@example.com', '+33 3 20 55 01 60', 'Steriele procedurekits', 'Donderdag', '14:00', 'Lille, Frankrijk', '2–4 pallets per levering', 'TESTDATA · Batch- en vervaldata verplicht.'],
  ['customer-utrecht', 'Klant', 'Zorggroep Utrecht', 'Peter van Dijk', 'peter.vandijk@example.com', '+31 30 555 0201', 'Regionale zorggroep', 'Maandag t/m vrijdag', '13:00', 'Utrecht, Nederland', '10–18 colli per order', 'TESTDATA · Lossen via goederenontvangst westzijde.'],
  ['customer-rotterdam', 'Klant', 'Medisch Centrum Rijnmond', 'Fatima El Amrani', 'fatima.elamrani@example.com', '+31 10 555 0212', 'Ziekenhuisleveringen', 'Dinsdag en donderdag', '10:30', 'Rotterdam, Nederland', '1–3 pallets per order', 'TESTDATA · Levervenster strikt; te laat direct melden.'],
  ['customer-vitaal', 'Klant', 'Vitaal Apotheken', 'Koen Visser', 'koen.visser@example.com', '+31 20 555 0220', 'Apotheekgroothandel', 'Dagelijks', '15:00', 'Amsterdam, Nederland', '12–30 colli per order', 'TESTDATA · Orderreferentie op elk collo.'],
  ['customer-noord', 'Klant', 'Kliniek Noord-Holland', 'Nora Smit', 'nora.smit@example.com', '+31 72 555 0233', 'Kliniekleveringen', 'Woensdag en vrijdag', '12:00', 'Alkmaar, Nederland', '8–16 colli per order', 'TESTDATA · Receptie belt magazijn bij aankomst.'],
  ['customer-brabant', 'Klant', 'CarePoint Brabant', 'Tom Peeters', 'tom.peeters@example.com', '+31 76 555 0244', 'Zorgdistributie', 'Maandag en donderdag', '14:30', 'Breda, Nederland', '1–2 pallets per order', 'TESTDATA · Alleen Euro-pallets geaccepteerd.'],
  ['customer-belgium', 'Klant', 'MedSupply België', 'Sophie Maes', 'sophie.maes@example.com', '+32 3 555 0255', 'Medische groothandel', 'Dinsdag', '11:30', 'Antwerpen, België', '2–4 pallets per order', 'TESTDATA · CMR en paklijst digitaal meesturen.'],
  ['carrier-dachser', 'Transporteur', 'Dachser Testnet', 'Planning Benelux', 'planning.dachser@example.com', '+31 88 555 0301', 'Europees pallettransport', 'Dagelijks', '09:00', 'Zevenaar, Nederland', '8–14 zendingen per week', 'TESTDATA · Escalatie na 30 minuten zonder scanupdate.'],
  ['carrier-dsv', 'Transporteur', 'DSV Test Logistics', 'Control Tower', 'controltower.dsv@example.com', '+31 88 555 0312', 'Wegtransport en groupage', 'Dagelijks', '10:00', 'Venlo, Nederland', '5–10 zendingen per week', 'TESTDATA · ETA-update om 10:00 en 15:00.'],
  ['carrier-dhl', 'Transporteur', 'DHL Freight Test', 'Customer Service', 'freight.dhl@example.com', '+31 88 555 0323', 'Benelux distributie', 'Dagelijks', '12:00', 'Utrecht, Nederland', '6–12 zendingen per week', 'TESTDATA · POD binnen 24 uur opvragen.'],
  ['carrier-vdb', 'Transporteur', 'Van den Bosch Testtransport', 'Rik Jansen', 'rik.jansen@example.com', '+31 73 555 0334', 'Spoed- en dedicated transport', 'Op afroep', '08:00', 'Erp, Nederland', '1–3 ritten per week', 'TESTDATA · Alleen na akkoord van een bevoegde operationele eigenaar.'],
  ['3pl-scan', 'Logistieke partner', 'Scan Global Logistics', 'Operations Desk', 'operations.scan@example.com', '+31 88 555 0401', 'Opslag, inbound en fulfilment', 'Dagelijks', '08:00', 'Waddinxveen, Nederland', '90–110 pallets bezet', 'TESTDATA · Voorraadreconciliatie dagelijks om 17:00.'],
  ['3pl-mainfreight', 'Logistieke partner', 'Mainfreight', 'Nog te bepalen', '', '', 'Mogelijke 3PL', 'Nog te bepalen', '', 'Nog te bepalen', 'Nog te bepalen', 'PLACEHOLDER · Gesprek loopt; nog geen tarieven of operationele afspraken opgenomen.'],
];

const partners: Partner[] = partnerRows.map(([id, kind, name, contactPerson, email, phone, service, usualDays, usualTime, location, averageVolume, notes]) => ({
  id, kind, name, contactPerson, email, phone, service, usualDays, usualTime, location, averageVolume, notes,
  status: id === '3pl-mainfreight' ? 'Inactief' : 'Actief',
}));

const partnerByName = (name?: string) => partners.find((partner) => partner.name === name);
const supplierNames = partners.filter((partner) => partner.kind === 'Leverancier').map((partner) => partner.name);
const customerNames = partners.filter((partner) => partner.kind === 'Klant').map((partner) => partner.name);
const carrierNames = partners.filter((partner) => partner.kind === 'Transporteur').map((partner) => partner.name);

const directions: ShipmentDirection[] = [
  'Outbound', 'Inbound', 'Outbound', 'Inbound', 'Transfer',
  'Outbound', 'Outbound', 'Inbound', 'Retour', 'Outbound',
  'Inbound', 'Outbound', 'Inbound', 'Outbound', 'Transfer',
  'Outbound', 'Inbound', 'Outbound', 'Retour', 'Inbound',
  'Outbound', 'Inbound', 'Outbound', 'Transfer', 'Outbound',
];

const exceptionStatuses: Partial<Record<number, ShipmentStatus>> = {
  0: 'Onderweg', 1: 'Vertraagd', 7: 'Vertraagd', 13: 'Geblokkeerd', 18: 'Aangekomen', 21: 'Vertraagd',
};

const statusFor = (index: number, dayIndex: number): ShipmentStatus => {
  if (exceptionStatuses[index]) return exceptionStatuses[index] as ShipmentStatus;
  const today = currentBusinessDay();
  if (dayIndex < today) return 'Afgeleverd';
  if (dayIndex === today) return (['Onderweg', 'Aangekomen', 'Bevestigd'] as ShipmentStatus[])[index % 3];
  return index % 3 === 0 ? 'Gepland' : 'Bevestigd';
};

const shipmentDayIndex = (index: number) => index === 0 ? currentBusinessDay() : index % 5;

const shipmentReference = (plannedPickupAt: string, index: number) => {
  const dateCode = localDate(plannedPickupAt).slice(2).replaceAll('-', '');
  const dayIndex = shipmentDayIndex(index);
  const daySequence = Array.from({length: index}, (_, previousIndex) => shipmentDayIndex(previousIndex))
    .filter((previousDayIndex) => previousDayIndex === dayIndex).length + 1;
  return `INCO-${dateCode}-${String(daySequence).padStart(2, '0')}`;
};

const createDemoShipmentsInternal = (): Shipment[] => directions.map((direction, index) => {
  const number = index + 1;
  const dayIndex = shipmentDayIndex(index);
  const status = statusFor(index, dayIndex);
  const supplier = direction === 'Inbound' ? supplierNames[index % supplierNames.length] : undefined;
  const customer = ['Outbound', 'Retour'].includes(direction) ? customerNames[index % customerNames.length] : undefined;
  const carrier = carrierNames[index % carrierNames.length];
  const origin = direction === 'Inbound'
    ? (partnerByName(supplier)?.location.split(',')[0] ?? 'Europa')
    : direction === 'Retour'
      ? (partnerByName(customer)?.location.split(',')[0] ?? 'Nederland')
      : 'Amstelveen';
  const destination = direction === 'Outbound'
    ? (partnerByName(customer)?.location.split(',')[0] ?? 'Nederland')
    : direction === 'Transfer'
      ? 'Waddinxveen'
      : 'Amstelveen';
  const pickupHour = 7 + (index % 7);
  const plannedPickupAt = weekAt(dayIndex, pickupHour, index % 2 ? 30 : 0);
  const plannedDeliveryAt = shiftHours(plannedPickupAt, direction === 'Inbound' ? 7 : 3);
  const createdAt = shiftHours(plannedPickupAt, -36);
  const updatedAt = status === 'Gepland' ? createdAt : shiftHours(plannedPickupAt, status === 'Afgeleverd' ? 3 : 1);
  const actualPickupAt = ['Onderweg', 'Aangekomen', 'Afgeleverd', 'Vertraagd', 'Geblokkeerd'].includes(status)
    ? shiftHours(plannedPickupAt, index % 4 === 0 ? 1 : 0)
    : undefined;
  const actualDeliveryAt = status === 'Afgeleverd' ? shiftHours(plannedDeliveryAt, index % 3 === 0 ? -0.5 : 0.25) : undefined;
  const reference = shipmentReference(plannedPickupAt, index);
  const orderReference = direction === 'Inbound'
    ? `PO-26-${3100 + number}`
    : direction === 'Transfer'
      ? `TR-26-${5100 + number}`
      : direction === 'Retour'
        ? `RTN-26-${7100 + number}`
        : `SO-26-${1100 + number}`;
  const notes = status === 'Vertraagd'
    ? 'TESTDATA · ETA ontbreekt of is verstreken; vervoerder nabellen en klant of ontvangst informeren.'
    : status === 'Geblokkeerd'
      ? 'TESTDATA · Dossier geblokkeerd wegens ontbrekende batchdocumentatie.'
      : status === 'Aangekomen'
        ? 'TESTDATA · Chauffeur gemeld; goederenontvangst en telling zijn gestart.'
      : 'TESTDATA · Fictieve zending voor de portaal- en Inco Assist-test.';
  const handlingMode = direction === 'Transfer' || index % 6 === 0
    ? 'Extern magazijn / 3PL' as const
    : index % 9 === 0
      ? 'Direct zonder magazijn' as const
      : 'Eigen magazijn' as const;
  return {
    id: `demo-shipment-${String(number).padStart(3, '0')}`,
    reference,
    orderReference,
    direction,
    status,
    supplier,
    customer,
    carrier,
    trackingNumber: `${carrier.split(' ')[0].toUpperCase()}-26NL-${84000 + number}`,
    origin,
    destination,
    plannedPickupAt,
    actualPickupAt,
    plannedDeliveryAt,
    actualDeliveryAt,
    pallets: 1 + (index % 6),
    cases: 8 + ((index * 7) % 48),
    items: 120 + ((index * 91) % 1_400),
    responsibleEmployee: index % 2 ? 'Hidde' : 'Jorn',
    handlingMode,
    warehousePartner: handlingMode === 'Extern magazijn / 3PL' ? 'Scan Global Logistics' : undefined,
    warehouseReference: handlingMode === 'Extern magazijn / 3PL' ? `SGL-26-${String(7800 + number)}` : undefined,
    notes,
    createdAt,
    updatedAt,
    source: {system: 'demo', externalId: `DEMO-SHIP-${number}`, updatedAt, syncStatus: 'local'},
    events: [
      {
        id: `demo-shipment-${number}-created`,
        occurredAt: createdAt,
        status: 'Gepland',
        title: 'Testzending aangemaakt',
        detail: 'TESTDATA · Automatisch aangemaakt voor de realistische weektest.',
        location: origin,
        source: {system: 'demo', updatedAt: createdAt, syncStatus: 'local'},
      },
      {
        id: `demo-shipment-${number}-current`,
        occurredAt: updatedAt,
        status,
        title: status === 'Afgeleverd' ? 'Proof of delivery ontvangen' : `Status gewijzigd naar ${status}`,
        detail: notes,
        location: status === 'Afgeleverd' ? destination : origin,
        source: {system: 'demo', updatedAt, syncStatus: 'local'},
      },
    ],
  };
});

const createActivities = (shipments: Shipment[]): PlannedActivity[] => shipments.slice(0, 20).map((shipment, index) => {
  const activityAt = (shipment.direction === 'Outbound' ? shipment.plannedPickupAt : shipment.plannedDeliveryAt) ?? shipment.updatedAt;
  const supplier = partnerByName(shipment.supplier);
  const customer = partnerByName(shipment.customer);
  const carrier = partnerByName(shipment.carrier);
  return {
    id: `demo-activity-${String(index + 1).padStart(3, '0')}`,
    date: localDate(activityAt),
    startTime: localTime(activityAt),
    endTime: localTime(shiftHours(activityAt, 1)),
    activityType: shipment.direction === 'Inbound' ? 'Leverancierslevering' : shipment.direction === 'Outbound' ? 'Klantbezorging' : shipment.direction === 'Retour' ? 'Retour' : 'Voorraadverplaatsing',
    supplierId: supplier?.id,
    customerId: customer?.id,
    carrierId: carrier?.id,
    reference: shipment.reference,
    description: `${shipment.direction} · ${shipment.origin} → ${shipment.destination}`,
    originLocation: shipment.origin,
    destinationLocation: shipment.destination,
    expectedPallets: shipment.pallets,
    expectedCases: shipment.cases,
    expectedItems: shipment.items,
    responsibleEmployee: shipment.responsibleEmployee,
    status: activityStatusForShipment(shipment.status),
    notes: 'TESTDATA · Gekoppeld aan het fictieve zendingendossier.',
    slotConfirmed: index % 6 !== 0,
    appointmentContact: supplier?.contactPerson ?? customer?.contactPerson ?? carrier?.contactPerson,
    actualArrivalTime: ['Aangekomen', 'Afgeleverd'].includes(shipment.status) ? localTime(shipment.updatedAt) : undefined,
  };
});

const actionTemplates: Array<Pick<ActionItem, 'title' | 'description' | 'type' | 'priority' | 'owner' | 'status' | 'relatedParty'> & {shipmentIndex: number}> = [
  {title: 'Nieuwe ETA opvragen', shipmentIndex: 1, description: 'De geplande levertijd is verstreken en een bevestigde ETA ontbreekt.', type: 'Afwijking', priority: 'Kritiek', owner: 'Hidde', status: 'In behandeling', relatedParty: 'Dachser Testnet'},
  {title: 'Batchdocumentatie compleet maken', shipmentIndex: 13, description: 'Certificate of Analysis en batchoverzicht ontbreken nog.', type: 'Afwijking', priority: 'Hoog', owner: 'Jorn', status: 'Wacht op informatie', relatedParty: 'SteriLab SAS'},
  {title: 'POD controleren en archiveren', shipmentIndex: 2, description: 'Proof of delivery controleren en koppelen aan het orderdossier.', type: 'Actie', priority: 'Normaal', owner: 'Jorn', status: 'Opgelost', relatedParty: 'DHL Freight Test'},
  {title: 'Voorraadverschil MED-1007 onderzoeken', shipmentIndex: 4, description: '3PL-stand wijkt twaalf stuks af van de lokale teststand.', type: 'Afwijking', priority: 'Hoog', owner: 'Hidde', status: 'Nieuw', relatedParty: 'Scan Global Logistics'},
  {title: 'Bloktijd donderdagmiddag bevestigen', shipmentIndex: 7, description: 'Twee grote leveringen staan op hetzelfde tijdvak.', type: 'Actie', priority: 'Hoog', owner: 'Jorn', status: 'In behandeling', relatedParty: 'Iberia Medical SL'},
  {title: 'Retour dispositioneren', shipmentIndex: 18, description: 'Controleer verpakking, batch en verkoopbaarheid na retourontvangst.', type: 'Actie', priority: 'Normaal', owner: 'Hidde', status: 'Nieuw', relatedParty: 'Kliniek Noord-Holland'},
  {title: 'Klant informeren over vertraging', shipmentIndex: 16, description: 'De nieuwe leverdatum schriftelijk bevestigen.', type: 'Actie', priority: 'Kritiek', owner: 'Jorn', status: 'Wacht op informatie', relatedParty: 'Vitaal Apotheken'},
  {title: 'Vrijgave geblokkeerde voorraad beoordelen', shipmentIndex: 8, description: 'Kwaliteitsdocumentatie voor MED-1014 controleren.', type: 'Afwijking', priority: 'Hoog', owner: 'Hidde', status: 'In behandeling', relatedParty: 'MediCore GmbH'},
  {title: '3PL dagtelling reconciliëren', shipmentIndex: 14, description: 'Vergelijk interne testvoorraad met de 17:00-export.', type: 'Actie', priority: 'Normaal', owner: 'Jorn', status: 'Nieuw', relatedParty: 'Scan Global Logistics'},
  {title: 'Transportclaim beschadigde colli', shipmentIndex: 9, description: 'Foto’s, vrachtbrief en waarde-overzicht verzamelen.', type: 'Afwijking', priority: 'Hoog', owner: 'Hidde', status: 'Wacht op informatie', relatedParty: 'DSV Test Logistics'},
  {title: 'Leveranciersscorecard augustus bijwerken', shipmentIndex: 10, description: 'OTIF, documentkwaliteit en respons op afwijkingen verwerken.', type: 'Actie', priority: 'Laag', owner: 'Jorn', status: 'Nieuw', relatedParty: 'Nordic Care AB'},
  {title: 'Orderhold herbeoordelen', shipmentIndex: 15, description: 'Marge en voorraad zijn aangepast; commerciële vrijgave opnieuw uitvoeren.', type: 'Actie', priority: 'Normaal', owner: 'Hidde', status: 'In behandeling', relatedParty: 'CarePoint Brabant'},
  {title: 'Spoedrit naar Antwerpen evalueren', shipmentIndex: 11, description: 'Werkelijke kosten en klantimpact vastleggen.', type: 'Actie', priority: 'Laag', owner: 'Jorn', status: 'Gesloten', relatedParty: 'Van den Bosch Testtransport'},
  {title: 'Ontvangstcapaciteit vrijdag borgen', shipmentIndex: 19, description: 'Zes pallets inbound combineren met reguliere klantpick.', type: 'Actie', priority: 'Normaal', owner: 'Hidde', status: 'Nieuw', relatedParty: 'Alpine Diagnostics AG'},
];

const createActions = (activities: PlannedActivity[]): ActionItem[] => actionTemplates.map(({shipmentIndex, ...template}, index) => ({
  id: `demo-action-${String(index + 1).padStart(3, '0')}`,
  ...template,
  title: `${template.title} · ${activities[shipmentIndex]?.reference ?? 'intern dossier'}`,
  relatedActivityId: activities[shipmentIndex]?.id,
  createdAt: weekAt(Math.max(0, currentBusinessDay() - 1), 8 + (index % 8)),
  dueDate: dateAt(index % 4 - 1),
  resolvedAt: ['Opgelost', 'Gesloten'].includes(template.status) ? weekAt(currentBusinessDay(), 12 + (index % 4)) : undefined,
  notes: 'TESTDATA · Fictieve actie voor de portaal- en Inco Assist-test.',
}));

const articleDescriptions = [
  'Nitril onderzoekshandschoenen maat M', 'Nitril onderzoekshandschoenen maat L', 'Steriele gazen 10×10 cm',
  'Wondverband hydrocolloïd', 'Injectiespuit 10 ml', 'Injectienaald 21G', 'Infuuslijn standaard',
  'Diagnostische testcassette', 'Alcoholpads 70%', 'Chirurgisch mondmasker type IIR', 'Beschermschort disposable',
  'Hechtstrip 6×75 mm', 'Thermometer digitaal', 'Zuurstofslang 2 meter', 'Procedurekit wondzorg',
  'Katheterset steriel', 'Handdesinfectie 500 ml', 'Urinebeker steriel', 'Bloedafnamebuis EDTA',
  'Pleisterrol 5 cm', 'Compressieverband 8 cm', 'Onderlegger absorberend', 'Naaldencontainer 5 liter',
  'Transportbox medisch materiaal',
];

const productGroups = ['PBM', 'Wondzorg', 'Injectie', 'Diagnostiek', 'Verbruik', 'Procedurekits'];

const createArticles = (): Article[] => articleDescriptions.map((description, index) => {
  const internal = 90 + ((index * 37) % 360);
  const external = 40 + ((index * 53) % 280);
  const transit = index % 4 === 0 ? 36 + index * 2 : 0;
  const total = internal + external + transit;
  const reservedQuantity = 12 + ((index * 11) % 90);
  const blockedQuantity = index % 7 === 0 ? 12 + index : index % 11 === 0 ? 6 : 0;
  return {
    id: `demo-article-${String(index + 1).padStart(3, '0')}`,
    articleNumber: `MED-${1001 + index}`,
    description,
    productGroup: productGroups[index % productGroups.length],
    unit: 'stuks',
    pallets: Math.ceil(total / 240),
    cases: Math.ceil(total / 24),
    pieces: total,
    stockByLocation: [
      {locationId: 'amstelveen', quantity: internal, blocked: blockedQuantity, pallets: Math.ceil(internal / 240)},
      {locationId: 'extern', quantity: external, blocked: 0, pallets: Math.ceil(external / 240)},
      {locationId: 'transit', quantity: transit, blocked: 0, pallets: Math.ceil(transit / 240)},
    ],
    reservedQuantity,
    blockedQuantity,
    availableQuantity: total - reservedQuantity - blockedQuantity,
    lastUpdated: weekAt(currentBusinessDay(), 7 + (index % 10), 15),
    notes: blockedQuantity ? 'TESTDATA · Een deel staat geblokkeerd voor kwaliteitscontrole.' : 'TESTDATA · Fictieve voorraadstand voor de portaaltest.',
  };
});

const movementTypes: StockMovement['type'][] = ['Ontvangst', 'Uitlevering', 'Verplaatsing', 'Retour', 'Blokkering', 'Vrijgave', 'Transport externe opslag'];

const createMovements = (articles: Article[], shipments: Shipment[], activities: PlannedActivity[]): StockMovement[] => Array.from({length: 30}, (_, index) => {
  const type = movementTypes[index % movementTypes.length];
  const outbound = ['Uitlevering', 'Transport externe opslag'].includes(type);
  return {
    id: `demo-movement-${String(index + 1).padStart(3, '0')}`,
    dateTime: weekAt(index % 5, 8 + (index % 9), index % 2 ? 30 : 0),
    articleId: articles[index % articles.length].id,
    quantity: 6 + ((index * 7) % 84),
    fromLocation: outbound ? 'Eigen magazijn Amstelveen' : type === 'Retour' ? 'Klantlocatie' : 'Extern magazijn / 3PL',
    toLocation: outbound ? (type === 'Transport externe opslag' ? 'Extern magazijn / 3PL' : 'Klantlocatie') : 'Eigen magazijn Amstelveen',
    type,
    reference: shipments[index % shipments.length].reference,
    performedBy: index % 2 ? 'Hidde' : 'Jorn',
    notes: 'TESTDATA · Fictieve voorraadbeweging voor traceerbaarheid.',
    relatedActivityId: activities[index % activities.length]?.id,
  };
});

const createOrderChecks = (shipments: Shipment[]): OrderCheckRecord[] => shipments
  .filter((shipment) => shipment.direction === 'Outbound')
  .slice(0, 12)
  .map((shipment, index) => {
    const policy = companyProfile.commercialPolicy;
    const stockAvailable = index % 5 !== 2;
    const complianceComplete = index % 6 !== 3;
    const documentationComplete = index % 4 !== 1;
    const incoterm: OrderCheckRecord['incoterm'] = index % 4 === 1 ? 'DAP' : 'EXW';
    const orderValue = 1_750 + index * 950;
    const netMarginPercentage = 10 + (index % 5) * 2.5;
    const netProfit = 180 + index * 85;
    const valueOk = incoterm === 'EXW'
      ? orderValue >= policy.minimumOrderValueExw
      : orderValue >= policy.dapExceptionMinimumOrderValue;
    const commercialOk = valueOk && netMarginPercentage >= policy.minimumNetMarginPercentage && netProfit >= policy.minimumNetProfitPerOrder;
    const outcome: OrderCheckRecord['outcome'] = stockAvailable && complianceComplete && documentationComplete && commercialOk
      ? 'Vrijgegeven'
      : !complianceComplete || !commercialOk
        ? 'Escalatie nodig'
        : 'Hold';
    return {
      id: `demo-ordercheck-${String(index + 1).padStart(3, '0')}`,
      orderReference: shipment.orderReference ?? `SO-26-${1200 + index}`,
      customer: shipment.customer ?? 'Testklant',
      incoterm,
      orderValue,
      netMarginPercentage,
      netProfit,
      requestedDeliveryDate: localDate(shipment.plannedDeliveryAt ?? shipment.updatedAt),
      stockAvailable,
      complianceComplete,
      documentationComplete,
      outcome,
      owner: index % 2 ? 'Hidde' : 'Jorn',
      checkedAt: shiftHours(shipment.createdAt, 6),
      notes: `TESTDATA · ${outcome === 'Vrijgegeven' ? 'Minimumregels en controles gehaald.' : 'Minimaal één commerciële of operationele controle staat open.'}`,
    };
  });

export const createDemoOperations = (): OperationsData => {
  const shipments = createDemoShipmentsInternal();
  const activities = createActivities(shipments);
  const actions = createActions(activities);
  const articles = createArticles();
  return {
    activities,
    actions,
    articles,
    locations: baseLocations,
    movements: createMovements(articles, shipments, activities),
    orderChecks: createOrderChecks(shipments),
    partners,
    shipments,
    warehouseDecisions: [],
  };
};

/** Achterwaartse compatibiliteit voor bestaande UI-imports. */
export const createDemoShipments = (): Shipment[] => createDemoOperations().shipments;
