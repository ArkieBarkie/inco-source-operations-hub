# Projectstatus Inco-Source Operations Hub

Laatst bijgewerkt: 18 augustus 2026

## Samenvatting

| Onderdeel | Status | Toelichting |
| --- | --- | --- |
| Jorn-vragenlijst | Gereed | Antwoorden verwerkt; resterende inhoudelijke vragen staan expliciet open. |
| SOP-verwerking | Gereed voor review | Vier SOP's inhoudelijk bijgewerkt; operationele goedkeuring blijft bij Jorn/Hidde. |
| Operations Hub | Demo gereed | Belangrijkste operationele modules en realistische testdata aanwezig. |
| Inco Assist lezen | Demo gereed | Operationele bronnen en SOP's zijn bevraagbaar. |
| Inco Assist wijzigen | Demo gereed | Klant/zending aanmaken en zending bijwerken na expliciete bevestiging. |
| API en kostenbeheersing | Demo gereed | Server-side sleutel, klein model, output- en vraaglimieten. |
| Publieke hosting | Gereed voor demo | Live op Netlify; nog zonder gebruikerslogin. |
| ARKline-administratie | Bijgewerkt | 4,75 uur voorlopig geregistreerd; klant, project, acties en dossiers verwerkt. |
| Centrale database | Niet gestart | Nodig voor gedeelde data, e-mail en audittrail. |
| Gebruikers en rollen | Niet gestart | Nodig vóór echte bedrijfsdata of bredere uitrol. |
| E-mailkoppeling | Ontworpen | Providerkeuze en productiefundering ontbreken nog. |
| Odoo-koppeling | Bewust uitgesteld | Canoniek model en connectorcontract houden aansluiting later mogelijk. |

## Gereedheidsbesluit

**GO voor begeleide demonstraties met uitsluitend testgegevens.**

**NO-GO voor operationeel gebruik met echte gegevens** totdat minimaal centrale opslag, authenticatie, autorisatie, auditlogging, back-up/herstel en duurzame rate limiting zijn ingericht en getest.

## Actieve omgevingen

- Lokaal: `http://localhost:3010`
- Publieke demo: https://incohub.netlify.app
- Inco Assist: https://incohub.netlify.app/copilot
- Repository: https://github.com/ArkieBarkie/inco-source-operations-hub

## Open keuzes

1. Gebruikt de operationele mailbox Microsoft 365/Outlook of Google Workspace/Gmail?
2. Welke centrale database en authenticatievoorziening worden gebruikt?
3. Welke rollen zijn nodig: beheerder, operatie, alleen-lezen en eventueel externe 3PL?
4. Welke wijzigingen mogen later laag-risico automatisch en welke blijven altijd vier-ogen?
5. Waar staat het opgegeven jaarvolume van circa 1.500 precies voor?
6. Welke velden in Odoo zijn later leidend voor product, voorraad, order en factuur?
7. Welk tarief, factuurmoment, budget en welke formele opdrachtgever horen bij PRJ-2026-003?

## Eerstvolgende mijlpaal

Een afgeschermde multi-user testversie met centrale database, login, rollen, gedeelde voorstellen, auditlog en duurzame kostenlimieten. Pas daarna volgt een read-only mailboxpilot.
