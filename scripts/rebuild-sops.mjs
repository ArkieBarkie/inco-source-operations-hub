import fs from 'node:fs';

const updated = '2026-07-20';
const reviewDate = '2027-07-20';

const baseRoles = [
  'Jorn en Hidde zijn samen proceseigenaar. Per dossier is één van beiden uitvoerder; de ander is beschikbaar voor controle bij financiële, compliance- of voorraadcorrecties.',
  'Alle informatie wordt centraal vastgelegd, zodat de ander een lopend dossier zonder mondelinge overdracht kan overnemen.',
  'Een extern magazijn / 3PL, leverancier of vervoerder voert alleen de afgesproken fysieke of specialistische handelingen uit en levert bewijs van uitvoering en afwijkingen.'
];

function keywordsFor(s) {
  return [...new Set([s.title, s.category, s.process, s.summary, ...s.steps, ...s.exceptions]
    .join(' ').toLowerCase().replace(/[^a-z0-9à-ÿ/ -]/g, ' ').split(/\s+/).filter(x => x.length > 3))].slice(0, 90);
}

function make(number, title, category, summary, cfg) {
  const sopNumber = `SOP-${String(number).padStart(3, '0')}`;
  const slug = `${sopNumber.toLowerCase()}-${title.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}`;
  const s = {
    id: `sop-${String(number).padStart(3, '0')}`, sopNumber, title, slug, category,
    process: cfg.process ?? category, summary, purpose: summary, scope: cfg.scope,
    owner: 'Jorn / Hidde', department: 'Inco-Source', roles: cfg.roles ?? baseRoles,
    systems: cfg.systems ?? [], documents: cfg.documents ?? [], steps: cfg.steps,
    exceptions: cfg.exceptions ?? [], escalations: cfg.escalations ?? [], kpis: cfg.kpis ?? [],
    commonMistakes: cfg.commonMistakes ?? [], relatedSops: cfg.relatedSops ?? [],
    status: 'Actief', version: '2.0', lastUpdated: updated, reviewDate,
    keywords: [], sourceFile: 'Inco-Source webapp – opnieuw ontworpen SOP-set 2026-07-20',
    fullText: '', sourceSections: []
  };
  s.keywords = keywordsFor(s);
  s.fullText = [s.sopNumber, s.title, s.purpose, s.scope, ...s.roles, ...s.steps, ...s.exceptions, ...s.escalations].join('\n');
  s.sourceSections = [
    {title:'Doel',content:[s.purpose]}, {title:'Scope',content:[s.scope]},
    {title:'Rollen en verantwoordelijkheden',content:s.roles}, {title:'Procedure',content:s.steps},
    {title:'Uitzonderingen en beslismomenten',content:s.exceptions}, {title:'Escalaties',content:s.escalations}
  ].filter(x => x.content.length);
  return s;
}

