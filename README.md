# Inco-Source Operations Hub

Een compacte Operations Hub voor Jorn en Hidde: dagstart, planning, acties en afwijkingen, voorraad, relaties, SOP’s en een live beslismodel voor intern uitvoeren versus extern magazijn / 3PL.

## Dagelijks gebruik

- Open `Dagstart` voor leveringen, ophalingen, risico’s en acties.
- Registreer alleen echte activiteiten; de app bevat geen fictieve operationele data.
- Gebruik `Intern of 3PL` vóór een tijdrovende interne goederenstroom.
- Zoek de uitvoeringsstandaard in de SOP-bibliotheek.

## Gegevens

Deze versie bewaart invoer lokaal in de browser. Dat maakt een veilige demonstratie zonder backend mogelijk, maar gegevens worden nog niet tussen computers gedeeld. De architectuur is voorbereid op latere koppelingen met Exact Online, een extern magazijn / 3PL en agenda/e-mail.

## Lokaal starten

```bash
npm install
npm run dev
```

## Publiceren via GitHub Pages

1. Plaats het project in een GitHub-repository met standaardbranch `main`.
2. Kies in GitHub bij **Settings → Pages → Source** voor **GitHub Actions**.
3. Push naar `main`; de workflow bouwt en publiceert automatisch de statische Next.js-export.

Voor centrale data, accounts en beveiligde API-koppelingen moet later worden overgestapt op een server-backed deployment.
