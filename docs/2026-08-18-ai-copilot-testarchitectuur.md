# Inco Assist testarchitectuur — 18 augustus 2026

## Besluit

De eerste versie werkt zonder Odoo. De operationele kern is bron-onafhankelijk, zodat een latere Odoo-koppeling als adapter kan worden toegevoegd zonder dashboard, Inco Assist of bedrijfsregels opnieuw te bouwen.

## Gegevensstroom

`Handmatig / CSV / demo → connectorcontract → canoniek operationeel model → dashboard en Inco Assist`

Later:

`Odoo / 3PL / vervoerder → connectorcontract → hetzelfde canonieke model`

## Vaste ontwerpregels

- Een intern UUID blijft de primaire sleutel.
- Externe systemen leveren alleen `source.system` en `source.externalId`.
- Bron, actualiteit en synchronisatiestatus blijven zichtbaar per record.
- Inco Assist leest operationele feiten uitsluitend via vaste functies.
- SOP-tekst is referentiemateriaal en wordt nooit als modelinstructie behandeld.
- Leesfuncties geven operationele feiten terug; schrijffuncties mogen uitsluitend een gestructureerd voorstel voorbereiden.
- Een klant of zending wordt pas in browseropslag gewijzigd nadat de gebruiker het voorstel expliciet bevestigt.
- Berichten, externe systemen, financiële gegevens en compliancebesluiten worden niet automatisch gewijzigd.
- `OPENAI_MODEL` bepaalt het model; standaard is `gpt-5.6-luna`.
- Zonder `OPENAI_API_KEY` werkt alleen de gemarkeerde previewmodus.

## Voorbereide Inco Assist-functies

- Eén zending opzoeken via zending-, order- of trackingreferentie.
- Zendingen filteren op richting, status en aandachtspunt.
- Operationele dagstartsamenvatting maken.
- Open acties per eigenaar ophalen.
- SOP’s inhoudelijk doorzoeken.
- Artikel- en voorraadstatus opzoeken.
- Planning, relaties, orderchecks en voorraadbewegingen doorzoeken.
- Dezelfde keuzehulp voor intern uitvoeren of 3PL gebruiken als de portal, inclusief zichtbare aannames.
- Een nieuwe klant voorbereiden en na bevestiging in browseropslag aanmaken.
- Een nieuwe zending voorbereiden en na bevestiging in browseropslag aanmaken.
- Een bestaande zending exact op referentie vinden en een status-, tracking- of planningswijziging laten bevestigen.

## Huidige opslag- en beveiligingsgrens

De demo bewaart wijzigingen nog in `localStorage`. Daardoor zijn records alleen beschikbaar binnen dezelfde browser en hetzelfde domein. Serverwebhooks, andere gebruikers en andere apparaten kunnen deze gegevens niet delen. Voor operationeel gebruik zijn een centrale database, login, rollen, auditlog en duurzame rate limiting verplicht.

De publieke Netlify-versie mag daarom alleen testgegevens bevatten. Het OpenAI-project hoort daarnaast een eigen budgetlimiet te behouden.

## Odoo later

De placeholder `lib/connectors/odoo.ts` implementeert hetzelfde connectorcontract als toekomstige CSV-, 3PL- en vervoerdersadapters. De eerste Odoo-fase hoort read-only te zijn. Veldmapping, rechten, versie en API-toegang worden pas vastgesteld wanneer Inco-Source daar klaar voor is.

## E-mail later

Een mailboxkoppeling volgt hetzelfde voorstelmodel: een nieuw bericht wordt gelezen, geclassificeerd en omgezet in een controleerbaar concept. E-mail verwerkt nooit zelfstandig een definitieve mutatie. Zie `docs/email-integratie-inco-assist.md` voor Gmail-, Microsoft 365-, database- en beveiligingsvereisten.
