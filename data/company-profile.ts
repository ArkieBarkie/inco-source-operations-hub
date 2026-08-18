export const companyProfile = {
  source: {
    file: 'Kopie van Inco-Source Vragenlijst (003).xlsx',
    respondent: 'Jorn',
    receivedAt: '2026-08-18',
  },
  systems: {
    ordersAndInvoices: 'Odoo',
    confirmation: 'Bevestigd voor orders en facturen; leidende bron voor voorraad en productdata nog te bevestigen.',
  },
  commercialPolicy: {
    minimumOrderValueExw: 5000,
    dapExceptionMinimumOrderValue: 10000,
    dapRequiresExceptionApproval: true,
    minimumNetMarginPercentage: 9,
    minimumNetProfitPerOrder: 500,
  },
  supplierPolicy: {
    preferredSupplierType: 'Directe fabrikant',
    preferredPaymentTermDays: 30,
    preferredDeliveryCondition: 'Franco levering',
    wholesalerRequirements: [
      'De leverancier is een medische groothandel.',
      'De website toont merken die Inco-Source al inkoopt.',
    ],
  },
  requiredProductData: [
    'HS-code',
    'Oorsprong',
    'Gewicht',
    'Referentie fabrikant',
    'Productomschrijving',
    'Prijs',
    'Verpakkingsgrootte',
  ],
  annualVolume: {
    value: 1500,
    unit: 'Nog te bevestigen',
    note: 'Jorn antwoordde “1500 per jaar” op een gecombineerde vraag over orders, leveringen en artikelen. Niet als ordervolume gebruiken totdat de eenheid is bevestigd.',
  },
  weeklySteering: [
    'Lever- en doorlooptijden',
    'Wat deze week binnenkomt',
    'Wat nog moet worden afgehaald',
    'Hoe lang een order zonder voortgang staat',
    'Wat te laat is',
  ],
  openClarifications: [
    'Definieer welke kosten wel en niet in nettomarge en nettowinst per order vallen.',
    'Bevestig of de grens van € 5.000 uitsluitend EXW geldt en hoe overige Incoterms worden behandeld.',
    'Bevestig of “1.500 per jaar” orders, leveringen, orderregels, artikelen of een combinatie betekent.',
    'Bevestig welke gegevens Odoo leidend beheert naast orders en facturen.',
  ],
} as const;