const sops = [
make(1,'QMS-beheer en verbetercyclus','Besturing & kwaliteit','Beheert de complete kwaliteitscyclus: documenten actueel houden, afwijkingen onderzoeken, verbeteracties opvolgen en periodiek beoordelen of de werkwijze nog past bij Inco-Source.',{
 scope:'Alle SOP’s, vaste werkwijzen, afwijkingen, verbeteracties en periodieke kwaliteitsreviews. Dit is een lichte beheerscyclus voor twee medewerkers; er zijn geen aparte audit-, CAPA- of managementreviewafdelingen.',
 systems:['SOP-bibliotheek in de webapp','Centrale actielijst en afwijkingenregister'],documents:['Reviewverslag','Bewijs bij afwijkingen of wijzigingen'],
 steps:['Signaleer een wijziging, fout, terugkerend probleem of verbeterkans en leg kort vast wat de aanleiding en het risico zijn.','Neem direct een tijdelijke beheersmaatregel als klant, product, voorraad of compliance geraakt kan worden.','Bepaal samen de werkelijke oorzaak. Gebruik alleen bij een complex of terugkerend probleem een uitgebreide oorzaakanalyse.','Leg actie, eigenaar, deadline en verwacht bewijs vast. Pas de relevante SOP meteen aan wanneer de standaardwerkwijze verandert.','De andere persoon controleert kritieke wijzigingen en sluit een actie pas wanneer bewijs en effect duidelijk zijn.','Voer ieder kwartaal een korte bedrijfsreview uit: open afwijkingen, klachten, voorraadverschillen, leveranciers/3PL, compliance, capaciteit en komende risico’s.','Beoordeel iedere SOP minimaal jaarlijks of direct na een belangrijke proceswijziging; archiveer verouderde versies en publiceer alleen de actuele versie.'],
 exceptions:['Een eenmalige kleine fout zonder vervolgimpact mag als directe correctie worden afgehandeld; noteer wel wat is hersteld.','Een structurele, kritieke of compliance-gerelateerde fout vereist oorzaak, actie en effectiviteitscontrole.','Jorn en Hidde mogen niet elkaars eigen kritieke wijziging zonder controle afsluiten.'],
 escalations:['Stop verkoop of verzending direct bij mogelijk productveiligheids- of compliance-risico.','Schakel een externe deskundige in als wettelijke of technische beoordeling buiten de eigen kennis valt.'],
 kpis:['Open kritieke acties','Acties op tijd afgerond','SOP’s tijdig beoordeeld'],commonMistakes:['Een overleg houden zonder besluiten, eigenaar of deadline.','Een document uitbreiden omdat het professioneel lijkt, terwijl de extra stap niet wordt uitgevoerd.'],relatedSops:['SOP-002','SOP-013']
}),
make(2,'Product- en compliancebeheer','Product & compliance','Zorgt dat ieder product vóór inkoop of verkoop beschikt over juiste stamgegevens, geldige productdocumentatie en duidelijke beperkingen per markt of klant.',{
 scope:'Nieuwe en gewijzigde artikelen, medische en dentale producten, samples, certificaten, technische dossiers, batch/lot- en houdbaarheidsgegevens en land- of klantbeperkingen.',
 systems:['Artikelregister / administratie','Centraal productdossier'],documents:['Productspecificatie','Certificaten en verklaringen','Documentenregister met vervaldatum'],
 steps:['Maak vóór eerste gebruik één productdossier aan met leverancier, omschrijving, SKU, eenheid, verpakking, barcode, afmetingen, gewicht, prijs en logistieke gegevens.','Bepaal welke wettelijke, klant- en landdocumenten nodig zijn en vraag deze op bij leverancier of fabrikant.','Controleer productkoppeling, geldigheid, taal, scope, batch/lot, houdbaarheid en eventuele verkoop- of verzendbeperkingen.','Laat de andere persoon kritieke velden controleren: SKU, eenheid, barcode, documentstatus en beperkingen.','Geef het artikel vrij, voorwaardelijk vrij of blokkeer het. Leg reden en eventuele einddatum vast.','Deel alleen de noodzakelijke gegevens met extern magazijn / 3PL, vervoerder of klant.','Bewaak vervaldata en wijzigingen; herbeoordeel vóór een document verloopt of bij wijziging van product, leverancier of markt.'],
 exceptions:['Geen verkoop, inkoop of verzending wanneer een kritisch document ontbreekt of niet bij het product past.','Een sample blijft traceerbaar, maar mag een vereenvoudigde commerciële inrichting hebben als dit geen compliance-eis raakt.'],
 escalations:['Leg het dossier voor aan een bevoegde externe specialist bij twijfel over wettelijke classificatie of markttoegang.'],
 kpis:['Productdossiers volledig','Kritieke documenten vóór vervaldatum vernieuwd'],commonMistakes:['Een document opslaan zonder product-, leverancier- of vervaldatumkoppeling.','Een verpakkingseenheid wijzigen terwijl voorraad openstaat zonder impactcontrole.'],relatedSops:['SOP-003','SOP-006','SOP-012']
}),
make(3,'Leveranciersselectie en -beheer','Inkoop & leveranciers','Beoordeelt, keurt goed en volgt leveranciers praktisch op, zodat Inco-Source alleen werkt met partijen die commercieel, operationeel en qua compliance geschikt zijn.',{
 scope:'Productleveranciers en kritieke dienstverleners, inclusief extern magazijn / 3PL en vervoerders voor zover de specifieke prestatiebeoordeling niet in SOP-014 valt.',
 systems:['Leveranciersregister','Actielijst'],documents:['Bedrijfs- en bankgegevens','Relevante certificaten','Afspraken of offerte','Evaluatienotitie'],
 steps:['Leg vast waarom de leverancier nodig is, wat wordt afgenomen en welke risico’s de samenwerking heeft.','Controleer identiteit, contactpersonen en bankgegevens via een onafhankelijk kanaal; verzamel prijzen, voorwaarden en relevante documenten.','Beoordeel productkwaliteit/compliance, leverbetrouwbaarheid, lead time, MOQ, verpakking, communicatie en aansluiting op de 3PL-werkwijze.','Classificeer als normaal of kritisch. Kritisch betekent: hoge klant/compliance-impact, lastig vervangbaar of grote financiële afhankelijkheid.','Jorn en Hidde besluiten samen over goedkeuring van een kritieke leverancier; leg status en voorwaarden vast.','Controleer de eerste levering extra en registreer afwijkingen.','Herbeoordeel minimaal jaarlijks alleen actieve kritieke leveranciers; beoordeel overige leveranciers bij een relevante afwijking of vóór hernieuwde grote afname.','Zet de status op goedgekeurd, voorwaardelijk, geblokkeerd of uitfaseren en volg concrete acties op.'],
 exceptions:['Een spoedinkoop bij een nog niet volledig beoordeelde leverancier mag alleen na gedocumenteerde risicoafweging en tijdelijke voorwaarden.','Wijziging van bankgegevens wordt altijd buiten de ontvangen e-mail om geverifieerd.'],
 escalations:['Blokkeer nieuwe bestellingen bij fraude-indicatie, kritiek documentgebrek of onbeheerst productrisico.'],
 kpis:['Kritieke leveranciers tijdig beoordeeld','Afwijkingen per leverancier'],commonMistakes:['Iedere leverancier elk kwartaal een uitgebreide scorecard geven, ongeacht volume of risico.'],relatedSops:['SOP-002','SOP-004','SOP-013']
}),
make(4,'Inkoop en voorraadplanning','Inkoop & leveranciers','Vertaalt klantvraag, actuele voorraad en levertijden naar beheerste inkoopbesluiten zonder onnodige voorraadopbouw.',{
 scope:'Forecast, minimumvoorraad, replenishment, purchase orders, backorders, samples en voorraad voor interne locatie of extern magazijn / 3PL.',
 systems:['Order- en voorraadadministratie','Open PO- en backorderoverzicht'],documents:['Purchase order','Orderbevestiging','Voorraadbesluit bij uitzonderingen'],
 steps:['Beoordeel per artikel actuele voorraad, open klantorders, open inkooporders, geblokkeerde voorraad, verwachte vraag en levertijd.','Bepaal of voorraad houden zinvol is. Gebruik vaste minimumvoorraad alleen voor aantoonbare hardlopers of kritieke artikelen; koop overige artikelen primair ordergestuurd in.','Bereken voorstel met hoeveelheid, gewenste datum, MOQ, prijs, opslagbehoefte, incourantrisico en cash-impact.','Kies bewust bestemming: direct naar klant, extern magazijn / 3PL of intern in Amstelveen. Gebruik SOP-007 voor de afweging.','Maak de PO met artikel, aantal, prijs, valuta, leverdatum, incoterm, bestemming en vereiste documenten.','Laat de andere persoon uitzonderingen op prijs, voorraadwaarde, leverancier of risico controleren.','Vergelijk de orderbevestiging met de PO en leg afwijkingen vast voordat je instemt.','Volg ETA en documenten op; bereid inbound voor via SOP-005. Sluit de PO pas na ontvangst en afhandeling van verschillen.'],
 exceptions:['Een spoed-PO mag controles versnellen maar niet overslaan.','Bij sterk onzekere vraag gaat een kleine testorder of klantbevestiging vóór voorraadopbouw.'],
 escalations:['Bespreek samen iedere inkoop met uitzonderlijk hoge voorraadwaarde, onduidelijke afzet of lange onvervangbare lead time.'],
 kpis:['Voorraadwaarde en incourante voorraad','Backorders','Leveringen volgens bevestigde datum'],commonMistakes:['Forecast behandelen als zekere verkoop.','MOQ accepteren zonder opslag- en incourantrisico te beoordelen.'],relatedSops:['SOP-003','SOP-005','SOP-007','SOP-011']
}),
make(5,'Inbound voorbereiden','Goederen & voorraad','Zorgt dat iedere inkomende zending vóór aankomst een duidelijke bestemming, referentie, documentset en ontvangstinstructie heeft.',{
 scope:'Leveranciersleveringen, retouren en transfers naar extern magazijn / 3PL, Amstelveen of rechtstreeks naar een klant/partner.',
 systems:['Open inboundoverzicht','Order- en voorraadadministratie'],documents:['PO of transferreferentie','Packing list','ASN / vooraankondiging','Transport- en importdocumenten indien van toepassing'],
 steps:['Identificeer de aankomende levering en controleer leverancier, referentie, artikelen, aantallen, verpakking en verwachte aankomst.','Bepaal met SOP-007 de juiste bestemming voordat transport wordt geïnstrueerd.','Verzamel packing list, PO/transferreferentie, pallet- of colligegevens, batch/lot waar relevant en transportdocumenten.','Controleer vóór vertrek of kritieke product-, import- of compliance-documenten beschikbaar zijn.','Stuur het extern magazijn / 3PL of de interne ontvanger een volledige vooraankondiging met ETA, prioriteit en afwijkende controle-instructies.','Werk ETA-wijzigingen bij en bevestig dat de ontvanger voorbereid is.','Leg ontbrekende informatie of een geweigerde boeking vast en los die vóór aankomst op waar mogelijk.'],
 exceptions:['Onverwachte levering: afzonderen en referentie laten bevestigen vóór voorraadboeking.','Directe levering aan klant: behoud dezelfde document- en traceerbaarheidscontrole, ook als Inco-Source de goederen niet fysiek ziet.'],
 escalations:['Blokkeer of verplaats levering bij ontbrekende kritieke documenten, onveilige goederen of verkeerde bestemming.'],
 kpis:['Inbounds volledig vooraf aangemeld','Ontvangstafwijkingen door ontbrekende informatie'],commonMistakes:['Pas na aankomst bepalen waar een zending thuishoort.'],relatedSops:['SOP-004','SOP-006','SOP-007']
}),
make(6,'Goederenontvangst en voorraadboeking','Goederen & voorraad','Combineert fysieke ontvangst, controle, statusbesluit en administratieve boeking zodat alleen aantoonbaar juiste goederen beschikbaar komen.',{
 scope:'Alle ontvangsten bij extern magazijn / 3PL en Amstelveen, inclusief leveranciersleveringen, retouren, samples en transfers.',
 systems:['Voorraadadministratie / WMS','Afwijkingenregister'],documents:['PO/ASN/transferreferentie','Ontvangstbewijs','Foto’s en afwijkingsbewijs indien nodig'],
 steps:['Ontvang de zending veilig en koppel haar aan PO, ASN, retour- of transferreferentie.','Controleer colli/pallets, artikel, aantal, verpakking, zichtbare schade, batch/lot, houdbaarheid en afwijkende instructies.','Het extern magazijn / 3PL registreert bij een verschil zelf de fysieke telling, foto’s, locatie en betrokken transacties; Jorn/Hidde vragen zo nodig een hertelling.','Bepaal status per ontvangstregel: vrijgegeven, gedeeltelijk ontvangen, geblokkeerd/quarantaine of afgekeurd.','Vergelijk de vrijgegeven fysieke ontvangst met de verwachte order en boek op juiste SKU, eenheid, locatie, batch/lot en status.','Maak alleen vrijgegeven voorraad beschikbaar voor orderallocatie; geblokkeerde voorraad blijft uitgesloten.','Werk PO of transfer bij en leg ieder verschil met eigenaar en vervolgstap vast.','Archiveer ontvangstbewijs en relevant afwijkingsbewijs in het dossier.'],
 exceptions:['Bij twijfel over product, schade, documentatie of status altijd blokkeren; later vrijgeven is veiliger dan onterecht beschikbaar stellen.','Een gedeeltelijke ontvangst wordt per regel verwerkt; resterende aantallen blijven zichtbaar.'],
 escalations:['Stop verwerking bij mogelijk productveiligheidsrisico of onverklaarbare kritieke mismatch.'],
 kpis:['Ontvangsten zonder verschil','Tijd tussen fysieke ontvangst en juiste boeking'],commonMistakes:['Voorraad boeken op basis van packing list zonder fysieke bevestiging.','Een 3PL-afwijking accepteren zonder bewijs of hertelling.'],relatedSops:['SOP-002','SOP-005','SOP-008','SOP-013']
}),
make(7,'Keuze intern magazijn, 3PL en transfers','Logistiek & fulfilment','Maakt per goederenstroom expliciet de keuze tussen Amstelveen, extern magazijn / 3PL of directe levering en beheerst transfers tussen locaties.',{
 scope:'Inbound, opslag, orderfulfilment, samples, spoedorders, retouren en transfers waarbij de uitvoeringslocatie moet worden gekozen.',
 systems:['Beslismodel intern magazijn of 3PL','Voorraad- en transferoverzicht'],documents:['Transferinstructie bij fysieke verplaatsing'],
 steps:['Bepaal doel, volume, pallets/colli, verblijfsduur, handelingen, urgentie, foutkans en klantimpact.','Kies Amstelveen alleen voor kleine, snelle en eenvoudige stromen waarbij directe flexibiliteit meer waard is dan de tijd van Jorn/Hidde.','Kies extern magazijn / 3PL bij palletvolume, structurele opslag, herhaalde handling, schaalbehoefte of wanneer commerciële tijd anders verloren gaat.','Kies directe levering wanneer tussenopslag geen waarde toevoegt en traceerbaarheid, documenten en klantafspraken geborgd zijn.','Gebruik bij twijfel het beslismodel en leg de gekozen locatie plus hoofdreden vast.','Voor een transfer: registreer SKU, aantal, batch/lot, bron, bestemming, reden en prioriteit; reserveer voorraad tegen dubbele allocatie.','Laat bronlocatie picken en bewijs leveren, registreer voorraad onderweg, en laat bestemmingslocatie aantallen en schade controleren.','Boek de transfer pas af na ontvangstbevestiging; onderzoek verschillen samen met de uitvoerende locatie.'],
 exceptions:['Spoed rechtvaardigt Amstelveen alleen als de fysieke capaciteit en foutbeheersing toereikend zijn.','Een tijdelijke uitzondering krijgt een einddatum; voorkom dat tijdelijke opslag ongemerkt structureel wordt.'],
 escalations:['Bespreek samen wanneer Amstelveen boven veilige capaciteit komt of structureel commerciële tijd opslokt.'],
 kpis:['Palletcapaciteit Amstelveen','Open transfers','Tijd besteed aan interne handling'],commonMistakes:['Alleen transportkosten vergelijken en eigen tijd, risico en opslag vergeten.'],relatedSops:['SOP-004','SOP-005','SOP-009']
}),
make(8,'Voorraadcontrole, correcties en afwaardering','Goederen & voorraad','Borgt betrouwbare voorraad door risicogestuurd tellen, bewezen correcties en beheerste afhandeling van beschadigde, verlopen of incourante voorraad.',{
 scope:'Voorraad bij extern magazijn / 3PL en Amstelveen, inclusief beschikbare, geblokkeerde, retour-, sample-, beschadigde en verlopen voorraad.',
 systems:['Voorraadadministratie / WMS','Voorraadverschillen- en actielijst'],documents:['Telresultaat','Correctiebewijs','Goedkeuring voor afschrijving of vernietiging'],
 steps:['Plan tellingen op risico: vaker voor waardevolle, hardlopende of foutgevoelige artikelen; niet iedere SKU met dezelfde frequentie.','Laat de locatie blind tellen op SKU, locatie, status en batch/lot. Bij verschil levert de 3PL de telling en transactiebewijzen.','Vraag een onafhankelijke hertelling bij een materieel of onverklaarbaar verschil.','Onderzoek ontvangst, pick, transfer, retour, schade, eenheid en administratieve boekingen vóór correctie.','Leg voorgestelde correctie vast met aantal, waarde, oorzaak en bewijs; de andere persoon keurt materiële correcties goed.','Boek de correctie en controleer aansluitend locatie, status, aantal en waarde.','Blokkeer beschadigde, verlopen of incourante voorraad en bepaal herstel, retour leverancier, herverkoop, afschrijving of vernietiging.','Bewaar bewijs van vernietiging/afschrijving en start een verbeteractie bij herhaling of structurele oorzaak.'],
 exceptions:['Een klein verklaarbaar verschil mag direct na bewijs worden gecorrigeerd volgens afgesproken waardedrempel.','Geblokkeerde voorraad mag nooit beschikbaar komen zonder expliciet vrijgavebesluit.'],
 escalations:['Start een gezamenlijk onderzoek met de 3PL bij vermiste pallet, herhaalde pickfout of onverklaarbaar locatieverschil.'],
 kpis:['Voorraadbetrouwbaarheid','Waarde correcties','Beschadigde/verlopen/incourante voorraad'],commonMistakes:['Systeemvoorraad aanpassen om de telling passend te maken zonder oorzaak en bewijs.'],relatedSops:['SOP-006','SOP-007','SOP-012','SOP-013']
}),
make(9,'Klantorder verwerken','Order & klant','Beheert een klantorder van ontvangst tot vrijgave aan de uitvoerende locatie, inclusief volledigheid, prijs, voorraad, compliance, prioriteit en backorders.',{
 scope:'Normale orders, spoedorders, samples en klantkritieke zendingen voor binnen- en buitenland.',
 systems:['Orderadministratie','Klant- en voorraadgegevens'],documents:['Klantorder of schriftelijke bevestiging','Prijs- en leverafspraak'],
 steps:['Registreer klant, referentie, factuur- en afleveradres, ordertype en gewenste leverdatum.','Controleer SKU, aantal, eenheid, prijs, betaal- en levervoorwaarden, incoterm en speciale instructies.','Controleer beschikbare én vrijgegeven voorraad, open inbound en eventuele backorder.','Controleer product-, klant-, land- en exportbeperkingen vóór toezegging.','Los onduidelijkheden op met de klant en zet de order op hold zolang kritieke informatie ontbreekt.','Voer de order in en laat afwijkende prijs, nieuwe klant, uitzonderlijke kosten of compliance-risico door de ander controleren.','Alloceer voorraad volgens houdbaarheid/batch en klantafspraak; leg backorder en verwachte datum zichtbaar vast.','Kies uitvoeringslocatie via SOP-007 en geef de volledige instructie vrij voor pick/pack/dispatch.','Bevestig aan de klant wat, wanneer en onder welke voorwaarden wordt geleverd; bewaak wijzigingen tot verzending.'],
 exceptions:['Een sample wordt als voorraadmutatie en zending geregistreerd, ook wanneer deze gratis is.','Spoed versnelt prioriteit, maar omzeilt geen product-, adres-, voorraad- of compliancecontrole.'],
 escalations:['Geen vrijgave bij complianceblokkade, onaanvaardbaar kredietrisico of ontbrekende kritieke gegevens.'],
 kpis:['Orders in één keer correct','Backorders','Tijd van orderontvangst tot vrijgave'],commonMistakes:['Beschikbare voorraad verwarren met geblokkeerde of al gealloceerde voorraad.'],relatedSops:['SOP-002','SOP-007','SOP-010','SOP-011']
}),
make(10,'Pick, pack en verzending','Logistiek & fulfilment','Zorgt dat de juiste goederen schadevrij, volledig gedocumenteerd en traceerbaar aan de vervoerder worden overgedragen.',{
 scope:'Uitvoering door extern magazijn / 3PL of Amstelveen voor normale orders, samples en spoedzendingen.',
 systems:['WMS / orderadministratie','Transportplatform of tracking'],documents:['Vrijgegeven orderinstructie','Pakbon en verzendlabel','Exportdocumenten indien van toepassing'],
 steps:['Ontvang alleen een vrijgegeven order met juiste locatie, prioriteit en instructies.','Controleer vóór pick SKU, aantal, locatie, status, batch/lot, houdbaarheid en FEFO/FIFO-afspraak.','Pick en registreer afwijkingen vóór vervangende voorraad wordt gekozen.','Voer een passende pickcontrole uit; bij handmatige of kritieke zending controleert een tweede persoon artikel en aantal.','Verpak volgens product, klant en transportwijze; voorkom schade en voeg alleen goedgekeurde documenten toe.','Controleer adres, labels, colli, gewicht, documenten en zichtbare staat vóór dispatch.','Registreer overdracht aan vervoerder met tijd, tracking en aantal colli.','Meld dispatch en iedere afwijking aan Jorn/Hidde; werk orderstatus bij.'],
 exceptions:['Geen alternatief artikel of batch verzenden zonder akkoord.','Bij beschadiging of mismatch: stop, fotografeer, corrigeer instructie en meld de afwijking.'],
 escalations:['Stop verzending bij onduidelijk adres, ontbrekend exportdocument of productstatus.'],
 kpis:['Pickfouten','Zendingen op tijd overgedragen','Schade bij verzending'],commonMistakes:['Een spoedlabel gebruiken zonder dat de uitvoerder de cut-off heeft bevestigd.'],relatedSops:['SOP-009','SOP-011','SOP-012','SOP-014']
}),
make(11,'Transport en leveropvolging','Logistiek & fulfilment','Selecteert en boekt passend transport en bewaakt de zending tot aantoonbare levering, met grip op kosten, vertraging en schade.',{
 scope:'Parcel, pallet/LTL, FTL en spoedtransport binnen en buiten Nederland; exportdocumentinhoud valt onder SOP-012.',
 systems:['Transportplatform / carrierportal','Tracking- en actielijst'],documents:['Bookingbevestiging','Vrachtbrief of label','Proof of delivery'],
 steps:['Bepaal bestemming, volume, gewicht, urgentie, gewenste leverdatum, incoterm en laad/losvereisten.','Kies vervoerder en modus op totale kosten, service, risico en ervaring op de route; vraag tarief op bij uitzonderingen.','Controleer adres, contactpersoon, openingstijden, productbeperkingen en documentbehoefte.','Boek transport en deel booking, labels en ophaalinstructie met uitvoerende locatie.','Bevestig dat de zending gereedstaat en de vervoerder de opdracht heeft geaccepteerd.','Volg tracking actief bij spoed, hoge waarde, export of gemelde uitzondering; voor standaardparcel volstaat exception-based opvolging.','Leg vertraging, schade, vermissing of foutieve factuur vast met bewijs en claim indien materieel.','Bewaar POD waar klant-, contract- of claimrisico dit vereist en sluit de zending af.'],
 exceptions:['Hoge spoedkosten vereisen expliciet besluit met reden en klantimpact.','Geen tracking beschikbaar: spreek een alternatief bewijs- en opvolgmoment af.'],
 escalations:['Informeer de klant proactief zodra de beloofde leverdatum waarschijnlijk niet wordt gehaald.'],
 kpis:['Leveringen op tijd','Transportschade en vermissing','Afwijkende transportkosten'],commonMistakes:['Alle zendingen handmatig volgen terwijl alleen uitzonderingen actie vereisen.'],relatedSops:['SOP-010','SOP-012','SOP-013','SOP-014']
}),
make(12,'Export- en verzenddocumentatie','Product & compliance','Bepaalt, controleert en archiveert de juiste documenten voor internationale zendingen, zodat informatie tussen order, goederen, douane en vervoerder consistent is.',{
 scope:'Alle internationale zendingen waarvoor commerciële, douane-, oorsprongs-, product- of landspecifieke documenten nodig zijn.',
 systems:['Order- en productdossier','Documentopslag'],documents:['Commercial invoice','Packing list','Eventuele oorsprongs-, product- of douanedocumenten'],
 steps:['Bepaal per land, product, incoterm, waarde en transportwijze welke documenten nodig zijn.','Controleer klant/ontvanger, SKU, duidelijke productomschrijving, aantallen, waarde, valuta, HS-code, oorsprong, gewicht en colli.','Haal product- en compliancebewijzen uitsluitend uit het goedgekeurde productdossier.','Stel commercial invoice, packing list en aanvullende documenten op; gegevens moeten onderling en met de order overeenkomen.','Laat de andere persoon nieuwe landen, gereguleerde producten of materiële uitzonderingen controleren.','Houd de zending geblokkeerd totdat alle kritieke documenten compleet en consistent zijn.','Deel de juiste definitieve versie met 3PL, vervoerder, broker en klant; voorkom meerdere concurrerende versies.','Bewaar de definitieve set en relevant verzend-/douanebewijs bij het orderdossier.'],
 exceptions:['Bij onbekende eis niet gokken: bevestig schriftelijk bij broker, vervoerder of deskundige.','Een correctie na vertrek wordt direct naar alle ontvangers van de oude versie gestuurd.'],
 escalations:['Stop dispatch bij ontbrekende vereiste vergunning, productdocumentatie of onduidelijke markttoegang.'],
 kpis:['Exportzendingen zonder documentcorrectie','Douanevertraging door documentfout'],commonMistakes:['HS-code of oorsprong kopiëren zonder controle tegen het actuele productdossier.'],relatedSops:['SOP-002','SOP-009','SOP-010']
}),
make(13,'Afwijkingen, klachten en claims','Besturing & kwaliteit','Behandelt klantklachten, leveranciersclaims en operationele afwijkingen in één praktische route: registreren, beheersen, onderzoeken, oplossen en leren.',{
 scope:'Klantklachten, leverancier- en transportclaims, 3PL-afwijkingen, schade, tekort, verkeerde levering, documentfout en serviceprobleem.',
 systems:['Afwijkingen- en actielijst','Order-, voorraad- en leveranciersdossier'],documents:['Foto’s, tellingen en transactiebewijs','Correspondentie en financiële afhandeling'],
 steps:['Registreer melder, datum, order/PO, product, aantal, omschrijving, impact en beschikbaar bewijs.','Bepaal prioriteit op klant, productveiligheid, compliance, voorraadwaarde en herhalingsrisico.','Neem containment: blokkeer betrokken voorraad/zending, corrigeer klantimpact of voorkom verdere fouten.','Bevestig aan klant of partner wat wordt onderzocht en wanneer een update volgt.','Verzamel objectief bewijs. Bij 3PL-afwijking voert de 3PL fysieke controle en zo nodig hertelling uit; bij transport levert de vervoerder scans/POD.','Bepaal oorzaak en verantwoordelijkheid en kies oplossing: vervanging, credit, retour, herstel, claim of afwijzing.','Leg financiële verwerking, eigenaar en deadline vast; koppel leveranciers- of vervoerdersprestatie terug.','Start via SOP-001 een structurele verbeteractie bij kritieke of herhaalde oorzaak.','Sluit pas wanneer oplossing, communicatie, voorraad/financiën en bewijs compleet zijn.'],
 exceptions:['Een ongegronde claim wordt gemotiveerd afgewezen met behoud van bewijs en professionele communicatie.','Bij directe klantoplossing blijft onderzoek nodig als herhaling of compliance-risico mogelijk is.'],
 escalations:['Meld mogelijk productveiligheidsrisico onmiddellijk en stop betrokken voorraad/verzending.','Bespreek claims met grote financiële of reputatie-impact samen vóór toezegging.'],
 kpis:['Doorlooptijd klachten/claims','Herhaalde oorzaken','Claimwaarde teruggewonnen'],commonMistakes:['Een leverancier of 3PL alleen informeren in plaats van actief bewijs en correctie te laten leveren.'],relatedSops:['SOP-001','SOP-003','SOP-006','SOP-015']
}),
make(14,'3PL- en vervoerdersbeheer','Logistiek & fulfilment','Borgt dat extern magazijn / 3PL en vervoerders worden gestuurd op enkele relevante afspraken, feitelijke prestaties en concrete verbeteracties.',{
 scope:'Selectie, afspraken, periodieke beoordeling en escalatie van extern magazijn / 3PL en structureel gebruikte vervoerders.',
 systems:['Partnerafspraken en scorecard','Actielijst'],documents:['SLA / werkinstructies','Kwartaalreview of evaluatienotitie'],
 steps:['Leg per partner de kernafspraken vast: diensten, cut-offs, tarieven, bewijs, voorraadcontrole, aansprakelijkheid, contact- en escalatiepad.','Kies een kleine set meetpunten passend bij volume en risico, zoals voorraadbetrouwbaarheid, fouten, doorlooptijd, schade, leverprestatie en open issues.','Controleer brondata en bespreek uitzonderingen; maak geen scorecard op basis van onvergelijkbare of onvolledige data.','Beoordeel de 3PL minimaal per kwartaal zolang deze structurele voorraad beheert; beoordeel vervoerders risicogestuurd of bij materiële afwijkingen.','Laat de partner oorzaak, bewijs en actie leveren voor prestaties onder afspraak.','Leg alleen acties vast met eigenaar, datum en verwacht resultaat; volg ze in de gezamenlijke bedrijfsreview.','Bepaal status: goedgekeurd, voorwaardelijk, geblokkeerd of vervangen.','Beoordeel contract, capaciteit en alternatieven bij structurele problemen of groei.'],
 exceptions:['Bij laag zendvolume volstaat beoordeling op incidenten en kosten; een maandelijkse carrier-scorecard voegt dan geen waarde toe.','Kritieke voorraadverschillen worden niet uitgesteld tot de periodieke review.'],
 escalations:['Escalatie naar partnermanagement bij herhaalde fout, ontbrekend bewijs, gemiste actie of contractuele impact.'],
 kpis:['Voorraadbetrouwbaarheid 3PL','Pick/dispatchfouten','Leverprestatie vervoerders','Open partneracties'],commonMistakes:['Veel KPI’s verzamelen zonder beslissingen of opvolging.'],relatedSops:['SOP-006','SOP-008','SOP-011','SOP-013']
}),
make(15,'Retouren en productdispositie','Goederen & voorraad','Beheert retouren van aanvraag tot financiële en fysieke afsluiting en bepaalt aantoonbaar of goederen opnieuw verkoopbaar, geblokkeerd, teruggestuurd of vernietigd worden.',{
 scope:'Klantretouren, RMA’s, geweigerde leveringen, teruggekomen samples en goederen die na retour een kwaliteits- of voorraadbesluit nodig hebben.',
 systems:['RMA/retourregister','Voorraad- en orderadministratie'],documents:['Retouraanvraag en RMA-instructie','Ontvangstfoto’s en inspectiebewijs','Credit- of dispositiebesluit'],
 steps:['Registreer klant, order, artikel, aantal, reden, staat, foto’s en gewenste oplossing.','Beoordeel of retour is toegestaan en bepaal route, bestemming, transport, kosten en voorwaarden.','Geef een uniek RMA-nummer en duidelijke instructie; accepteer geen anonieme retour rechtstreeks in beschikbare voorraad.','Ontvang en controleer RMA, artikel, aantal, verpakking, schade, batch/lot en documentatie.','Plaats retour direct in geblokkeerde status totdat dispositie is goedgekeurd.','Bepaal op basis van bewijs: opnieuw verkoopbaar, herstel/herverpakking, terug naar leverancier, afschrijving, vernietiging of terug naar klant.','De andere persoon controleert vrijgave naar verkoopbare voorraad en materiële afschrijving.','Werk voorraad, order, creditnota en eventuele claim bij.','Analyseer retourreden en sluit met communicatie en bewijs; start SOP-013 bij claim of herhaling.'],
 exceptions:['Ongeopend betekent niet automatisch verkoopbaar; productstatus, traceerbaarheid en opslagconditie moeten aantoonbaar zijn.','Een retour zonder RMA wordt geïdentificeerd en geblokkeerd voordat verdere verwerking plaatsvindt.'],
 escalations:['Stop en beoordeel met specialist bij mogelijk productveiligheids-, besmettings- of compliance-risico.'],
 kpis:['Retouren per reden','Doorlooptijd retour tot besluit','Waarde afschrijving'],commonMistakes:['Credit geven zonder voorraad- en claimafhandeling af te ronden.'],relatedSops:['SOP-008','SOP-013']
})
];

