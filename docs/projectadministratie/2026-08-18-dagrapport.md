# Dagrapport — 18 augustus 2026

## Resultaat van de dag

De ingevulde vragenlijst van Jorn is verwerkt in de bedrijfsregels, relevante SOP's, dashboardonderdelen en projectdocumentatie. Daarnaast is een realistische testomgeving gebouwd, Inco Assist met een server-side OpenAI API gekoppeld en is de demo openbaar gepubliceerd op Netlify.

De versie van vandaag is **geschikt voor demonstratie met testgegevens**. Zij is nog niet geschikt voor gedeeld dagelijks gebruik met echte klant-, order- of e-mailgegevens, omdat gebruikerslogin, centrale database, duurzame auditlog en gedeelde rate limiting nog ontbreken.

## 1. Intake en bedrijfskennis

- Het originele retourbestand van Jorn is gearchiveerd in `artifacts/intake/2026-08-18`.
- Zeven korte antwoorden zijn genormaliseerd zonder ontbrekende details zelf in te vullen.
- Bevestigde regels zijn centraal vastgelegd in `data/company-profile.ts`.
- Verwerkt zijn onder meer minimumorderwaarden, marge- en winstgrenzen, leveranciersvoorkeuren, verplichte productvelden, Odoo als huidig order-/factuursysteem en de gewenste wekelijkse sturing.
- De onduidelijke eenheid bij circa 1.500 per jaar blijft expliciet als open punt geregistreerd.
- Een verwerkte en controleerbare kopie van de vragenlijst staat in `outputs/jorn-vragenlijst-verwerkt-20260818`.

## 2. SOP's en proceskennis

- SOP-001, SOP-002, SOP-003 en SOP-009 zijn inhoudelijk aangevuld op basis van Jorns bevestigde antwoorden.
- De bronbestanden, Word-versies, publieke downloads en doorzoekbare SOP-data zijn opnieuw opgebouwd.
- De oude ontvangst- en transport-SOP's die inhoudelijk zijn samengevoegd blijven herkenbaar als vervallen, zodat geen dubbele werkwijze ontstaat.
- Een afzonderlijke impactanalyse beschrijft welke latere SOP-verwijzingen nodig zijn voor Inco Assist, e-mailinname, bevestigde wijzigingen en audittrail. Deze voorstellen zijn nog niet stilzwijgend in gecontroleerde SOP's doorgevoerd.

## 3. Operations Hub en testomgeving

- Dashboard, dagstart, planning, acties, relaties, zendingen, voorraad, voorraadbewegingen, orderchecks, processen, SOP's en de intern/3PL-keuzehulp zijn voor de demo gevuld en bruikbaar gemaakt.
- De testdata is ingericht rond een realistisch volume van circa 25 zendingen per week.
- Zendingen hebben herkenbare bedrijfsnamen, routes, orderreferenties, trackinginformatie, statussen, tijdlijnen en aandachtspunten.
- Relaties, voorraad, planning, acties en orderchecks sluiten aan op dezelfde demosituatie.
- Testdata blijft als testdata herkenbaar en kan los van handmatig ingevoerde browserdata worden verwijderd.
- De operationele kern gebruikt UUID's, externe bron-ID's en bronmetadata, zodat Odoo of een 3PL later via een connector kan worden aangesloten.

## 4. Inco Assist

- De functienaam is definitief **Inco Assist**; eerdere termen als AI Copilot, Pulse en Inquire Assist zijn niet de productnaam.
- Het gekozen standaardmodel is `gpt-5.6-luna`, passend bij de wens om de demo zo goedkoop mogelijk te laten draaien.
- De OpenAI-sleutel staat uitsluitend als server-side omgevingsvariabele en wordt niet naar de browser gestuurd.
- OpenAI-antwoorden worden aangeroepen met `store: false`.
- Inco Assist kan zendingen, planning, acties, relaties, voorraad, orderchecks, SOP's en de intern/3PL-keuzehulp raadplegen.
- De assistent kan nu ook een klant aanmaken, een zending aanmaken en een bestaande zending bijwerken.
- Iedere wijziging verschijnt eerst als een gestructureerd voorstel. De gebruiker moet expliciet op de bevestigingsknop drukken voordat de browsergegevens worden gewijzigd.
- De assistent mag niet beweren dat iets al is opgeslagen wanneer alleen een voorstel is opgesteld.
- Markdown wordt veilig en leesbaar weergegeven; zichtbare dubbele sterretjes en decoratieve stericonen zijn verwijderd.

## 5. Verbruik en beveiligingsgrenzen

