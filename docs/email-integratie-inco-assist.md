# E-mailintegratie voor Inco Assist

## Doel

Nieuwe logistieke e-mails kunnen automatisch worden herkend en omgezet in een controleerbaar voorstel voor een klant, zending, statuswijziging of actie. Een e-mail voert nooit rechtstreeks een wijziging uit.

## Aanbevolen verwerkingsstroom

1. De mailbox meldt een nieuw bericht via een beveiligde webhook.
2. De server haalt alleen het noodzakelijke bericht en relevante bijlagen op.
3. Inco Assist classificeert het bericht als order, zending, statusupdate, afwijking of niet relevant.
4. Gestructureerde velden worden als conceptvoorstel opgeslagen.
5. Jorn of Hidde controleert het voorstel in Inco Assist.
6. Pas na expliciete bevestiging wordt de klant, zending, actie of statuswijziging opgeslagen.
7. Het systeem bewaart bronbericht, tijdstip, bevestiger en aangebrachte wijzigingen als auditspoor.

E-mailtekst en bijlagen gelden altijd als onbetrouwbare brondata. Instructies die in een bericht aan de AI zijn gericht worden nooit uitgevoerd. Bankwijzigingen, betaalgegevens, complianceblokkades en andere kritieke wijzigingen blijven buiten automatische verwerking.

## Gmail-route

- OAuth 2.0 met minimaal `gmail.readonly`; geen verzend- of verwijderrechten in de eerste versie.
- Gmail `users.watch` meldt mailboxwijzigingen via Google Cloud Pub/Sub.
- De mailbox-watch moet minimaal iedere zeven dagen worden vernieuwd; dagelijks vernieuwen is aanbevolen.
- Een server-side refresh token is nodig voor verwerking wanneer niemand de portal open heeft.
- `gmail.readonly` is een restricted scope. Voor breder extern gebruik kan Google OAuth-verificatie nodig zijn.

Officiële documentatie:

- https://developers.google.com/workspace/gmail/api/guides/push
- https://developers.google.com/workspace/gmail/api/auth/scopes
- https://developers.google.com/workspace/gmail/api/auth/web-server

## Microsoft 365 / Outlook-route

- Microsoft Entra OAuth met minimaal Microsoft Graph `Mail.Read`.
- Graph change notifications melden nieuwe berichten op een publieke HTTPS-webhook.
- Outlook-mailabonnementen hebben een beperkte levensduur en moeten vóór verlopen worden vernieuwd.
- De webhook valideert `clientState` en verwerkt het bericht daarna via Microsoft Graph.

Officiële documentatie:

- https://learn.microsoft.com/graph/change-notifications-delivery-webhooks
- https://learn.microsoft.com/graph/change-notifications-overview
- https://learn.microsoft.com/graph/outlook-change-notifications-overview

## Benodigde uitbreiding op de huidige demo

De Operations Hub bewaart handmatige wijzigingen nu in `localStorage`. Een Netlify-webhook draait op de server en kan die browseropslag niet bijwerken. Voor automatische e-mailverwerking is daarom een kleine gedeelde database nodig met minimaal:

- versleutelde OAuth-tokens;
- ontvangen e-mailmetadata en deduplicatiesleutel;
- conceptvoorstellen en bevestigingsstatus;
- operationele records of een synchronisatielaag;
- auditlog met bron, modeluitvoer, bevestiger en tijdstip.

De bestaande `SourceMetadata`-structuur blijft bruikbaar: e-mail krijgt een eigen externe bericht-ID, terwijl een toekomstig Odoo-ID of 3PL-ID daarnaast kan worden gekoppeld.

## Gefaseerde invoering

### Fase 1 — nu geschikt voor demo

- Klant en zending via Inco Assist voorbereiden.
- Zending via Inco Assist bijwerken.
- Altijd bevestiging in de portal.

### Fase 2 — gecontroleerde e-mailproef

- Eén gedeelde mailbox read-only koppelen.
- Alleen nieuwe berichten uit een gekozen map of label verwerken.
- E-mail omzetten in conceptvoorstellen; niets automatisch doorboeken.
- Duplicaten, bijlagen, privacy en prompt-injection testen.

### Fase 3 — operationele integratie

- Gedeelde database en gebruikerslogin.
- Autorisaties per rol en volledige audittrail.
- Na akkoord synchroniseren met Odoo, vervoerder of 3PL wanneer die koppelingen beschikbaar komen.
- Eventueel antwoordconcepten maken; verzenden blijft een aparte bevestigde actie.

## Eerstvolgende keuze

Vaststellen of de operationele mailbox op Google Workspace/Gmail of Microsoft 365/Outlook draait. Daarna kan de juiste OAuth- en webhookroute worden gebouwd zonder de Inco Assist-schrijfstroom opnieuw te ontwerpen.
