// Generated from specs/fatturapa-1.2.3/Schema_VFPR12_v1.2.3.xsd
// and specs/code-list-descriptions.json by scripts/generate.
// Do not edit: change the generator and run `pnpm generate`.

import type {
  Art73,
  BolloVirtuale,
  CausalePagamento,
  CondizioniPagamento,
  EsigibilitaIVA,
  FormatoTrasmissione,
  ModalitaPagamento,
  Natura,
  RegimeFiscale,
  Ritenuta,
  SocioUnico,
  SoggettoEmittente,
  StatoLiquidazione,
  TipoCassa,
  TipoCessionePrestazione,
  TipoDocumento,
  TipoRitenuta,
  TipoScontoMaggiorazione,
} from './model.js';

/**
 * One code of a code list, with its official description.
 *
 * `description` is always the text of an official source, never ours; it is missing only when no
 * source gives one.
 */
export interface CodeListEntry<Code extends string = string> {
  readonly code: Code;
  readonly description?: string;
}

/**
 * The code lists of the XSD, in the order of the XSD, with their official descriptions: ready for
 * menus and select boxes.
 *
 * The descriptions come from the XSD annotations. Where the XSD has none, they come whole from
 * another official document, named on the list.
 *
 * @example
 * codeLists.TipoDocumento.find((entry) => entry.code === 'TD04')?.description; // 'Nota di credito'
 */