- Standaardlimiet: 20 vragen per 10 minuten per client-IP.
- Standaardlimiet: 100 vragen per rollende 24 uur per client-IP.
- Maximale aanvraagomvang: 250.000 tekens.
- Maximale modeluitvoer: 700 tokens per antwoord.
- De API-statuscontrole retourneert geen sleutel.
- De lokale/in-memory teller reset bij een nieuwe instance en is niet gedeeld over cloudinstances. Voor echte productie is duurzame gedeelde rate limiting nodig.
- De publieke demo heeft nog geen gebruikerslogin. Daarom mogen er alleen testgegevens in worden gebruikt en hoort in OpenAI een projectbudget/spend limit actief te blijven.

## 6. E-mailintegratie onderzocht

- Zowel Microsoft 365/Outlook als Google Workspace/Gmail kan via OAuth en webhooks worden aangesloten.
- De veilige eerste route is alleen-lezen: nieuwe berichten worden geclassificeerd en omgezet in een voorstel, nooit direct in een definitieve boeking.
- E-mailtekst en bijlagen gelden als onbetrouwbare brondata; instructies uit een e-mail worden niet als AI-instructie uitgevoerd.
- Bank-, betaal-, compliance- en andere kritieke wijzigingen blijven altijd buiten automatische verwerking.
- Volledig automatische e-mailinname vereist eerst een gedeelde database voor tokens, deduplicatie, voorstellen en auditgegevens.
- Het technische ontwerp en de officiële bronverwijzingen staan in `docs/email-integratie-inco-assist.md`.

## 7. Publicatie en versiebeheer

- Broncode staat in GitHub: `ArkieBarkie/inco-source-operations-hub`.
- Werkbranch: `agent/publish-inco-assist`.
- Relevante commits van vandaag:
  - `627cfe5` — portal en Inco Assist gepubliceerd;
  - `679ee5b` — lokale Netlify-state uitgesloten;
  - `bad4e45` — bevestigde schrijfvoorstellen toegevoegd.
- Productiedemo: https://incohub.netlify.app
- Inco Assist: https://incohub.netlify.app/copilot
- Hosting: Netlify, waarbij de OpenAI-sleutel als server-side omgevingsvariabele is ingesteld.

## 8. Uitgevoerde controles

- TypeScript-typecheck succesvol.
- Productiebuild succesvol.
- Lokale API-tests voor klant aanmaken, zending aanmaken en zending bijwerken succesvol.
- Browsercontrole op bevestigingskaarten en werkelijk opslaan van klant/zending succesvol.
- Live API gaf een schrijfvoorstel terug zonder ten onrechte te claimen dat de klant al was opgeslagen.
- Live pagina gecontroleerd op nieuwe tekst, suggesties, naamgeving en afwezigheid van decoratieve sterretjes.

## 9. Open risico's en aandachtspunten

- Browseropslag is niet gedeeld tussen gebruikers, apparaten of browsers.
- Er zijn nog geen accounts, rollen, autorisaties of centrale auditlog.
- De publieke demo kan ondanks de app-limieten AI-verbruik veroorzaken.
- Een dependency-audit meldt drie high-severity productiealerts in de huidige Next.js-keten. De aangeboden automatische oplossing vereist een grote Next.js-upgrade en is daarom niet zonder gecontroleerde regressietest afgedwongen.
- E-mail, Odoo en 3PL zijn nog niet verbonden.
- Geen echte persoonsgegevens, commerciële dossiers of vertrouwelijke e-mails gebruiken voordat de productiefundering gereed is.

## 10. Aanbevolen eerstvolgende stap

Voeg een centrale database, gebruikerslogin, rollen, auditlog en duurzame rate limiting toe. Kies daarna of de eerste mailboxkoppeling Microsoft 365/Outlook of Gmail wordt. Begin met één map of label en laat Inco Assist uitsluitend controleerbare conceptvoorstellen maken.

## 11. ARKline-bedrijfsadministratie

- De centrale `ArklineBedrijfsdashboard2026.xlsx` is als primaire administratie bijgewerkt; losse uren- en actiebladen zijn niet parallel gevuld om dubbelingen te voorkomen.
- Voor 18-08-2026 is 4,75 uur voorlopig geregistreerd onder Inco-Source, van 15:45 tot 20:30. Tarief, declarabiliteit, factuurafspraak en formele opdrachtgegevens moeten nog worden bevestigd vóór facturatie.
- Klant ARK-K003 en project PRJ-2026-003 bevatten de actuele demostatus, het live adres, de open veiligheidsvoorwaarden en de eerstvolgende mijlpaal.
- Acties A039 tot en met A044 dekken formele opdrachtgegevens, productiefundering, mailboxkeuze, begeleide acceptatietest, dependency-upgrade en privacy/verwerkersafspraken.
- Het klantdossier en projectstartdocument zijn bijgewerkt. Technische projectstukken zijn als beheerde kopie in de projectmap opgenomen.
- De voorafgaande dashboard- en dossierbestanden zijn vóór vervanging herkenbaar gearchiveerd in `99 - Archief`.