fs.writeFileSync(new URL('../data/sops.json', import.meta.url), JSON.stringify(sops, null, 2) + '\n', 'utf8');
const outputDir = new URL('../SOPs-herzien/', import.meta.url);
fs.mkdirSync(outputDir, {recursive:true});
for (const s of sops) {
  const list = (items) => items.map(x => `- ${x}`).join('\n');
  const steps = s.steps.map((x, i) => `${i + 1}. ${x}`).join('\n');
  const body = `# ${s.sopNumber} – ${s.title}\n\n` +
    `**Status:** ${s.status}  \n**Versie:** ${s.version}  \n**Eigenaar:** ${s.owner}  \n**Categorie:** ${s.category}  \n**Laatste wijziging:** ${s.lastUpdated}  \n**Volgende beoordeling:** ${s.reviewDate}\n\n` +
    `## Doel\n\n${s.purpose}\n\n## Scope\n\n${s.scope}\n\n` +
    `## Rollen en verantwoordelijkheden\n\n${list(s.roles)}\n\n` +
    `## Benodigde systemen en documenten\n\n### Systemen\n\n${list(s.systems)}\n\n### Documenten en bewijs\n\n${list(s.documents)}\n\n` +
    `## Werkwijze\n\n${steps}\n\n## Uitzonderingen en beslismomenten\n\n${list(s.exceptions)}\n\n` +
    `## Escalaties\n\n${list(s.escalations)}\n\n## Prestatie-indicatoren\n\n${list(s.kpis)}\n\n` +
    `## Veelgemaakte fouten\n\n${list(s.commonMistakes)}\n\n## Gerelateerde SOP’s\n\n${list(s.relatedSops)}\n`;
  fs.writeFileSync(new URL(`${s.sopNumber}-${s.slug.split('-').slice(2).join('-')}.md`, outputDir), body, 'utf8');
}
console.log(`Rebuilt ${sops.length} SOPs.`);
