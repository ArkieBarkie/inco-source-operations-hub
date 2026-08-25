# Security- en deployment-runbook

## Verplichte productievoorwaarden

1. Deploy uitsluitend een schone, gereviewde commit van de bedoelde branch. Vergelijk daarna `/api/health` met die commit.
2. Configureer `PORTAL_SESSION_SECRET` (minimaal 32 willekeurige tekens), `PORTAL_USERS_JSON`, `PORTAL_ORIGIN` en `PORTAL_DATA_MODE` in Netlify voor runtime/Functions én Edge/Middleware.
3. Gebruik per persoon een unieke accountnaam; deel geen wachtwoorden. E-mail is niet vereist. Rollen: `viewer`, `editor`, `admin`. Verhoog `sessionVersion` bij uitdiensttreding of incidenten.
   Genereer iedere hash afzonderlijk met `npm run auth:hash`; controleer daarna als admin het accountoverzicht in Instellingen.
4. Gebruik `demo` alleen met testdata. Zet vóór echte data `database`, voer de migratie uit en test tenantisolatie met twee testtenants.
5. Gebruik voor runtime een Postgres-rol zonder superuser-, bypass-RLS- of schemarechten. Gebruik een andere, tijdelijk beschikbare rol voor migraties.
6. Stel in OpenAI een hard projectbudget en waarschuwingen in. Sla de sleutel alleen server-side op.
7. Zet Odoo alleen als read-only preview aan met een dedicated bot-user, minimale record rules en een kortlopende/roteerbare API-sleutel.

## Acceptatietests

- Anonieme requests naar `/`, `/api/operations`, `/api/copilot` en een SOP-document worden geweigerd of naar `/login` gestuurd.
- Een viewer kan lezen maar krijgt `403` op wijzigingen, AI-verbindingstest, Odoo-preview en auditlog.
- Een editor kan portaldata wijzigen maar geen integraties of auditlog beheren.
- Een admin kan read-only integratiepreviews en het auditlog openen.
- Het admin-accountoverzicht toont alle en alleen accounts van de eigen tenant en bevat nooit `passwordHash` of sessietokens.
- Data van tenant A is nooit zichtbaar of overschrijfbaar met een sessie van tenant B; voer dit ook direct tegen de API uit.
- Twee gelijktijdige edits leveren een `409 version_conflict` in plaats van stil gegevensverlies.
- Securityheaders, `noindex`, correcte 404, foutpagina’s en download-MIME zijn op de gedeployde URL geverifieerd.
- `npm ci`, `npm run verify` en `npm audit --audit-level=high` slagen in CI.

## Incident en herstel

1. Blokkeer de site of trek betrokken accounts in via `active:false`/`sessionVersion`.
2. Roteer portal-, database-, OpenAI- en Odoo-secrets die mogelijk geraakt zijn.
3. Bewaar auditregels en providerlogs; plaats geen persoonsgegevens of operationele notities in tickets.
4. Herstel databaseback-up eerst in een geïsoleerde omgeving, verifieer tenanttelling en referentiële controles, en voer daarna gecontroleerde productieherstel uit.
5. Leg oorzaak, impact, tijdlijn, herstel en preventieve actie vast.
