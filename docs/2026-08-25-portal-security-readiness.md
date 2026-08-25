# Inco-Source portal — security- en Odoo-readiness

Audit en herstelcontrole: 25 augustus 2026
Doel: veilige demonstratie op 9 september en voorbereiding op een latere Odoo-koppeling
Lokale herstelbranch: `codex/audit-readiness`

## Conclusie

**Huidige live portal: NO-GO.** De live Netlify-versie is op 25 augustus read-only gemeten als publiek toegankelijk: `/` en een rechtstreeks SOP-document antwoordden met `200`, `/login` bestond niet, `/api/copilot/status` antwoordde anoniem met `200` en de geteste securityheaders ontbraken. Gebruik de live URL daarom niet met echte persoonsgegevens, Odoo-credentials of operationele data.

**Lokale herstelbranch: conditionele GO voor een begeleide demonstratie met testdata.** De branch heeft individuele accounts, viewer/editor/admin-rollen, tenantclaims, server-side API-autorisatie, een afgeschermde demo-stand, beveiligde SOP-downloads, invoervalidatie, securityheaders, healthcheck en een read-only Odoo-preview. De productiebuild en lokale accountmatrix zijn geslaagd.

**Operationeel gebruik en Odoo-write-back: NO-GO** totdat de database/RLS-isolatie met twee tenants, back-up/herstel, Netlify-configuratie, echte accounts, monitoring en Odoo-sandboxmapping aantoonbaar zijn getest. Import en write-back blijven daarom in de code uitgeschakeld.

## Bewijscategorieën

- **Live/code verified:** rechtstreeks gezien in de live HTTP-respons of in de actuele broncode.
- **Measured:** uitgevoerd tegen de lokale development- of productiebuild.
- **Professional advice:** aanbevolen beheersmaatregel waarvoor een bedrijfs- of providerkeuze nodig is.
- **Not verified:** niet veilig of niet mogelijk te testen zonder productiecredentials, Postgres of Odoo-sandbox.

## Beknopte scorecard

| Onderdeel | Huidig live | Lokale herstelbranch | Bewijs |
| --- | ---: | ---: | --- |
| Authenticatie en accounts | 1/10 | 8.5/10 | Live/code verified + measured |
| Autorisatie en rollen | 1/10 | 8.5/10 | Measured API-rolmatrix |
| Tenant- en data-isolatie | 1/10 | 6/10 | Code verified; database niet geverifieerd |
| Secrets en configuratie | 4/10 | 8/10 | Code verified; Netlify niet geverifieerd |
| Invoervalidatie en foutafhandeling | 5/10 | 8.5/10 | Code verified + measured build/UI |
| Sessies en API-beveiliging | 1/10 | 8/10 | Measured + code verified |
| Odoo-readiness | 2/10 | 6.5/10 | Connector code verified; sandbox niet geverifieerd |
| Logging, audit en privacy | 3/10 | 7/10 | Code verified; externe monitoring/retentie open |
| Build en dependencies | 6/10 | 9/10 | Measured |
| **Totaal** | **2.7/10** | **7.7/10** | Conditioneel |

## Wat lokaal is hersteld

- Persoonlijke accounts uit `PORTAL_USERS_JSON`, bcrypt-wachtwoordhashes, admin-accountoverzicht zonder hashes, rollen `viewer`/`editor`/`admin`, tenantbinding, actieve-status en `sessionVersion`-intrekking.
- Ondertekende HttpOnly-, Secure-in-productie- en SameSite=Strict-sessiecookie, maximale sessieduur, automatische uitlog bij verloop en generieke loginfouten.
- Inloglimieten per IP én per accountnaam; duurzame gedeelde limieten in database-stand en uitsluitend instance-lokale limieten in demo-stand.
- Server-side bescherming van pagina’s en API’s, Origin/CSRF-controle, requestgroottelimieten, correlatie-ID’s en veilige JSON-logging.
- Centrale Postgres-snapshot, optimistic locking, idempotente mutatie-ID’s, auditlog, geforceerde RLS en externe bronidentiteiten per tenant.
- Uniform Zod-schema voor operationele data; validatie bij API-invoer én iedere browsermutatie; atomaire CSV-import met limieten en duplicaatcontrole.
- Publieke SOP-bestanden verplaatst naar private opslag en uitsluitend via een geauthenticeerde, allowlisted downloadroute geleverd.
- Odoo 19 JSON-2-connector uitsluitend server-side en read-only, met HTTPS-eis, vaste hostconfiguratie, timeout, company scope, veldpreviews en uitgeschakelde import/write-back.
- Inco Assist achter authenticatie, admin-only verbindingstest, geminimaliseerde operationele context, gevalideerde voorstellen, `store:false` en rolcontrole vóór toepassing.
- CSP, HSTS, frameblokkade, no-sniff, privacy/referrer/permissions-headers, noindex/robots, veilige foutpagina’s en healthcheck.
- Next.js 16.3.2/React 19.2.7, vastgepinde dependencies, CI-build, dependency-audit, buildprovenance en Dependabot.
- Viewer-bewerkknoppen verwijderd; formulieren en filters voorzien van labels, dialogsemantiek, limieten en mobiele aanraakmaten.

