# Odoo-integratie: verplichte beslissingen en testvolgorde

De portal ondersteunt uitsluitend een read-only preview via de Odoo 19 JSON-2 API. Oudere RPC-API’s zijn bewust niet als standaard ingebouwd omdat Odoo die heeft uitgefaseerd. Bevestig eerst de exacte Odoo-versie en het abonnement; externe API-toegang vereist bij Odoo Online een passend plan.

## Voor de eerste verbinding

- Leg URL, database, company IDs, Odoo-versie/edition en sandbox vast.
- Maak een dedicated bot-user zonder normaal wachtwoord en geef alleen leesrechten op bevestigde modellen/velden.
- Maak een scoped, tijdelijk geldige API-sleutel en leg eigenaar, rotatiedatum en intrekkingsprocedure vast.
- Bevestig `product.template` versus `product.product`, variantstrategie, SKU, barcode, UoM/categorieën en actieve status.
- Map HS-code, oorsprong, gewicht, fabrikantreferentie, verkoop-/inkoopprijs en verpakkingsgrootte vanuit de dynamische `/doc`-documentatie van de eigen database.
- Bevestig `stock.picking`, pickingtypes, magazijnlocaties, move lines, aantallen, vervoerder/tracking en lot-/serienummers.
- Bepaal per veld de bronhouder: Odoo, portal, 3PL of vervoerder. Definieer conflicten, quarantine en wie ze oplost.

## Testvolgorde

1. Test alleen verbinding en gebruikerscontext.
2. Preview maximaal twintig artikelen en zendingen; controleer company scope en record rules.
3. Vergelijk handmatig tien artikelen en tien zendingen met Odoo en documenteer afwijkingen.
4. Voer een volledige read-only extractie uit naar staging; meet aantallen, ontbrekende IDs, duplicaten en cursor/delta.
5. Ontwerp idempotente import op externe identities en checksum, plus een dagelijks reconciliatierapport.
6. Activeer pas daarna portalimport met kill switch. Terugschrijven blijft een apart project met outbox, vier-ogencontrole, retries en compensatie.

Officiële referentie: <https://www.odoo.com/documentation/19.0/developer/reference/external_api.html>.
