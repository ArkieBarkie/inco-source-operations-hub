# Inco-Source Operations Hub

Een compacte Operations Hub voor Jorn en Hidde: dagstart, planning, acties en afwijkingen, zendingen, voorraad, relaties, orderchecks, SOP’s en de voorstelgestuurde assistent Inco Assist.

## Eerste Inco Assist-testversie

- Registreer inbound, outbound, transfers en retouren in `Zendingen`.
- De browser krijgt automatisch een duidelijk gemarkeerde testomgeving met 25 zendingen per week, relaties, planning, acties, voorraad en orderchecks.
- Open `Inco Assist` en kies een actuele `IS-IN-…`- of `IS-OUT-…`-referentie uit het zendingenoverzicht.
- Ieder operationeel antwoord toont de geraadpleegde bron en laatste update.
- Zonder OpenAI API-sleutel draait Inco Assist in een gemarkeerde, deterministische previewmodus.
- Inco Assist kan klanten en zendingen voorbereiden en bestaande zendingen bijwerken. Iedere wijziging verschijnt als voorstel en wordt pas na een expliciete bevestiging in de browser opgeslagen.

Ieder testrecord is herkenbaar aan `TESTDATA`, een `TEST-`-referentie of het bronlabel `Testgegevens`. De complete testomgeving kan vanuit `Zendingen` worden verwijderd zonder handmatig ingevoerde records te wissen.

## Lokaal starten

```powershell
npm install
Copy-Item .env.example .env.local
npm run dev
```

Vul voor echte AI-antwoorden in `.env.local` in:

```dotenv
OPENAI_API_KEY=...
OPENAI_MODEL=gpt-5.6-luna
```

Maak de sleutel aan via [OpenAI API keys](https://platform.openai.com/api-keys), zorg dat API-facturatie actief is en herstart daarna `npm run dev`. Open vervolgens `Inco Assist` en klik op **Test verbinding**. De controle genereert één minimaal `OK`-antwoord met `store: false`, zodat ook tegoed, modeltoegang en de Responses API daadwerkelijk worden getest.

De API-sleutel is uitsluitend server-side. Gebruik nooit een `NEXT_PUBLIC_OPENAI_API_KEY` en plak een sleutel niet in de chat of in broncode. `GET /api/copilot/status` toont alleen of configuratie aanwezig is; `POST /api/copilot/status` controleert de sleutel en modeltoegang zonder de sleutel terug te sturen.

De chat zelf gebruikt de OpenAI Responses API met function calling. Operationele feiten komen uit afgeschermde functies voor zendingen, dagstart, planning, acties, relaties, orderchecks, voorraad, SOP’s en de intern/3PL-keuzehulp. Schrijffuncties leveren uitsluitend een gestructureerd voorstel; de browser voert dit pas uit na bevestiging. Responses worden niet opgeslagen bij OpenAI (`store: false`) en het antwoord toont model, bronnen en tokenverbruik.

De testversie begrenst AI-verbruik standaard op 20 vragen per 10 minuten en 100 vragen per rollende 24 uur per client-IP. Een aanvraag mag maximaal 250.000 tekens bevatten en ieder modelantwoord blijft begrensd op 700 outputtokens. Pas de app-limieten indien nodig aan met `COPILOT_REQUESTS_PER_10_MINUTES`, `COPILOT_REQUESTS_PER_24_HOURS` en `COPILOT_MAX_REQUEST_CHARACTERS`.

Deze lokale teller is hard binnen één draaiende app-instance, maar reset bij een serverherstart en wordt niet tussen meerdere cloudinstances gedeeld. Gebruik vóór publieke uitrol een gedeelde rate-limitopslag en stel daarnaast in OpenAI een hard project-spend limit in.

## Architectuur

Deze testversie bewaart operationele invoer nog lokaal in de browser. De zendingenkern gebruikt wel al:

- interne UUID’s;
- aparte externe bron-ID’s;
- bron- en synchronisatiemetadata;
- een canoniek zendingenmodel;
- een connectorcontract voor externe systemen;
- een read-only Odoo-adapterplaceholder.

CSV/Excel, een 3PL of Odoo kunnen daardoor later naar hetzelfde model vertalen. Dashboard en Inco Assist hoeven bij een toekomstige koppeling niet opnieuw gebouwd te worden. De bevestigde bedrijfsregels staan centraal in `data/company-profile.ts`.

## Publiceren

Inco Assist gebruikt een serverroute en kan daarom niet als volledige app op GitHub Pages draaien. De actieve demonstratie draait op Netlify: [incohub.netlify.app](https://incohub.netlify.app). Stel `OPENAI_API_KEY` en `OPENAI_MODEL` uitsluitend als server-side omgevingsvariabelen in.

De GitHub Actions-workflow voert voorlopig alleen een productiebuild uit. Centrale accounts en gedeelde databaseopslag zijn de logische vervolgstap na validatie van deze testversie.

De huidige openbare versie is uitsluitend een demo met testgegevens. Zonder gebruikerslogin kan een onbekende bezoeker AI-verbruik veroorzaken en browsergegevens zijn niet gedeeld. Voeg vóór echte bedrijfsdata of bredere uitrol centrale opslag, accounts, rollen, auditlogging, deployment protection en duurzame rate limiting toe.

## Projectadministratie

De actuele projectstatus, dagrapporten, urenregistratie, besluiten, roadmap en SOP-impactanalyse staan in [`docs/projectadministratie`](docs/projectadministratie/README.md).