export const codeLists: {
  /** Codes of `FormatoTrasmissioneType`. */
  readonly FormatoTrasmissione: readonly CodeListEntry<FormatoTrasmissione>[];
  /**
   * Codes of `CausalePagamentoType`. Descriptions from: Istruzioni CU 2026, agg. 24/02/2026;
   * Istruzioni CU 2024.
   */
  readonly CausalePagamento: readonly CodeListEntry<CausalePagamento>[];
  /** Codes of `TipoScontoMaggiorazioneType`. */
  readonly TipoScontoMaggiorazione: readonly CodeListEntry<TipoScontoMaggiorazione>[];
  /** Codes of `Art73Type`. */
  readonly Art73: readonly CodeListEntry<Art73>[];
  /** Codes of `TipoCassaType`. */
  readonly TipoCassa: readonly CodeListEntry<TipoCassa>[];
  /** Codes of `TipoDocumentoType`. */
  readonly TipoDocumento: readonly CodeListEntry<TipoDocumento>[];
  /** Codes of `TipoRitenutaType`. */
  readonly TipoRitenuta: readonly CodeListEntry<TipoRitenuta>[];
  /** Codes of `SoggettoEmittenteType`. */
  readonly SoggettoEmittente: readonly CodeListEntry<SoggettoEmittente>[];
  /** Codes of `RegimeFiscaleType`. */
  readonly RegimeFiscale: readonly CodeListEntry<RegimeFiscale>[];
  /** Codes of `CondizioniPagamentoType`. */
  readonly CondizioniPagamento: readonly CodeListEntry<CondizioniPagamento>[];
  /** Codes of `ModalitaPagamentoType`. */
  readonly ModalitaPagamento: readonly CodeListEntry<ModalitaPagamento>[];
  /** Codes of `RitenutaType`. */
  readonly Ritenuta: readonly CodeListEntry<Ritenuta>[];
  /** Codes of `EsigibilitaIVAType`. */
  readonly EsigibilitaIVA: readonly CodeListEntry<EsigibilitaIVA>[];
  /** Codes of `NaturaType`. */
  readonly Natura: readonly CodeListEntry<Natura>[];
  /** Codes of `SocioUnicoType`. */
  readonly SocioUnico: readonly CodeListEntry<SocioUnico>[];
  /** Codes of `StatoLiquidazioneType`. */
  readonly StatoLiquidazione: readonly CodeListEntry<StatoLiquidazione>[];
  /** Codes of `TipoCessionePrestazioneType`. */
  readonly TipoCessionePrestazione: readonly CodeListEntry<TipoCessionePrestazione>[];
  /**
   * Codes of `BolloVirtualeType`. Descriptions from: Rappresentazione tabellare della fattura
   * ordinaria.
   */
  readonly BolloVirtuale: readonly CodeListEntry<BolloVirtuale>[];
} = {
  FormatoTrasmissione: [
    { code: 'FPA12', description: 'Fattura verso PA' },
    { code: 'FPR12', description: 'Fattura verso privati' },
  ],
  CausalePagamento: [
    // Istruzioni CU 2026, agg. 24/02/2026, p. 82
    {
      code: 'A',
      description:
        'prestazioni di lavoro autonomo rientranti nell’esercizio di arte o professione abituale',
    },
    // Istruzioni CU 2026, agg. 24/02/2026, p. 82
    {
      code: 'B',
      description:
        'utilizzazione economica, da parte dell’autore o dell’inventore, di opere dell’ingegno, di brevetti industriali e di processi, formule o informazioni relativi ad esperienze acquisite in campo industriale, commerciale o scientifico',
    },
    // Istruzioni CU 2026, agg. 24/02/2026, p. 82
    {
      code: 'C',
      description:
        'utili derivanti da contratti di associazione in partecipazione e da contratti di cointeressenza, quando l’apporto è costituito esclusivamente dalla prestazione di lavoro',
    },
    // Istruzioni CU 2026, agg. 24/02/2026, p. 82
    {
      code: 'D',
      description:
        'utili spettanti ai soci promotori ed ai soci fondatori delle società di capitali',
    },
    // Istruzioni CU 2026, agg. 24/02/2026, p. 82
    { code: 'E', description: 'levata di protesti cambiari da parte dei segretari comunali' },
    // Istruzioni CU 2026, agg. 24/02/2026, p. 82
    {
      code: 'G',
      description: 'indennità corrisposte per la cessazione di attività sportiva professionale',
    },
    // Istruzioni CU 2026, agg. 24/02/2026, p. 82
    {
      code: 'H',
      description:
        'indennità corrisposte per la cessazione dei rapporti di agenzia delle persone fisiche e delle società di persone con esclusione delle somme maturate entro il 31 dicembre 2003, già imputate per competenza e tassate come reddito d’impresa',
    },
    // Istruzioni CU 2026, agg. 24/02/2026, p. 82
    { code: 'I', description: 'indennità corrisposte per la cessazione da funzioni notarili' },
    // Istruzioni CU 2026, agg. 24/02/2026, p. 82
    {
      code: 'L',
      description:
        'redditi derivanti dall’utilizzazione economica di opere dell’ingegno, di brevetti industriali e di processi, formule e informazioni relativi a esperienze acquisite in campo industriale, commerciale o scientifico, che sono percepiti dagli aventi causa a titolo gratuito (ad es. eredi e legatari dell’autore e inventore)',
    },
    // Istruzioni CU 2026, agg. 24/02/2026, p. 82
    { code: 'M', description: 'prestazioni di lavoro autonomo non esercitate abitualmente' },
    // Istruzioni CU 2026, agg. 24/02/2026, p. 82
    {
      code: 'N',
      description:
        'le indennità di trasferta, i rimborsi forfetari di spesa, i premi e i compensi erogati ai direttori artistici ed ai collaboratori tecnici per prestazioni di natura non professionale da parte di cori, bande musicali e filodrammatiche che perseguono finalità dilettantistiche',
    },
    // Istruzioni CU 2026, agg. 24/02/2026, p. 82
    {
      code: 'O',
      description:
        'prestazioni di lavoro autonomo non esercitate abitualmente, per le quali non sussiste l’obbligo di iscrizione alla gestione separata ma con obbligo presso ex Pals',
    },
    // Istruzioni CU 2026, agg. 24/02/2026, p. 82
    {
      code: 'P',
      description:
        'compensi corrisposti a soggetti non residenti privi di stabile organizzazione per l’uso o la concessione in uso di attrezzature industriali, commerciali o scientifiche che si trovano nel territorio dello Stato ovvero a società svizzere o stabili organizzazioni di società svizzere che possiedono i requisiti di cui all’art. 15, comma 2 dell’Accordo tra la Comunità europea e la Confederazione svizzera del 26 ottobre 2004 (pubblicato in G.U.C.E. del 29 dicembre 2004 n. L385/30)',
    },
    // Istruzioni CU 2026, agg. 24/02/2026, p. 82
    {
      code: 'Q',
      description: 'provvigioni corrisposte ad agente o rappresentante di commercio monomandatario',
    },
    // Istruzioni CU 2026, agg. 24/02/2026, p. 82
    {
      code: 'R',
      description:
        'provvigioni corrisposte ad agente o rappresentante di commercio plurimandatario',
    },
    // Istruzioni CU 2026, agg. 24/02/2026, p. 83
    { code: 'S', description: 'provvigioni corrisposte a commissionario' },
    // Istruzioni CU 2026, agg. 24/02/2026, p. 83
    { code: 'T', description: 'provvigioni corrisposte a mediatore' },
    // Istruzioni CU 2026, agg. 24/02/2026, p. 83
    { code: 'U', description: 'provvigioni corrisposte a procacciatore di affari' },
    // Istruzioni CU 2026, agg. 24/02/2026, p. 83
    {
      code: 'V',
      description:
        'provvigioni corrisposte a incaricato per le vendite a domicilio; provvigioni corrisposte a incaricato per la vendita porta a porta e per la vendita ambulante di giornali quotidiani e periodici (L. 25 febbraio 1987, n. 67)',
    },
    // Istruzioni CU 2026, agg. 24/02/2026, p. 83. Leaves out «nel 2025» after «erogati»: the year
    // changes with every edition.
    {
      code: 'W',
      description:
        'corrispettivi erogati per prestazioni relative a contratti d’appalto cui si sono resi applicabili le disposizioni contenute nell’art. 25-ter del D.P.R. n. 600 del 29 settembre 1973',
    },
    // Istruzioni CU 2024, p. 79. Gone from the CU since the 2025 edition; the XSD still has it.
    {
      code: 'X',
      description:
        'canoni corrisposti nel 2004 da società o enti residenti ovvero da stabili organizzazioni di società estere di cui all’art. 26-quater, comma 1, lett. a) e b) del D.P.R. 600 del 29 settembre 1973, a società o stabili organizzazioni di società, situate in altro stato membro dell’Unione Europea in presenza dei requisiti di cui al citato art. 26-quater, del D.P.R. 600 del 29 settembre 1973, per i quali è stato effettuato, nell’anno 2006, il rimborso della ritenuta ai sensi dell’art. 4 del D.Lgs. 30 maggio 2005 n. 143',
    },
    // Istruzioni CU 2024, pp. 79-80. Gone from the CU since the 2025 edition; the XSD still has it.
    {
      code: 'Y',
      description:
        'canoni corrisposti dal 1° gennaio 2005 al 26 luglio 2005 da società o enti residenti ovvero da stabili organizzazioni di società estere di cui all’art. 26-quater, comma 1, lett. a) e b) del D.P.R. n. 600 del 29 settembre 1973, a società o stabili organizzazioni di società, situate in altro stato membro dell’Unione Europea in presenza dei requisiti di cui al citato art. 26-quater, del D.P.R. n. 600 del 29 settembre 1973, per i quali è stato effettuato, nell’anno 2006, il rimborso della ritenuta ai sensi dell’art. 4 del D.Lgs. 30 maggio 2005 n. 143',
    },
    // Istruzioni CU 2026, agg. 24/02/2026, p. 83. Text of ZO: the Specifiche tecniche del formato
    // FatturaPA 1.2.2 (p. 53) say «per il codice ZO indicare il valore Z».
    { code: 'Z', description: 'titolo diverso dai precedenti.' },
    // Istruzioni CU 2026, agg. 24/02/2026, p. 82
    {
      code: 'L1',
      description:
        'redditi derivanti dall’utilizzazione economica di opere dell’ingegno, di brevetti industriali e di processi, formule e informazioni relativi a esperienze acquisite in campo industriale, commerciale o scientifico, che sono percepiti da soggetti che abbiano acquistato a titolo oneroso i diritti alla loro utilizzazione',
    },
    // Istruzioni CU 2026, agg. 24/02/2026, p. 82
    {
      code: 'M1',
      description:
        'redditi derivanti dall’assunzione di obblighi di fare, di non fare o permettere',
    },
    // Istruzioni CU 2026, agg. 24/02/2026, p. 82
    {
      code: 'M2',
      description:
        'prestazioni di lavoro autonomo non esercitate abitualmente per le quali sussiste l’obbligo di iscrizione alla Gestione Separata ENPAPI',
    },
    // Istruzioni CU 2026, agg. 24/02/2026, p. 82
    {
      code: 'O1',
      description:
        'redditi derivanti dall’assunzione di obblighi di fare, di non fare o permettere, per le quali non sussiste l’obbligo di iscrizione alla gestione separata ma con obbligo presso ex Pals',
    },
    // Istruzioni CU 2026, agg. 24/02/2026, p. 82
    {
      code: 'V1',
      description:
        'redditi derivanti da attività commerciali non esercitate abitualmente (ad esempio, provvigioni corrisposte per prestazioni occasionali ad agente o rappresentante di commercio, mediatore, procacciatore d’affari)',
    },
    // Istruzioni CU 2026, agg. 24/02/2026, p. 83
    { code: 'ZO', description: 'titolo diverso dai precedenti.' },
  ],
  TipoScontoMaggiorazione: [
    { code: 'SC', description: 'SC = Sconto' },
    { code: 'MG', description: 'MG = Maggiorazione' },
  ],
  Art73: [
    {
      code: 'SI',
      description:
        "SI = Documento emesso secondo modalità e termini stabiliti con DM ai sensi dell'art. 73 DPR 633/72",
    },
  ],
  TipoCassa: [
    {
      code: 'TC01',
      description: 'Cassa nazionale previdenza e assistenza avvocati e procuratori legali',
    },
    { code: 'TC02', description: 'Cassa previdenza dottori commercialisti' },
    { code: 'TC03', description: 'Cassa previdenza e assistenza geometri' },
    {
      code: 'TC04',
      description:
        'Cassa nazionale previdenza e assistenza ingegneri e architetti liberi professionisti',
    },
    { code: 'TC05', description: 'Cassa nazionale del notariato' },
    {
      code: 'TC06',
      description: 'Cassa nazionale previdenza e assistenza ragionieri e periti commerciali',
    },
    {
      code: 'TC07',
      description: 'Ente nazionale assistenza agenti e rappresentanti di commercio (ENASARCO)',
    },
    {
      code: 'TC08',
      description: 'Ente nazionale previdenza e assistenza consulenti del lavoro (ENPACL)',
    },
    { code: 'TC09', description: 'Ente nazionale previdenza e assistenza medici (ENPAM)' },
    { code: 'TC10', description: 'Ente nazionale previdenza e assistenza farmacisti (ENPAF)' },
    { code: 'TC11', description: 'Ente nazionale previdenza e assistenza veterinari (ENPAV)' },
    {
      code: 'TC12',
      description: "Ente nazionale previdenza e assistenza impiegati dell'agricoltura (ENPAIA)",
    },
    {
      code: 'TC13',
      description: 'Fondo previdenza impiegati imprese di spedizione e agenzie marittime',
    },
    { code: 'TC14', description: 'Istituto nazionale previdenza giornalisti italiani (INPGI)' },
    { code: 'TC15', description: 'Opera nazionale assistenza orfani sanitari italiani (ONAOSI)' },
    {
      code: 'TC16',
      description: 'Cassa autonoma assistenza integrativa giornalisti italiani (CASAGIT)',
    },
    {
      code: 'TC17',
      description: 'Ente previdenza periti industriali e periti industriali laureati (EPPI)',
    },
    { code: 'TC18', description: 'Ente previdenza e assistenza pluricategoriale (EPAP)' },
    { code: 'TC19', description: 'Ente nazionale previdenza e assistenza biologi (ENPAB)' },
    {
      code: 'TC20',
      description: 'Ente nazionale previdenza e assistenza professione infermieristica (ENPAPI)',
    },
    { code: 'TC21', description: 'Ente nazionale previdenza e assistenza psicologi (ENPAP)' },
    { code: 'TC22', description: 'INPS' },
  ],
  TipoDocumento: [
    { code: 'TD01', description: 'Fattura' },
    { code: 'TD02', description: 'Acconto / anticipo su fattura' },
    { code: 'TD03', description: 'Acconto / anticipo su parcella' },
    { code: 'TD04', description: 'Nota di credito' },
    { code: 'TD05', description: 'Nota di debito' },
    { code: 'TD06', description: 'Parcella' },
    { code: 'TD16', description: 'Integrazione fattura reverse charge interno' },
    { code: 'TD17', description: "Integrazione/autofattura per acquisto servizi dall'estero" },
    { code: 'TD18', description: 'Integrazione per acquisto di beni intracomunitari' },
    {
      code: 'TD19',
      description: 'Integrazione/autofattura per acquisto di beni ex art.17 c.2 DPR 633/72',
    },
    {
      code: 'TD20',
      description:
        'Autofattura per regolarizzazione e integrazione delle fatture (ex art. 6 c.9-bis d.lgs. 471/97 o art.46 c.5 D.L. 331/93)',
    },
    { code: 'TD21', description: 'Autofattura per splafonamento' },
    { code: 'TD22', description: 'Estrazione benida Deposito IVA' },
    { code: 'TD23', description: "Estrazione beni da Deposito IVA con versamento dell'IVA" },
    {
      code: 'TD24',
      description:
        "Fattura differita di cui all'art.21, comma 4, terzo periodo lett. a) DPR 633/72",
    },
    {
      code: 'TD25',
      description:
        "Fattura differita di cui all'art.21, comma 4, terzo periodo lett. b) DPR 633/72",
    },
    {
      code: 'TD26',
      description: 'Cessione di beni ammortizzabili e per passaggi interni (ex art.36 DPR 633/72)',
    },
    { code: 'TD27', description: 'Fattura per autoconsumo o per cessioni gratuite senza rivalsa' },
    { code: 'TD28', description: 'Acquisti da San Marino con IVA (fattura cartacea)' },
    {
      code: 'TD29',
      description:
        'Comunicazione per omessa o irregolare fatturazione da parte del cedente/prestatore italiano (art. 6, comma 8, D.Lgs. 471/97)',
    },
  ],
  TipoRitenuta: [
    { code: 'RT01', description: 'Ritenuta di acconto persone fisiche' },
    { code: 'RT02', description: 'Ritenuta di acconto persone giuridiche' },
    { code: 'RT03', description: 'Contributo INPS' },
    { code: 'RT04', description: 'Contributo ENASARCO' },
    { code: 'RT05', description: 'Contributo ENPAM' },
    { code: 'RT06', description: 'Altro contributo previdenziale' },
  ],
  SoggettoEmittente: [
    { code: 'CC', description: 'Cessionario / Committente' },
    { code: 'TZ', description: 'Terzo' },
  ],
  RegimeFiscale: [
    { code: 'RF01', description: 'Regime ordinario' },
    { code: 'RF02', description: 'Regime dei contribuenti minimi (art. 1,c.96-117, L. 244/2007)' },
    {
      code: 'RF04',
      description: 'Agricoltura e attività connesse e pesca (artt. 34 e 34-bis, D.P.R. 633/1972)',
    },
    { code: 'RF05', description: 'Vendita sali e tabacchi (art. 74, c.1, D.P.R. 633/1972)' },
    { code: 'RF06', description: 'Commercio dei fiammiferi (art. 74, c.1, D.P.R. 633/1972)' },
    { code: 'RF07', description: 'Editoria (art. 74, c.1, D.P.R. 633/1972)' },
    {
      code: 'RF08',
      description: 'Gestione di servizi di telefonia pubblica (art. 74, c.1, D.P.R. 633/1972)',
    },
    {
      code: 'RF09',
      description:
        'Rivendita di documenti di trasporto pubblico e di sosta (art. 74, c.1, D.P.R. 633/1972)',
    },
    {
      code: 'RF10',
      description:
        'Intrattenimenti, giochi e altre attività di cui alla tariffa allegata al D.P.R. 640/72 (art. 74, c.6, D.P.R. 633/1972)',
    },
    { code: 'RF11', description: 'Agenzie di viaggi e turismo (art. 74-ter, D.P.R. 633/1972)' },
    { code: 'RF12', description: 'Agriturismo (art. 5, c.2, L. 413/1991)' },
    { code: 'RF13', description: 'Vendite a domicilio (art. 25-bis, c.6, D.P.R. 600/1973)' },
    {
      code: 'RF14',
      description:
        'Rivendita di beni usati, di oggetti d’arte, d’antiquariato o da collezione (art. 36, D.L. 41/1995)',
    },
    {
      code: 'RF15',
      description:
        'Agenzie di vendite all’asta di oggetti d’arte, antiquariato o da collezione (art. 40-bis, D.L. 41/1995)',
    },
    { code: 'RF16', description: 'IVA per cassa P.A. (art. 6, c.5, D.P.R. 633/1972)' },
    { code: 'RF17', description: 'IVA per cassa (art. 32-bis, D.L. 83/2012)' },
    { code: 'RF18', description: 'Altro' },
    { code: 'RF19', description: 'Regime forfettario' },
    {
      code: 'RF20',
      description: 'Regime transfrontaliero di Franchigia IVA (Direttiva UE 2020/285)',
    },
  ],
  CondizioniPagamento: [
    { code: 'TP01', description: 'pagamento a rate' },
    { code: 'TP02', description: 'pagamento completo' },
    { code: 'TP03', description: 'anticipo' },
  ],
  ModalitaPagamento: [
    { code: 'MP01', description: 'contanti' },
    { code: 'MP02', description: 'assegno' },
    { code: 'MP03', description: 'assegno circolare' },
    { code: 'MP04', description: 'contanti presso Tesoreria' },
    { code: 'MP05', description: 'bonifico' },
    { code: 'MP06', description: 'vaglia cambiario' },
    { code: 'MP07', description: 'bollettino bancario' },
    { code: 'MP08', description: 'carta di pagamento' },
    { code: 'MP09', description: 'RID' },
    { code: 'MP10', description: 'RID utenze' },
    { code: 'MP11', description: 'RID veloce' },
    { code: 'MP12', description: 'RIBA' },
    { code: 'MP13', description: 'MAV' },
    { code: 'MP14', description: 'quietanza erario' },
    { code: 'MP15', description: 'giroconto su conti di contabilità speciale' },
    { code: 'MP16', description: 'domiciliazione bancaria' },
    { code: 'MP17', description: 'domiciliazione postale' },
    { code: 'MP18', description: 'bollettino di c/c postale' },
    { code: 'MP19', description: 'SEPA Direct Debit' },
    { code: 'MP20', description: 'SEPA Direct Debit CORE' },
    { code: 'MP21', description: 'SEPA Direct Debit B2B' },
    { code: 'MP22', description: 'Trattenuta su somme già riscosse' },
    { code: 'MP23', description: 'PagoPA' },
  ],
  Ritenuta: [{ code: 'SI', description: 'SI = Cessione / Prestazione soggetta a ritenuta' }],
  EsigibilitaIVA: [
    { code: 'D', description: 'esigibilità differita' },
    { code: 'I', description: 'esigibilità immediata' },
    { code: 'S', description: 'scissione dei pagamenti' },
  ],
  Natura: [
    { code: 'N1', description: 'Escluse ex. art. 15 del D.P.R. 633/1972' },
    { code: 'N2', description: 'Non soggette' },
    {
      code: 'N2.1',
      description: 'Non soggette ad IVA ai sensi degli artt. da 7 a 7-septies del DPR 633/72',
    },
    { code: 'N2.2', description: 'Non soggette - altri casi' },
    { code: 'N3', description: 'Non imponibili' },
    { code: 'N3.1', description: 'Non Imponibili - esportazioni' },
    { code: 'N3.2', description: 'Non Imponibili - cessioni intracomunitarie' },
    { code: 'N3.3', description: 'Non Imponibili - cessioni verso San Marino' },
    {
      code: 'N3.4',
      description: "Non Imponibili - operazioni assimilate alle cessioni all'esportazione",
    },
    { code: 'N3.5', description: "Non Imponibili - a seguito di dichiarazioni d'intento" },
    {
      code: 'N3.6',
      description:
        'Non Imponibili - altre operazioni che non concorrono alla formazione del plafond',
    },
    { code: 'N4', description: 'Esenti' },
    { code: 'N5', description: 'Regime del margine/IVA non esposta in fattura' },
    {
      code: 'N6',
      description:
        'Inversione contabile (per le operazioni in reverse charge ovvero nei casi di autofatturazione per acquisti extra UE di servizi ovvero per importazioni di beni nei soli casi previsti)',
    },
    {
      code: 'N6.1',
      description: 'Inversione contabile - cessione di rottami e altri materiali di recupero',
    },
    {
      code: 'N6.2',
      description:
        'Inversione contabile - cessione di oro e argento ai sensi della legge 7/2000 nonché di oreficeria usata ad OPO',
    },
    { code: 'N6.3', description: 'Inversione contabile - subappalto nel settore edile' },
    { code: 'N6.4', description: 'Inversione contabile - cessione di fabbricati' },
    { code: 'N6.5', description: 'Inversione contabile - cessione di telefoni cellulari' },
    { code: 'N6.6', description: 'Inversione contabile - cessione di prodotti elettronici' },
    {
      code: 'N6.7',
      description: 'Inversione contabile - prestazioni comparto edile e settori connessi',
    },
    { code: 'N6.8', description: 'Inversione contabile - operazioni settore energetico' },
    { code: 'N6.9', description: 'Inversione contabile - altri casi' },
    {
      code: 'N7',
      description:
        'IVA assolta in altro stato UE (prestazione di servizi di telecomunicazioni, tele-radiodiffusione ed elettronici ex art. 7-octies lett. a, b, art. 74-sexies DPR 633/72)',
    },
  ],
  SocioUnico: [
    { code: 'SU', description: 'socio unico' },
    { code: 'SM', description: 'più soci' },
  ],
  StatoLiquidazione: [
    { code: 'LS', description: 'in liquidazione' },
    { code: 'LN', description: 'non in liquidazione' },
  ],
  TipoCessionePrestazione: [
    { code: 'SC', description: 'Sconto' },
    { code: 'PR', description: 'Premio' },
    { code: 'AB', description: 'Abbuono' },
    { code: 'AC', description: 'Spesa accessoria' },
  ],
  BolloVirtuale: [
    // Rappresentazione tabellare della fattura ordinaria, p. 4
    { code: 'SI', description: 'Bollo assolto ai sensi del decreto MEF 17 giugno 2014 (art. 6)' },
  ],
};
