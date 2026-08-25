'use client';

import {useState} from 'react';
import {useOperations} from './operations-provider';
import type {ActivityStatus, ActivityType, PlannedActivity} from '@/types/operations';

const activityTypes: ActivityType[] = ['Leverancierslevering', 'Ophaling', 'Klantbezorging', 'Voorraadverplaatsing', 'Transport extern magazijn', 'Retour', 'Spoedorder', 'Vaste afspraak'];
const activityStatuses: ActivityStatus[] = ['Verwacht', 'Bevestigd', 'Onderweg', 'Gearriveerd', 'Wordt verwerkt', 'Afgerond', 'Vertraagd', 'Geblokkeerd', 'Geannuleerd'];
const requiredHeaders = ['date', 'startTime', 'activityType', 'reference', 'description', 'responsibleEmployee'];

function parseCsv(text: string) {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let quoted = false;
  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    if (char === '"') {
      if (quoted && text[index + 1] === '"') { cell += '"'; index += 1; }
      else quoted = !quoted;
    } else if (char === ',' && !quoted) {
      row.push(cell);
      cell = '';
    } else if ((char === '\n' || char === '\r') && !quoted) {
      if (char === '\r' && text[index + 1] === '\n') index += 1;
      row.push(cell);
      if (row.some((value) => value.trim())) rows.push(row);
      row = [];
      cell = '';
    } else cell += char;
  }
  if (quoted) throw new Error('Een tekstveld heeft geen afsluitend aanhalingsteken.');
  row.push(cell);
  if (row.some((value) => value.trim())) rows.push(row);
  return rows;
}

function integer(value: string, label: string, line: number) {
  const parsed = value ? Number(value) : 0;
  if (!Number.isInteger(parsed) || parsed < 0 || parsed > 1_000_000_000) throw new Error(`Regel ${line}: ${label} moet een positief geheel getal zijn.`);
  return parsed;
}

function oneHourAfter(time: string) {
  const [hours, minutes] = time.split(':').map(Number);
  return `${String(Math.min(23, hours + 1)).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

export function CsvImporter() {
  const {saveActivities, data, canEdit} = useOperations();
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  const load = async (file: File) => {
    if (!canEdit || busy) return;
    setBusy(true);
    setMessage('Bestand controleren…');
    try {
      if (file.size > 1_000_000) throw new Error('Het CSV-bestand mag maximaal 1 MB zijn.');
      const rows = parseCsv((await file.text()).replace(/^\uFEFF/, ''));
      const headerRow = rows.shift();
      if (!headerRow) throw new Error('Het bestand is leeg.');
      const headers = headerRow.map((value) => value.trim());
      if (new Set(headers).size !== headers.length) throw new Error('Een kolomnaam komt dubbel voor.');
      const missing = requiredHeaders.filter((header) => !headers.includes(header));
      if (missing.length) throw new Error(`Verplichte kolommen ontbreken: ${missing.join(', ')}.`);
      if (rows.length > 1_000) throw new Error('Importeer maximaal 1.000 regels per bestand.');

      const existing = new Set(data.activities.map((item) => `${item.date}|${item.reference.trim().toLocaleLowerCase('nl-NL')}`));
      const imported = new Set<string>();
      const activities = rows.map((columns, index): PlannedActivity => {
        const line = index + 2;
        if (columns.length > headers.length) throw new Error(`Regel ${line}: meer waarden dan kolommen.`);
        const record = Object.fromEntries(headers.map((header, column) => [header, (columns[column] ?? '').trim()]));
        if (!/^\d{4}-\d{2}-\d{2}$/.test(record.date) || Number.isNaN(new Date(`${record.date}T12:00:00`).getTime())) throw new Error(`Regel ${line}: ongeldige datum.`);
        if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(record.startTime)) throw new Error(`Regel ${line}: startTime moet HH:MM zijn.`);
        const endTime = record.endTime || oneHourAfter(record.startTime);
        if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(endTime) || endTime <= record.startTime) throw new Error(`Regel ${line}: endTime moet na startTime liggen.`);
        if (!activityTypes.includes(record.activityType as ActivityType)) throw new Error(`Regel ${line}: onbekend activiteitstype.`);
        const status = (record.status || 'Verwacht') as ActivityStatus;
        if (!activityStatuses.includes(status)) throw new Error(`Regel ${line}: onbekende status.`);
        if (!record.reference || !record.description || !record.responsibleEmployee) throw new Error(`Regel ${line}: referentie, omschrijving en verantwoordelijke zijn verplicht.`);
        if (record.reference.length > 150 || record.description.length > 1_000 || (record.notes || '').length > 5_000) throw new Error(`Regel ${line}: één of meer tekstvelden zijn te lang.`);
        const naturalKey = `${record.date}|${record.reference.toLocaleLowerCase('nl-NL')}`;
        if (existing.has(naturalKey) || imported.has(naturalKey)) throw new Error(`Regel ${line}: activiteit ${record.reference} bestaat al op ${record.date}.`);
        imported.add(naturalKey);
        return {
          id: crypto.randomUUID(),
          date: record.date,
          startTime: record.startTime,
          endTime,
          activityType: record.activityType as ActivityType,
          reference: record.reference,
          description: record.description,
          originLocation: record.originLocation || '',
          destinationLocation: record.destinationLocation || '',
          expectedPallets: integer(record.expectedPallets, 'expectedPallets', line),
          expectedCases: integer(record.expectedCases, 'expectedCases', line),
          expectedItems: integer(record.expectedItems, 'expectedItems', line),
          responsibleEmployee: record.responsibleEmployee,
          status,
          notes: record.notes || '',
          slotConfirmed: ['true', '1', 'ja'].includes((record.slotConfirmed || '').toLocaleLowerCase('nl-NL')),
          appointmentContact: record.appointmentContact || undefined,
        };
      });
      saveActivities(activities);
      setMessage(`${activities.length} activiteiten atomair geïmporteerd.`);
    } catch (error) {
      setMessage(`Import niet uitgevoerd: ${error instanceof Error ? error.message : 'onbekende fout'}`);
    } finally {
      setBusy(false);
    }
  };

  return <div>
    <label className={`inline-flex min-h-11 items-center rounded-xl bg-navy px-4 py-2.5 text-sm font-bold text-white ${!canEdit || busy ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}>CSV met planning kiezen<input disabled={!canEdit || busy} className="sr-only" type="file" accept=".csv,text/csv" onChange={(event) => {const file = event.target.files?.[0]; event.target.value = ''; if (file) void load(file);}} /></label>
    {message && <p aria-live="polite" className="mt-3 text-sm font-semibold">{message}</p>}
    <a href="/import-examples/planning-example.csv" download className="mt-3 block text-sm font-bold text-accent">Download voorbeeldbestand</a>
    <p className="mt-2 text-xs text-slate-500">Ondersteunt geldige CSV met komma’s, aangehaalde tekstvelden en maximaal 1.000 regels. De hele import slaagt of er wordt niets gewijzigd.</p>
  </div>;
}
