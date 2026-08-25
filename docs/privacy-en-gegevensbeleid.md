# Privacy- en gegevensbeleid voor de portal

- Verwerk alleen gegevens die nodig zijn voor logistieke en commerciële uitvoering. Vermijd medische gegevens en vrije persoonsgegevens in notities.
- Inco Assist ontvangt geen partner-e-mail, telefoon, contactpersoon of vrije notities. Operationele records worden geminimaliseerd voordat zij de server en het model bereiken; OpenAI-opslag staat uit (`store: false`).
- Gebruik testdata in demo-stand. Echte gegevens vereisen database-stand, individuele accounts, rollen, tenantisolatie, auditlog, back-ups en een vastgestelde verwerkers-/privacybeslissing.
- Stuur nooit API-sleutels, wachtwoorden, volledige datasets, chatinhoud of persoonsvelden naar analytics of logs.
- Leg bewaartermijnen vast voor operationele snapshots, auditregels, back-ups en providerlogs. Beperk toegang en test verwijder-/exportverzoeken.
- Documenteer datalekken en beveiligingsincidenten via het security-runbook.
