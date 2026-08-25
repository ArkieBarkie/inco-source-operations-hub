# Inco-Source portal — security- en Odoo-readiness

Audit en herstelcontrole: 25 augustus 2026
Doel: veilige demonstratie op 9 september en voorbereiding op een latere Odoo-koppeling
Lokale herstelbranch: `codex/audit-readiness`

## Conclusie

**Live baseline vóór hersteldeploy: NO-GO.** De oude Netlify-versie is op 25 augustus read-only gemeten als publiek toegankelijk: `/` en een rechtstreeks SOP-document antwoordden met `200`, `/login` bestond niet, `/api/copilot/status` antwoordde anoniem met `200` en de geteste securityheaders ontbraken.

**Huidige live portal: GO voor een begeleide demonstratie met uitsluitend testdata.** Netlify-deploy `6a8d83b6a5e991d416e0a119` draait commit `d73ff32e88e4` in expliciete `demo`-stand. Anonieme pagina’s gaan naar `/login`, API’s geven `401`, SOP’s zijn afgeschermd, securityheaders zijn live gemeten en de persoonlijke accounts `jorn`/`hidde` (`editor`) en `erik` (`admin`) zijn live getest.

**Operationeel gebruik met echte data en Odoo-write-back: NO-GO** totdat de database/RLS-isolatie met twee tenants, back-up/herstel, monitoring, MFA/SSO-besluit en Odoo-sandboxmapping aantoonbaar zijn getest. Import en write-back blijven daarom in de code uitgeschakeld.

## Bewijscategorieën

- **Live/code verified:** rechtstreeks gezien in de live HTTP-respons of in de actuele broncode.
- **Measured:** uitgevoerd tegen de lokale development- of productiebuild.
- **Professional advice:** aanbevolen beheersmaatregel waarvoor een bedrijfs- of providerkeuze nodig is.
- **Not verified:** niet veilig of niet mogelijk te testen zonder productiecredentials, Postgres of Odoo-sandbox.

## Beknopte scorecard

| Onderdeel | Oude live baseline | Huidige live demo | Bewijs |
| --- | ---: | ---: | --- |
| Authenticatie en accounts | 1/10 | 8.5/10 | Live/code verified + measured |
| Autorisatie en rollen | 1/10 | 8.5/10 | Live API-rolmatrix |
| Tenant- en data-isolatie | 1/10 | 6/10 | Code verified; database niet geverifieerd |
| Secrets en configuratie | 4/10 | 8.5/10 | Live health/release verified |
| Invoervalidatie en foutafhandeling | 5/10 | 8.5/10 | Code verified + measured build/UI |
| Sessies en API-beveiliging | 1/10 | 8.5/10 | Live measured + code verified |
| Odoo-readiness | 2/10 | 6.5/10 | Connector code verified; sandbox niet geverifieerd |
| Logging, audit en privacy | 3/10 | 7/10 | Code verified; externe monitoring/retentie open |
| Build en dependencies | 6/10 | 9/10 | Netlify build + dependency audit measured |
| **Totaal** | **2.7/10** | **7.9/10** | GO uitsluitend voor begeleide demo met testdata |

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
| P0 | Live Netlify-deploy | De oude portal en SOP’s waren anoniem bereikbaar. | **Opgelost en live verified.** De demo draait afgeschermd op commit `d73ff32e88e4`. | Afgerond | Anoniem `/` → login, API → 401, oude SOP-URL niet publiek, nieuwe SOP-route alleen na login. |
| P0 | Live `/api/copilot/status` en copilotroute | De oude statusroute was publiek; dit kon misbruik en kosten veroorzaken. | **Opgelost en live verified.** Activeer echte AI-antwoorden pas met een bevestigd projectbudget. | Code afgerond; budgetbesluit open | Anonieme status/chat → 401; alleen admin test verbinding; limieten code verified; providerbudget nog controleren. |
| P0 | `migrations/001_portal_security.sql`, `lib/database.ts` | RLS en tenanttransacties zijn code verified maar niet tegen Postgres getest; configuratiefouten kunnen tenantdata mengen. | Migreer een geïsoleerde database met aparte migratie- en runtime-rollen; test tenant A/B en optimistic locking. | 0.5–1 dag | Runtime-rol heeft geen superuser/BYPASSRLS/schema; A leest/schrijft nooit B; gelijktijdige edit geeft 409; hersteltest slaagt. |
| P0 | Netlify-omgeving en release | Onjuiste runtime-/Edge-scope kon de portal open of onbruikbaar maken. | **Opgelost en live verified.** Sessiesleutel, accounts, origin, demo-modus en release staan afgeschermd in productie. | Afgerond | `/api/health` is 200 op `d73ff32e88e4`, `demo`, auth actief; rolmatrix en headers live geslaagd. |
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
- Oude live baseline op 25 augustus: `/` 200 zonder auth, `/login` 404, `/api/health` 404, `/api/copilot/status` 200, rechtstreeks SOP-document 200, geteste securityheaders afwezig.
- Nieuwe live deploy `6a8d83b6a5e991d416e0a119`: health 200 op commit `d73ff32e88e4`, `demo`, auth actief; anoniem 307/401; oude SOP-URL 307; volledige CSP/HSTS/frame/no-sniff/noindex/no-store-headers aanwezig.
- Live accounts: Jorn en Hidde loggen in als `editor`, Erik als `admin`; editor krijgt 403 op admin/Odoo-beheer, admin ziet exact drie accounts; geen e-mailvelden, hashes of tokens in het accountoverzicht.
- Live sessiecookies: HttpOnly, Secure en SameSite=Strict; geauthenticeerde SOP-download 200 met correct DOCX-MIME en `no-store`.
- Secretscan van werkboom en Git-zoekactie: geen echte portal-, OpenAI-, database- of Odoo-credentials gevonden; lokale testcredentials zijn niet naar bestanden geschreven.

## Niet geverifieerd

- Werkelijke Postgres-migratie, RLS met twee tenants, runtime grants, back-up en restore: lokaal was geen Postgres/Docker beschikbaar.
- Odoo-plan, Odoo-versie, company IDs, bot-user, record rules, dynamische `/doc`-velden en API-sleutel.
- OpenAI-projectbudget/alerts en externe foutmonitoring.
- MFA/SSO-keuze en beheerproces voor periodieke wachtwoordrotatie.

## Go-livevolgorde

1. Installeer de eerstvolgende beveiligingspatch voor Next.js die vóór de release beschikbaar is; herhaal build en audit.
2. **Afgerond:** persoonlijke accountnamen en Netlify-secrets geconfigureerd; tijdelijke wachtwoorden afzonderlijk overdragen en daarna wijzigen.
3. **Afgerond:** gereviewde commit live gedeployed en volledige rolmatrix uitgevoerd.
4. Voor 9 september: gebruik uitsluitend de afgeschermde `demo`-stand met testdata.
5. Voor echte data: migreer Postgres, test twee tenants, back-up/restore, MFA/SSO en monitoring.
6. Daarna pas: Odoo read-only sandboxpreview en mappingacceptatie; write-back blijft een afzonderlijk go/no-go-besluit.
