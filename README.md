# Inco-Source Operations Hub

Een compacte Operations Hub voor Jorn en Hidde: dagstart, planning, acties en afwijkingen, zendingen, voorraad, relaties, orderchecks, SOP’s en de voorstelgestuurde assistent Inco Assist.

## Eerste Inco Assist-testversie

- Registreer inbound, outbound, transfers en retouren in `Zendingen`.
- De browser krijgt automatisch een duidelijk gemarkeerde testomgeving met 25 zendingen per week, relaties, planning, acties, voorraad en orderchecks.
- Open `Inco Assist` en kies een actuele `INCO-JJMMDD-##`-referentie uit het zendingenoverzicht.
- Ieder operationeel antwoord toont de geraadpleegde bron en laatste update.
- Zonder OpenAI API-sleutel draait Inco Assist in een gemarkeerde, deterministische previewmodus.
- Inco Assist kan klanten en zendingen voorbereiden en bestaande zendingen bijwerken. Iedere wijziging verschijnt als voorstel en wordt pas na een expliciete bevestiging in de browser opgeslagen.

Ieder testrecord is herkenbaar aan `TESTDATA`, een `TEST-`-referentie of het bronlabel `Testgegevens`. De complete testomgeving kan vanuit `Zendingen` worden verwijderd zonder handmatig ingevoerde records te wissen.

## Lokaal starten

```powershell
npm ci
Copy-Item .env.example .env.local
npm run auth:hash -- "kies-een-lang-uniek-testwachtwoord"
npm run dev
```

Vul de bcrypt-uitvoer in `PORTAL_USERS_JSON` in en zet `PORTAL_SESSION_SECRET` op minimaal 32 willekeurige tekens. Zonder geldige sessieconfiguratie blijft de portal bewust dicht. De demo-stand bewaart uitsluitend testdata onder een tenantgebonden browsersleutel en ververst verouderde testrecords automatisch.

## Accounts en rollen

Maak voor iedere persoon een eigen account in `PORTAL_USERS_JSON`; gebruik geen gedeeld “Inco”-account. De portal kent drie rollen:

- `viewer`: bekijken en downloaden, geen wijzigingen;
- `editor`: operationele gegevens wijzigen, geen account-, audit- of integratiebeheer;
- `admin`: editorrechten plus accountoverzicht, auditlog en read-only integratietests.

Genereer voor ieder account een afzonderlijke bcrypt-hash met `npm run auth:hash -- "een-uniek-lang-wachtwoord"`. Inloggen gebeurt met de unieke `login`; e-mail is niet nodig. De admin ziet in Instellingen alleen naam, accountnaam, rol, status en sessieversie; hashes en tokens worden nooit naar de browser gestuurd. Zet `active` op `false` of verhoog `sessionVersion` om toegang en bestaande sessies van één gebruiker in te trekken. Wijzig de hostingvariabele en deploy daarna de gereviewde commit opnieuw.

Vul voor echte AI-antwoorden in `.env.local` in:

```dotenv
OPENAI_API_KEY=...
OPENAI_MODEL=gpt-5.6-luna
```

