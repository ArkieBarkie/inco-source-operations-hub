# Roadmap van demo naar operationeel platform

## Fase 0 — demonstratiebasis

Status: gereed op 18 augustus 2026.

- Realistische testdata en kernschermen.
- SOP-zoekfunctie en operationele vraagbeantwoording.
- Bevestigde klant- en zendingmutaties via Inco Assist.
- Server-side OpenAI-koppeling met kostenlimieten.
- Publieke Netlify-demo.

## Fase 1 — productiefundering

Prioriteit: P0 vóór echte bedrijfsdata.

Status 25 augustus: beveiligde multi-user demo live; databaseprovider-, twee-tenant- en herstelacceptatie nog open.

- Centrale relationele database met migraties (**gebouwd**); providerback-up/herstel nog testen.
- Gebruikerslogin, sessiebeheer en rollen (**live gebouwd en gemeten**); MFA/SSO-besluit vóór echte data open.
- Tenant-/organisatiegrenzen en serverautorisatie (**gebouwd**); twee-tenanttest open.
- Centrale auditlog met actor, bron, oud/nieuw, tijdstip en bevestiging (**gebouwd**); retentie open.
- Duurzame rate limiting per gebruiker/organisatie (**gebouwd in database-stand**); providercheck open.
- Geheimenbeheer en privacybasis (**gebouwd/gedocumenteerd**); foutmonitoring en bewaartermijnen open.
- Next.js-upgrade en dependency-audit (**geslaagd; 0 bekende auditbevindingen op 25 augustus**).

Acceptatie: twee gebruikers zien dezelfde data; onbevoegde acties worden server-side geweigerd; iedere mutatie is herleidbaar en herstelbaar.

## Fase 2 — gecontroleerde mailboxpilot

Prioriteit: P1 na fase 1.

- Provider kiezen: Microsoft 365/Outlook of Google Workspace/Gmail.
- Eén mailbox, map of label met alleen-lezen rechten koppelen.
- Webhooks, abonnementvernieuwing, deduplicatie en foutafhandeling.
- E-mail en bijlagen classificeren als order, zending, update, afwijking of niet relevant.
- Gestructureerde voorstellen opslaan en in Inco Assist laten bevestigen.
- Prompt-injection-, privacy-, duplicaat- en bijlagentests uitvoeren.

Acceptatie: geen e-mail wijzigt zelfstandig bedrijfsdata; ieder voorstel toont bronbericht en geëxtraheerde velden; dubbele levering wordt voorkomen.

## Fase 3 — operationele bronkoppelingen

Prioriteit: P1/P2 afhankelijk van klantgesprekken.

- Odoo eerst read-only koppelen voor relaties, orders, facturen en statussen.
- Veldmapping en leidend-systeemafspraken formeel vastleggen.
- 3PL- en vervoerdersdata vertalen naar hetzelfde canonieke model.
- Synchronisatiefouten en conflicten zichtbaar maken.
- Pas na stabilisatie gecontroleerde write-back per proces overwegen.

Acceptatie: bron, laatste synchronisatie en conflictstatus zijn per record zichtbaar; dashboard en Inco Assist gebruiken dezelfde feiten.

## Fase 4 — beheerste automatisering

Prioriteit: P2/P3.

- Laag-risicoacties automatisch voorbereiden of uitvoeren binnen expliciete regels.
- Uitzonderingen, bankgegevens, complianceblokkades en financiële vrijgave altijd menselijk houden.
- KPI's, waarschuwingen en SLA's toevoegen zodra definities en bronnen betrouwbaar zijn.
- Periodieke evaluaties op juistheid, kosten, doorlooptijd en foutpreventie.

Acceptatie: voor iedere automatisering zijn eigenaar, beslisregel, terugvalroute, auditspoor en stopknop aantoonbaar ingericht.
