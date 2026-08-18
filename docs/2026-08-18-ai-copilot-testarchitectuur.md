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
- De testversie is read-only: geen boekingen, berichten of externe wijzigingen.
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

## Odoo later

De placeholder `lib/connectors/odoo.ts` implementeert hetzelfde connectorcontract als toekomstige CSV-, 3PL- en vervoerdersadapters. De eerste Odoo-fase hoort read-only te zijn. Veldmapping, rechten, versie en API-toegang worden pas vastgesteld wanneer Inco-Source daar klaar voor is.
