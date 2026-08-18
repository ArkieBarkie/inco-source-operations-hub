# Besluitenregister

| ID | Datum | Besluit | Reden en gevolg | Status |
| --- | --- | --- | --- | --- |
| BES-2026-08-18-01 | 18-08-2026 | De productnaam is Inco Assist. | Past bij Inco-Source en blijft zakelijk; AI Copilot, Pulse en Inquire Assist worden niet als naam gebruikt. | Definitief |
| BES-2026-08-18-02 | 18-08-2026 | Odoo wordt voor de eerste demo niet gekoppeld. | Voorkomt vroege afhankelijkheid; het canonieke gegevensmodel en connectorcontract blijven Odoo-ready. | Definitief voor demo |
| BES-2026-08-18-03 | 18-08-2026 | De AI gebruikt standaard `gpt-5.6-luna`. | Voldoende voor gestructureerde operationele vragen en goedkoper dan zwaardere modellen. | Actief, later evalueren |
| BES-2026-08-18-04 | 18-08-2026 | De OpenAI-sleutel blijft uitsluitend server-side. | Voorkomt uitlekken via browsercode; sleutel mag nooit in chat, Git of een `NEXT_PUBLIC_`-variabele staan. | Definitief |
| BES-2026-08-18-05 | 18-08-2026 | Inco Assist werkt met bevestigde schrijfvoorstellen. | Een AI-interpretatiefout mag niet direct data wijzigen; klant/zending aanmaken en zending bijwerken vereist expliciet akkoord. | Definitief voor huidige scope |
| BES-2026-08-18-06 | 18-08-2026 | De demo gebruikt browseropslag. | Snel en goedkoop voor demonstraties; wijzigingen zijn niet gedeeld en niet geschikt als bedrijfsadministratie. | Tijdelijk |
| BES-2026-08-18-07 | 18-08-2026 | De publieke demo draait op Netlify onder `incohub.netlify.app`. | Gratis/laagkostentoegang voor demonstraties met serverfuncties voor de AI-route. | Actief |
| BES-2026-08-18-08 | 18-08-2026 | De demo wordt gevuld op basis van circa 25 zendingen per week. | Geeft een geloofwaardig operationeel beeld tijdens demonstraties. | Actief voor testdata |
| BES-2026-08-18-09 | 18-08-2026 | E-mailkoppeling start later read-only en voorstelgestuurd. | Nieuwe e-mails kunnen onjuist, kwaadaardig of dubbel zijn; geen directe boeking zonder menselijke bevestiging. | Ontwerpbesluit |
| BES-2026-08-18-10 | 18-08-2026 | Centrale database, login, rollen en auditlog gaan vóór operationeel gebruik en e-mailautomatisering. | Serverwebhooks kunnen browseropslag niet betrouwbaar bijwerken; echte data vereist eigenaarschap en herleidbaarheid. | Go/no-go-voorwaarde |
| BES-2026-08-18-11 | 18-08-2026 | Dependency-alerts worden via een gecontroleerde upgrade opgelost, niet via een geforceerde automatische major update. | De voorgestelde fix wijzigt de hoofdversie van Next.js en vereist regressietests. | Open technisch werk |