## Geprioriteerde bevindingen

| Prio | Bestand/component | Bevinding en risico | Aanbeveling/status | Inspanning | Acceptatiecriteria |
| --- | --- | --- | --- | --- | --- |
| P0 | Live Netlify-deploy | Portal en SOP’s zijn live anoniem bereikbaar; echte data of credentials kunnen uitlekken. | **Lokaal opgelost, nog niet live.** Deploy alleen een gereviewde commit met echte persoonlijke accounts en secretvariabelen. | 1–2 uur + review | Anoniem `/` → login, API → 401, oude SOP-URL niet publiek, nieuwe SOP-route alleen na login. |
| P0 | Live `/api/copilot/status` en copilotroute | Status is publiek en de oude copilotroute mist de nieuwe accountgrens; misbruik kan kosten en dataverwerking veroorzaken. | **Lokaal opgelost, nog niet live.** Activeer OpenAI pas na deploycheck en projectbudget. | 1 uur | Anonieme status/chat → 401; viewer mag vragen, alleen admin test verbinding; limieten en budgetalarm aantoonbaar. |
| P0 | `migrations/001_portal_security.sql`, `lib/database.ts` | RLS en tenanttransacties zijn code verified maar niet tegen Postgres getest; configuratiefouten kunnen tenantdata mengen. | Migreer een geïsoleerde database met aparte migratie- en runtime-rollen; test tenant A/B en optimistic locking. | 0.5–1 dag | Runtime-rol heeft geen superuser/BYPASSRLS/schema; A leest/schrijft nooit B; gelijktijdige edit geeft 409; hersteltest slaagt. |
| P0 | Netlify-omgeving en release | Lokale beveiliging is niet gelijk aan de huidige live release; runtime/Functions/proxy-scope van secrets is niet geverifieerd. | Configureer `PORTAL_SESSION_SECRET`, echte `PORTAL_USERS_JSON`, `PORTAL_ORIGIN`, expliciete `PORTAL_DATA_MODE` en `RELEASE_COMMIT`; deploy daarna gecontroleerd. | 1–2 uur | `/api/health` is 200, juiste commit/mode/auth, live rolmatrix en securityheaders gelijk aan lokaal. |
| P1 | `lib/auth-*`, admin accountoverzicht | Accountfundering is gereed en gebruikt geen e-mail; productieaccounts/wachtwoorden horen uitsluitend in Netlify. MFA ontbreekt. | Maak persoonlijke editoraccounts voor Jorn en Hidde en een persoonlijk adminaccount voor Erik. Professional advice: SSO/MFA vóór structureel gebruik met echte data. | 1–4 uur; SSO 1–3 dagen | Geen gedeelde accounts; sterke unieke wachtwoorden; intrekking via `active`/`sessionVersion` getest; MFA/SSO-besluit vastgelegd. |
| P1 | `lib/connectors/odoo.ts`, Odoo checklist | API-model en artikel-/zendingvelden zijn niet tegen de eigen Odoo-database gevalideerd; verkeerde bronhouderschap kan data overschrijven. | Gebruik dedicated bot-user, minimale record rules en read-only sandboxpreviews; keur mapping en company scope record voor record goed. | 1–2 dagen | Test/Custom-plan bevestigd; preview ≤20; company A/B afgeschermd; UoM, varianten, barcode, HS/oorsprong/gewicht/verpakking/lots/locaties gereconcilieerd; write-back blijft uit. |
| P1 | Databaseprovider/back-ups | Snapshot en auditlog bestaan in code, maar providerback-up, restore en retentie zijn niet geconfigureerd. | Configureer point-in-time/back-ups, bewaartermijn en kwartaalrestore in geïsoleerde omgeving. | 0.5–1 dag | Gedocumenteerde RPO/RTO; succesvolle restore; tenanttelling en checksums gecontroleerd. |
| P1 | Logging/monitoring | Veilige logs en healthcheck bestaan; externe foutmonitoring en alerts zijn niet verbonden. | Koppel privacyveilige provideralerts op 5xx, health=degraded, loginpieken, DB-fouten en Odoo-fouten; log geen payloads/secrets. | 0.5–1 dag | Testalarm bereikt eigenaar; correlatie-ID traceerbaar; geen operationele notities of credentials in alert. |
| P2 | `docs/privacy-en-gegevensbeleid.md` | Minimalisatie is vastgelegd, maar eigenaar, verwerkersbesluit, export/verwijdering en concrete bewaartermijnen zijn nog niet goedgekeurd. | Beslis termijnen en verwerkingsgrondslag vóór echte data; leg verwerkers/providerafspraken vast. | 2–4 uur + juridisch besluit | Goedgekeurd register met eigenaar, doel, ontvangers, termijnen, export/verwijdertest en incidentroute. |
| P2 | CSP in `next.config.mjs`/`netlify.toml` | CSP blokkeert frames/objecten maar gebruikt nog `unsafe-inline` voor script/style wegens frameworkcompatibiliteit. | Professional advice: migreer later naar nonce/hash-CSP en rapporteer schendingen eerst in report-only. | 0.5–1 dag | Productie werkt zonder `unsafe-inline`; CSP-rapportage toont geen noodzakelijke blokkades. |
| P2 | UI en formulieren | Kritieke account-, planning-, zending-, relatie- en SOP-flows zijn lokaal getest; geen volledige WCAG- of screenreaderaudit uitgevoerd. | Voer toetsenbord-, contrast- en screenreaderronde uit met Jorns demonstratiescenario’s. | 0.5 dag | Alle functies toetsenbordbedienbaar, focus zichtbaar, namen/rollen/waarden correct, 320/390 px zonder blokkades. |
| P3 | `portal_rate_limit_buckets` | Duurzame limieten werken, maar oude buckets hebben nog geen geplande cleanup. | Voeg providerjob of onderhoudstaak toe die verlopen buckets verwijdert. | 1 uur | Rijen ouder dan gekozen termijn worden periodiek verwijderd zonder actieve vensters te raken. |
| P3 | End-to-end regressie | De rolmatrix en mobiele flows zijn handmatig measured; er is nog geen geautomatiseerde browserregressiesuite in CI. | Automatiseer login/rollen/SOP/CSRF/409/health en een mobiele kernflow. | 1–2 dagen | CI faalt bij auth-regressie en bewaart foutartefacten zonder secrets. |

