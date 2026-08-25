# Projectstatus Inco-Source Operations Hub

Laatst bijgewerkt: 25 augustus 2026

## Samenvatting

| Onderdeel | Status | Toelichting |
| --- | --- | --- |
| Jorn-vragenlijst | Gereed | Antwoorden verwerkt; resterende inhoudelijke vragen staan expliciet open. |
| SOP-verwerking | Gereed voor review | Vier SOP's inhoudelijk bijgewerkt; operationele goedkeuring blijft bij Jorn/Hidde. |
| Operations Hub | Demo gereed | Belangrijkste operationele modules en realistische testdata aanwezig. |
| Inco Assist lezen | Demo gereed | Operationele bronnen en SOP's zijn bevraagbaar. |
| Inco Assist wijzigen | Demo gereed | Klant/zending aanmaken en zending bijwerken na expliciete bevestiging. |
| API en kostenbeheersing | Demo gereed | Server-side sleutel, klein model, output- en vraaglimieten. |
| Publieke hosting | NO-GO tot herdeploy | De live Netlify-release is nog publiek; de afgeschermde herstelbranch is lokaal gereed maar niet gepubliceerd. |
| ARKline-administratie | Bijgewerkt | 4,75 uur voorlopig geregistreerd; klant, project, acties en dossiers verwerkt. |
| Centrale database | Code gereed, test open | Migratie, tenant-RLS, optimistic locking en auditlog zijn gebouwd; Postgres-, back-up- en twee-tenanttest ontbreken. |
| Gebruikers en rollen | Lokaal gereed | Persoonlijke accounts, sessies en viewer/editor/admin-rollen zijn lokaal gemeten; echte accounts en live configuratie ontbreken. |
| E-mailkoppeling | Ontworpen | Providerkeuze en productiefundering ontbreken nog. |
| Odoo-koppeling | Read-only basis gereed | JSON-2-status en mappingpreviews zijn gebouwd; eigen Odoo-sandbox, plan, bedrijven en velden zijn niet geverifieerd. |

## Gereedheidsbesluit

**CONDITIONELE GO voor begeleide demonstraties met uitsluitend testgegevens, nadat de afgeschermde herstelbranch is gedeployed en live geverifieerd.**

**NO-GO voor operationeel gebruik met echte gegevens** totdat minimaal centrale opslag, authenticatie, autorisatie, auditlogging, back-up/herstel en duurzame rate limiting zijn ingericht en getest.

## Actieve omgevingen

- Lokaal: `http://localhost:3010`
- Publieke demo: https://incohub.netlify.app
- Inco Assist: https://incohub.netlify.app/copilot
- Repository: https://github.com/ArkieBarkie/inco-source-operations-hub

## Open keuzes

1. Gebruikt de operationele mailbox Microsoft 365/Outlook of Google Workspace/Gmail?
2. Welke beheerde Postgres-provider, back-uptermijn en RPO/RTO worden gebruikt?
3. Welke personen krijgen admin-, editor- en vieweraccounts; is SSO/MFA vóór echte data vereist?
4. Welke wijzigingen mogen later laag-risico automatisch en welke blijven altijd vier-ogen?
5. Waar staat het opgegeven jaarvolume van circa 1.500 precies voor?
6. Welke velden in Odoo zijn later leidend voor product, voorraad, order en factuur?
7. Welk tarief, factuurmoment, budget en welke formele opdrachtgever horen bij PRJ-2026-003?

## Eerstvolgende mijlpaal

Deploy en verifieer eerst de afgeschermde multi-user demo. Test daarna centrale Postgres-opslag met twee tenants, back-up/herstel en een read-only Odoo-sandboxpreview.