Maak de sleutel aan via [OpenAI API keys](https://platform.openai.com/api-keys), zorg dat API-facturatie actief is en herstart daarna `npm run dev`. Open vervolgens `Inco Assist` en klik op **Test verbinding**. De controle genereert één minimaal `OK`-antwoord met `store: false`, zodat ook tegoed, modeltoegang en de Responses API daadwerkelijk worden getest.

De API-sleutel is uitsluitend server-side. Gebruik nooit een `NEXT_PUBLIC_OPENAI_API_KEY` en plak een sleutel niet in de chat of in broncode. `GET /api/copilot/status` toont alleen of configuratie aanwezig is; `POST /api/copilot/status` controleert de sleutel en modeltoegang zonder de sleutel terug te sturen.

De chat zelf gebruikt de OpenAI Responses API met function calling. Operationele feiten komen uit afgeschermde functies voor zendingen, dagstart, planning, acties, relaties, orderchecks, voorraad, SOP’s en de intern/3PL-keuzehulp. Schrijffuncties leveren uitsluitend een gestructureerd voorstel; de browser voert dit pas uit na bevestiging. Responses worden niet opgeslagen bij OpenAI (`store: false`) en het antwoord toont model, bronnen en tokenverbruik.

De portal begrenst AI-verbruik standaard op 20 vragen per 10 minuten en 100 vragen per rollende 24 uur per tenant, gebruiker en client-IP. Een aanvraag mag maximaal 250.000 tekens bevatten en ieder modelantwoord blijft begrensd op 700 outputtokens. Pas de app-limieten indien nodig aan met `COPILOT_REQUESTS_PER_10_MINUTES`, `COPILOT_REQUESTS_PER_24_HOURS` en `COPILOT_MAX_REQUEST_CHARACTERS`.

In database-stand staan AI- en inloglimieten duurzaam in de gedeelde database. Alleen de expliciete demo-stand gebruikt een begrensde teller per draaiende app-instance. Stel daarnaast in OpenAI een hard project-spend limit in.

## Architectuur

De portal kent twee expliciete datastanden:

- `demo`: uitsluitend testdata, tenantgebonden in de aangemelde browser;
- `database`: centrale Postgres-opslag met tenantfiltering, row-level security, optimistic locking en auditlog.

Voer voor database-stand eerst `npm run db:migrate` uit met een aparte migratie-URL. Gebruik voor de draaiende app een databasegebruiker zonder schema- of superuserrechten. De zendingenkern gebruikt:

- interne UUID’s;
- meerdere externe bron-ID’s per record en company scope;
- bron- en synchronisatiemetadata;
- een canoniek zendingenmodel;
- een connectorcontract voor externe systemen;
- een read-only Odoo 19 JSON-2-adapter voor verbindings- en mappingpreviews.

CSV/Excel, een 3PL of Odoo kunnen daardoor later naar hetzelfde model vertalen. Dashboard en Inco Assist hoeven bij een toekomstige koppeling niet opnieuw gebouwd te worden. De bevestigde bedrijfsregels staan centraal in `data/company-profile.ts`.

## Publiceren

Inco Assist gebruikt een serverroute en kan daarom niet als volledige app op GitHub Pages draaien. De actieve demonstratie draait op Netlify: [incohub.netlify.app](https://incohub.netlify.app). Stel `OPENAI_API_KEY` en `OPENAI_MODEL` uitsluitend als server-side omgevingsvariabelen in.

De GitHub Actions-workflow voert typecontrole, productiebuild en een dependency-audit uit en bewaart buildprovenance. Centrale, tenantgebonden databaseopslag is beschikbaar maar moet vóór gebruik met echte data worden gemigreerd en met twee testtenants worden geverifieerd.

Een productiebuild vereist geldige sessievariabelen. De portal beschermt pagina’s, API’s en SOP-downloads, gebruikt HttpOnly/SameSite-sessies, rollen, noindex en securityheaders. In database-stand zijn AI- en loginlimieten duurzaam opgeslagen; zet daarnaast altijd een hard OpenAI-projectbudget.

Odoo blijft read-only totdat de versie/edition, bedrijven, bot-user, record rules, artikelvelden, UoM, locaties, lot/serialbeheer en bronhouderschap in een sandbox zijn bevestigd. De preview importeert of wijzigt niets. Zie [`docs/odoo-integratie-checklist.md`](docs/odoo-integratie-checklist.md).

## Verificatie en deployment

```powershell
npm ci
npm run verify
npm audit --audit-level=high
```

Netlify bouwt reproduceerbaar via `netlify.toml`. De publieke healthcheck `/api/health` toont alleen de releasecommit en beveiligingsmodus. Zet alle secrets in Netlify met runtime/Functions én Edge/Middleware-scope; zet nooit credentials in `netlify.toml`, Git of `NEXT_PUBLIC_*`. Volg vóór livegang [`docs/security-deployment-runbook.md`](docs/security-deployment-runbook.md).

## Projectadministratie

De actuele projectstatus, dagrapporten, urenregistratie, besluiten, roadmap en SOP-impactanalyse staan in [`docs/projectadministratie`](docs/projectadministratie/README.md).