## Uitgevoerde metingen

- `npm run verify`: TypeScript en productiebuild geslaagd; alle 36 relevante pagina-/API-routes gebouwd.
- `npm audit --audit-level=high`: **0 vulnerabilities** op 25 augustus 2026.
- Lokale API-matrix: anoniem 307/401; foutieve login 401; viewer-read 200 en writes/integratie/admin 403; editor-write in demo 409; kwaadaardige Origin 403; admin Odoo-status en accountlijst 200.
- Admin-accountlijst: drie lokale testaccounts, geen `passwordHash` in de respons.
- Geauthenticeerde SOP-download: 200, correct DOCX-MIME, attachment en `no-store`; oude publieke URL wordt naar login gestuurd.
- Lokale productie zonder configuratie: health 503 `degraded`, anonieme pagina 307, API 401, kwaadaardige Origin 403; CSP bevat productie niet `unsafe-eval`; HSTS, DENY, noindex en no-store aanwezig.
- Browser: viewer-, editor- en adminflow; editorvalidatie en lokale save; viewer zonder bewerkacties; adminaccountoverzicht; mobiele navigatie en dashboard op 390×844 en 320×700.
- Live Netlify op 25 augustus: `/` 200 zonder auth, `/login` 404, `/api/health` 404, `/api/copilot/status` 200, rechtstreeks SOP-document 200, geteste securityheaders afwezig.
- Secretscan van werkboom en Git-zoekactie: geen echte portal-, OpenAI-, database- of Odoo-credentials gevonden; lokale testcredentials zijn niet naar bestanden geschreven.

## Niet geverifieerd

- Werkelijke Postgres-migratie, RLS met twee tenants, runtime grants, back-up en restore: lokaal was geen Postgres/Docker beschikbaar.
- Netlify environment scopes, nieuwe releasecommit en headers na deploy.
- Odoo-plan, Odoo-versie, company IDs, bot-user, record rules, dynamische `/doc`-velden en API-sleutel.
- OpenAI-projectbudget/alerts en externe foutmonitoring.
- MFA/SSO-keuze en beheerproces voor periodieke wachtwoordrotatie.

## Go-livevolgorde

1. Installeer de eerstvolgende beveiligingspatch voor Next.js die vóór de release beschikbaar is; herhaal build en audit.
2. Maak persoonlijke accounts en configureer de Netlify-secrets zonder ze in Git/chat te plaatsen.
3. Deploy de gereviewde herstelcommit naar een preview en voer de complete rolmatrix uit.
4. Voor 9 september: publiceer desgewenst uitsluitend de afgeschermde `demo`-stand met testdata.
5. Voor echte data: migreer Postgres, test twee tenants, back-up/restore en monitoring.
6. Daarna pas: Odoo read-only sandboxpreview en mappingacceptatie; write-back blijft een afzonderlijk go/no-go-besluit.
