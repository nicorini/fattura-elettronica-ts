// Generated from specs/fatturapa-1.2.3/Schema_VFPR12_v1.2.3.xsd by scripts/generate.
// Do not edit: change the generator and run `pnpm generate`.

/**
 * XML schema fatture destinate a PA e privati in forma ordinaria 1.2.3
 *
 * `FatturaElettronicaType` in the XSD.
 */
export interface FatturaElettronica {
  versione: FormatoTrasmissione;
  SistemaEmittente?: string;
  FatturaElettronicaHeader: FatturaElettronicaHeader;
  FatturaElettronicaBody: FatturaElettronicaBody[];
  /**
   * XAdES signature (`ds:Signature`) as raw XML, kept exactly as read. Any change to the invoice
   * invalidates it.
   */
  Signature?: string;
}

/** `FatturaElettronicaHeaderType` in the XSD. */
export interface FatturaElettronicaHeader {
  /** Blocco relativo ai dati di trasmissione della Fattura Elettronica */
  DatiTrasmissione: DatiTrasmissione;
  /** Blocco relativo ai dati del Cedente / Prestatore */
  CedentePrestatore: CedentePrestatore;
  /** Blocco relativo ai dati del Rappresentante Fiscale */
  RappresentanteFiscale?: RappresentanteFiscale;
  /** Blocco relativo ai dati del Cessionario / Committente */
  CessionarioCommittente: CessionarioCommittente;
  /**
   * Blocco relativo ai dati del Terzo Intermediario che emette fattura elettronica per conto del
   * Cedente/Prestatore
   */
  TerzoIntermediarioOSoggettoEmittente?: TerzoIntermediarioSoggettoEmittente;
  SoggettoEmittente?: SoggettoEmittente;
}

/** `FatturaElettronicaBodyType` in the XSD. */
export interface FatturaElettronicaBody {
  /** Blocco relativo ai Dati Generali della Fattura Elettronica */
  DatiGenerali: DatiGenerali;
  /** Blocco relativo ai dati di Beni Servizi della Fattura Elettronica */
  DatiBeniServizi: DatiBeniServizi;
  /**
   * Blocco relativo ai dati dei Veicoli della Fattura Elettronica (da indicare nei casi di cessioni
   * tra Paesi membri di mezzi di trasporto nuovi, in base all'art. 38, comma 4 del dl 331 del 1993)
   */
  DatiVeicoli?: DatiVeicoli;
  /** Blocco relativo ai dati di Pagamento della Fattura Elettronica */
  DatiPagamento?: DatiPagamento[];
  /** Blocco relativo ai dati di eventuali allegati */
  Allegati?: Allegati[];
}

/**
 * Blocco relativo ai dati di trasmissione della Fattura Elettronica
 *
 * `DatiTrasmissioneType` in the XSD.
 */
export interface DatiTrasmissione {
  IdTrasmittente: IdFiscale;
  ProgressivoInvio: string;
  FormatoTrasmissione: FormatoTrasmissione;
  CodiceDestinatario: string;
  ContattiTrasmittente?: ContattiTrasmittente;
  PECDestinatario?: string;
}

/** `IdFiscaleType` in the XSD. */
export interface IdFiscale {
  IdPaese: string;
  IdCodice: string;
}

/** `ContattiTrasmittenteType` in the XSD. */
export interface ContattiTrasmittente {
  Telefono?: string;
  Email?: string;
}

/**
 * Blocco relativo ai Dati Generali della Fattura Elettronica
 *
 * `DatiGeneraliType` in the XSD.
 */
export interface DatiGenerali {
  DatiGeneraliDocumento: DatiGeneraliDocumento;
  DatiOrdineAcquisto?: DatiDocumentiCorrelati[];
  DatiContratto?: DatiDocumentiCorrelati[];
  DatiConvenzione?: DatiDocumentiCorrelati[];
  DatiRicezione?: DatiDocumentiCorrelati[];
  DatiFattureCollegate?: DatiDocumentiCorrelati[];
  DatiSAL?: DatiSAL[];
  DatiDDT?: DatiDDT[];
  DatiTrasporto?: DatiTrasporto;
  FatturaPrincipale?: FatturaPrincipale;
}

/** `DatiGeneraliDocumentoType` in the XSD. */
export interface DatiGeneraliDocumento {
  TipoDocumento: TipoDocumento;
  Divisa: string;
  Data: string;
  Numero: string;
  DatiRitenuta?: DatiRitenuta[];
  DatiBollo?: DatiBollo;
  DatiCassaPrevidenziale?: DatiCassaPrevidenziale[];
  ScontoMaggiorazione?: ScontoMaggiorazione[];
  ImportoTotaleDocumento?: string;
  Arrotondamento?: string;
  Causale?: string[];
  Art73?: Art73;
}

/** `DatiRitenutaType` in the XSD. */
export interface DatiRitenuta {
  TipoRitenuta: TipoRitenuta;
  ImportoRitenuta: string;
  AliquotaRitenuta: string;
  CausalePagamento: CausalePagamento;
}

/** `DatiBolloType` in the XSD. */
export interface DatiBollo {
  BolloVirtuale: BolloVirtuale;
  ImportoBollo?: string;
}

/** `DatiCassaPrevidenzialeType` in the XSD. */
export interface DatiCassaPrevidenziale {
  TipoCassa: TipoCassa;
  AlCassa: string;
  ImportoContributoCassa: string;
  ImponibileCassa?: string;
  AliquotaIVA: string;
  Ritenuta?: Ritenuta;
  Natura?: Natura;
  RiferimentoAmministrazione?: string;
}

/** `ScontoMaggiorazioneType` in the XSD. */
export interface ScontoMaggiorazione {
  Tipo: TipoScontoMaggiorazione;
  Percentuale?: string;
  Importo?: string;
}

/** `DatiSALType` in the XSD. */
export interface DatiSAL {
  RiferimentoFase: string;
}

/** `DatiDocumentiCorrelatiType` in the XSD. */
export interface DatiDocumentiCorrelati {
  RiferimentoNumeroLinea?: string[];
  IdDocumento: string;
  Data?: string;
  NumItem?: string;
  CodiceCommessaConvenzione?: string;
  CodiceCUP?: string;
  CodiceCIG?: string;
}

/** `DatiDDTType` in the XSD. */
export interface DatiDDT {
  NumeroDDT: string;
  DataDDT: string;
  RiferimentoNumeroLinea?: string[];
}

/** `DatiTrasportoType` in the XSD. */
export interface DatiTrasporto {
  DatiAnagraficiVettore?: DatiAnagraficiVettore;
  MezzoTrasporto?: string;
  CausaleTrasporto?: string;
  NumeroColli?: string;
  Descrizione?: string;
  UnitaMisuraPeso?: string;
  PesoLordo?: string;
  PesoNetto?: string;
  DataOraRitiro?: string;
  DataInizioTrasporto?: string;
  TipoResa?: string;
  IndirizzoResa?: Indirizzo;
  DataOraConsegna?: string;
}

/** `IndirizzoType` in the XSD. */
export interface Indirizzo {
  Indirizzo: string;
  NumeroCivico?: string;
  CAP: string;
  Comune: string;
  Provincia?: string;
  /** XSD default: `IT`. */
  Nazione: string;
}

/** `FatturaPrincipaleType` in the XSD. */
export interface FatturaPrincipale {
  NumeroFatturaPrincipale: string;
  DataFatturaPrincipale: string;
}

/**
 * Blocco relativo ai dati del Cedente / Prestatore
 *
 * `CedentePrestatoreType` in the XSD.
 */
export interface CedentePrestatore {
  DatiAnagrafici: DatiAnagraficiCedente;
  Sede: Indirizzo;
  StabileOrganizzazione?: Indirizzo;
  IscrizioneREA?: IscrizioneREA;
  Contatti?: Contatti;
  RiferimentoAmministrazione?: string;
}

/** `DatiAnagraficiCedenteType` in the XSD. */
export interface DatiAnagraficiCedente {
  IdFiscaleIVA: IdFiscale;
  CodiceFiscale?: string;
  /** Il campo Denominazione è in alternativa ai campi Nome e Cognome */
  Anagrafica: Anagrafica;
  AlboProfessionale?: string;
  ProvinciaAlbo?: string;
  NumeroIscrizioneAlbo?: string;
  DataIscrizioneAlbo?: string;
  RegimeFiscale: RegimeFiscale;
}

/**
 * Il campo Denominazione è in alternativa ai campi Nome e Cognome
 *
 * `AnagraficaType` in the XSD.
 */
export type Anagrafica = (
  | {
      Denominazione: string;
      Nome?: never;
      Cognome?: never;
    }
  | {
      Denominazione?: never;
      Nome: string;
      Cognome: string;
    }
) & {
  Titolo?: string;
  CodEORI?: string;
};

/** `DatiAnagraficiVettoreType` in the XSD. */
export interface DatiAnagraficiVettore {
  IdFiscaleIVA: IdFiscale;
  CodiceFiscale?: string;
  /** Il campo Denominazione è in alternativa ai campi Nome e Cognome */
  Anagrafica: Anagrafica;
  NumeroLicenzaGuida?: string;
}

/** `IscrizioneREAType` in the XSD. */
export interface IscrizioneREA {
  Ufficio: string;
  NumeroREA: string;
  CapitaleSociale?: string;
  SocioUnico?: SocioUnico;
  StatoLiquidazione: StatoLiquidazione;
}

/** `ContattiType` in the XSD. */
export interface Contatti {
  Telefono?: string;
  Fax?: string;
  Email?: string;
}

/**
 * Blocco relativo ai dati del Rappresentante Fiscale
 *
 * `RappresentanteFiscaleType` in the XSD.
 */
export interface RappresentanteFiscale {
  DatiAnagrafici: DatiAnagraficiRappresentante;
}

/** `DatiAnagraficiRappresentanteType` in the XSD. */
export interface DatiAnagraficiRappresentante {
  IdFiscaleIVA: IdFiscale;
  CodiceFiscale?: string;
  /** Il campo Denominazione è in alternativa ai campi Nome e Cognome */
  Anagrafica: Anagrafica;
}

/**
 * Blocco relativo ai dati del Cessionario / Committente
 *
 * `CessionarioCommittenteType` in the XSD.
 */
export interface CessionarioCommittente {
  DatiAnagrafici: DatiAnagraficiCessionario;
  Sede: Indirizzo;
  StabileOrganizzazione?: Indirizzo;
  RappresentanteFiscale?: RappresentanteFiscaleCessionario;
}

/** `RappresentanteFiscaleCessionarioType` in the XSD. */
export type RappresentanteFiscaleCessionario = {
  IdFiscaleIVA: IdFiscale;
} & (
  | {
      Denominazione: string;
      Nome?: never;
      Cognome?: never;
    }
  | {
      Denominazione?: never;
      Nome: string;
      Cognome: string;
    }
);

/** `DatiAnagraficiCessionarioType` in the XSD. */
export interface DatiAnagraficiCessionario {
  IdFiscaleIVA?: IdFiscale;
  CodiceFiscale?: string;
  /** Il campo Denominazione è in alternativa ai campi Nome e Cognome */
  Anagrafica: Anagrafica;
}

/**
 * Blocco relativo ai dati di Beni Servizi della Fattura Elettronica
 *
 * `DatiBeniServiziType` in the XSD.
 */
export interface DatiBeniServizi {
  DettaglioLinee: DettaglioLinee[];
  DatiRiepilogo: DatiRiepilogo[];
}

/**
 * Blocco relativo ai dati dei Veicoli della Fattura Elettronica (da indicare nei casi di cessioni
 * tra Paesi membri di mezzi di trasporto nuovi, in base all'art. 38, comma 4 del dl 331 del 1993)
 *
 * `DatiVeicoliType` in the XSD.
 */
export interface DatiVeicoli {
  Data: string;
  TotalePercorso: string;
}

/**
 * Blocco relativo ai dati di Pagamento della Fattura Elettronica
 *
 * `DatiPagamentoType` in the XSD.
 */
export interface DatiPagamento {
  CondizioniPagamento: CondizioniPagamento;
  DettaglioPagamento: DettaglioPagamento[];
}

/** `DettaglioPagamentoType` in the XSD. */
export interface DettaglioPagamento {
  Beneficiario?: string;
  ModalitaPagamento: ModalitaPagamento;
  DataRiferimentoTerminiPagamento?: string;
  GiorniTerminiPagamento?: string;
  DataScadenzaPagamento?: string;
  ImportoPagamento: string;
  CodUfficioPostale?: string;
  CognomeQuietanzante?: string;
  NomeQuietanzante?: string;
  CFQuietanzante?: string;
  TitoloQuietanzante?: string;
  IstitutoFinanziario?: string;
  IBAN?: string;
  ABI?: string;
  CAB?: string;
  BIC?: string;
  ScontoPagamentoAnticipato?: string;
  DataLimitePagamentoAnticipato?: string;
  PenalitaPagamentiRitardati?: string;
  DataDecorrenzaPenale?: string;
  CodicePagamento?: string;
}

/**
 * Blocco relativo ai dati del Terzo Intermediario che emette fattura elettronica per conto del
 * Cedente/Prestatore
 *
 * `TerzoIntermediarioSoggettoEmittenteType` in the XSD.
 */
export interface TerzoIntermediarioSoggettoEmittente {
  DatiAnagrafici: DatiAnagraficiTerzoIntermediario;
}

/** `DatiAnagraficiTerzoIntermediarioType` in the XSD. */
export interface DatiAnagraficiTerzoIntermediario {
  IdFiscaleIVA?: IdFiscale;
  CodiceFiscale?: string;
  /** Il campo Denominazione è in alternativa ai campi Nome e Cognome */
  Anagrafica: Anagrafica;
}

/**
 * Blocco relativo ai dati di eventuali allegati
 *
 * `AllegatiType` in the XSD.
 */
export interface Allegati {
  NomeAttachment: string;
  AlgoritmoCompressione?: string;
  FormatoAttachment?: string;
  DescrizioneAttachment?: string;
  Attachment: string;
}

/** `DettaglioLineeType` in the XSD. */
export interface DettaglioLinee {
  NumeroLinea: string;
  TipoCessionePrestazione?: TipoCessionePrestazione;
  CodiceArticolo?: CodiceArticolo[];
  Descrizione: string;
  Quantita?: string;
  UnitaMisura?: string;
  DataInizioPeriodo?: string;
  DataFinePeriodo?: string;
  PrezzoUnitario: string;
  ScontoMaggiorazione?: ScontoMaggiorazione[];
  PrezzoTotale: string;
  AliquotaIVA: string;
  Ritenuta?: Ritenuta;
  Natura?: Natura;
  RiferimentoAmministrazione?: string;
  AltriDatiGestionali?: AltriDatiGestionali[];
}

/** `CodiceArticoloType` in the XSD. */
export interface CodiceArticolo {
  CodiceTipo: string;
  CodiceValore: string;
}

/** `AltriDatiGestionaliType` in the XSD. */
export interface AltriDatiGestionali {
  TipoDato: string;
  RiferimentoTesto?: string;
  RiferimentoNumero?: string;
  RiferimentoData?: string;
}

/** `DatiRiepilogoType` in the XSD. */
export interface DatiRiepilogo {
  AliquotaIVA: string;
  Natura?: Natura;
  SpeseAccessorie?: string;
  Arrotondamento?: string;
  ImponibileImporto: string;
  Imposta: string;
  EsigibilitaIVA?: EsigibilitaIVA;
  RiferimentoNormativo?: string;
}

/**
 * Codes allowed by `FormatoTrasmissioneType`; descriptions in `codeLists.FormatoTrasmissione`.
 *
 * - `FPA12`: Fattura verso PA
 * - `FPR12`: Fattura verso privati
 */
export type FormatoTrasmissione = 'FPA12' | 'FPR12';

/**
 * Codes allowed by `CausalePagamentoType`; descriptions in `codeLists.CausalePagamento`.
 *
 * - `A`
 * - `B`
 * - `C`
 * - `D`
 * - `E`
 * - `G`
 * - `H`
 * - `I`
 * - `L`
 * - `M`
 * - `N`
 * - `O`
 * - `P`
 * - `Q`
 * - `R`
 * - `S`
 * - `T`
 * - `U`
 * - `V`
 * - `W`
 * - `X`
 * - `Y`
 * - `Z`
 * - `L1`
 * - `M1`
 * - `M2`
 * - `O1`
 * - `V1`
 * - `ZO`
 */
export type CausalePagamento =
  | 'A'
  | 'B'
  | 'C'
  | 'D'
  | 'E'
  | 'G'
  | 'H'
  | 'I'
  | 'L'
  | 'M'
  | 'N'
  | 'O'
  | 'P'
  | 'Q'
  | 'R'
  | 'S'
  | 'T'
  | 'U'
  | 'V'
  | 'W'
  | 'X'
  | 'Y'
  | 'Z'
  | 'L1'
  | 'M1'
  | 'M2'
  | 'O1'
  | 'V1'
  | 'ZO';

/**
 * Codes allowed by `TipoScontoMaggiorazioneType`; descriptions in
 * `codeLists.TipoScontoMaggiorazione`.
 *
 * - `SC`: SC = Sconto
 * - `MG`: MG = Maggiorazione
 */
export type TipoScontoMaggiorazione = 'SC' | 'MG';

/**
 * Codes allowed by `Art73Type`; descriptions in `codeLists.Art73`.
 *
 * - `SI`: SI = Documento emesso secondo modalità e termini stabiliti con DM ai sensi dell'art. 73
 *   DPR 633/72
 */
export type Art73 = 'SI';

/**
 * Codes allowed by `TipoCassaType`; descriptions in `codeLists.TipoCassa`.
 *
 * - `TC01`: Cassa nazionale previdenza e assistenza avvocati e procuratori legali
 * - `TC02`: Cassa previdenza dottori commercialisti
 * - `TC03`: Cassa previdenza e assistenza geometri
 * - `TC04`: Cassa nazionale previdenza e assistenza ingegneri e architetti liberi professionisti
 * - `TC05`: Cassa nazionale del notariato
 * - `TC06`: Cassa nazionale previdenza e assistenza ragionieri e periti commerciali
 * - `TC07`: Ente nazionale assistenza agenti e rappresentanti di commercio (ENASARCO)
 * - `TC08`: Ente nazionale previdenza e assistenza consulenti del lavoro (ENPACL)
 * - `TC09`: Ente nazionale previdenza e assistenza medici (ENPAM)
 * - `TC10`: Ente nazionale previdenza e assistenza farmacisti (ENPAF)
 * - `TC11`: Ente nazionale previdenza e assistenza veterinari (ENPAV)
 * - `TC12`: Ente nazionale previdenza e assistenza impiegati dell'agricoltura (ENPAIA)
 * - `TC13`: Fondo previdenza impiegati imprese di spedizione e agenzie marittime
 * - `TC14`: Istituto nazionale previdenza giornalisti italiani (INPGI)
 * - `TC15`: Opera nazionale assistenza orfani sanitari italiani (ONAOSI)
 * - `TC16`: Cassa autonoma assistenza integrativa giornalisti italiani (CASAGIT)
 * - `TC17`: Ente previdenza periti industriali e periti industriali laureati (EPPI)
 * - `TC18`: Ente previdenza e assistenza pluricategoriale (EPAP)
 * - `TC19`: Ente nazionale previdenza e assistenza biologi (ENPAB)
 * - `TC20`: Ente nazionale previdenza e assistenza professione infermieristica (ENPAPI)
 * - `TC21`: Ente nazionale previdenza e assistenza psicologi (ENPAP)
 * - `TC22`: INPS
 */
export type TipoCassa =
  | 'TC01'
  | 'TC02'
  | 'TC03'
  | 'TC04'
  | 'TC05'
  | 'TC06'
  | 'TC07'
  | 'TC08'
  | 'TC09'
  | 'TC10'
  | 'TC11'
  | 'TC12'
  | 'TC13'
  | 'TC14'
  | 'TC15'
  | 'TC16'
  | 'TC17'
  | 'TC18'
  | 'TC19'
  | 'TC20'
  | 'TC21'
  | 'TC22';

/**
 * Codes allowed by `TipoDocumentoType`; descriptions in `codeLists.TipoDocumento`.
 *
 * - `TD01`: Fattura
 * - `TD02`: Acconto / anticipo su fattura
 * - `TD03`: Acconto / anticipo su parcella
 * - `TD04`: Nota di credito
 * - `TD05`: Nota di debito
 * - `TD06`: Parcella
 * - `TD16`: Integrazione fattura reverse charge interno
 * - `TD17`: Integrazione/autofattura per acquisto servizi dall'estero
 * - `TD18`: Integrazione per acquisto di beni intracomunitari
 * - `TD19`: Integrazione/autofattura per acquisto di beni ex art.17 c.2 DPR 633/72
 * - `TD20`: Autofattura per regolarizzazione e integrazione delle fatture (ex art. 6 c.9-bis d.lgs.
 *   471/97 o art.46 c.5 D.L. 331/93)
 * - `TD21`: Autofattura per splafonamento
 * - `TD22`: Estrazione benida Deposito IVA
 * - `TD23`: Estrazione beni da Deposito IVA con versamento dell'IVA
 * - `TD24`: Fattura differita di cui all'art.21, comma 4, terzo periodo lett. a) DPR 633/72
 * - `TD25`: Fattura differita di cui all'art.21, comma 4, terzo periodo lett. b) DPR 633/72
 * - `TD26`: Cessione di beni ammortizzabili e per passaggi interni (ex art.36 DPR 633/72)
 * - `TD27`: Fattura per autoconsumo o per cessioni gratuite senza rivalsa
 * - `TD28`: Acquisti da San Marino con IVA (fattura cartacea)
 * - `TD29`: Comunicazione per omessa o irregolare fatturazione da parte del cedente/prestatore
 *   italiano (art. 6, comma 8, D.Lgs. 471/97)
 */
export type TipoDocumento =
  | 'TD01'
  | 'TD02'
  | 'TD03'
  | 'TD04'
  | 'TD05'
  | 'TD06'
  | 'TD16'
  | 'TD17'
  | 'TD18'
  | 'TD19'
  | 'TD20'
  | 'TD21'
  | 'TD22'
  | 'TD23'
  | 'TD24'
  | 'TD25'
  | 'TD26'
  | 'TD27'
  | 'TD28'
  | 'TD29';

/**
 * Codes allowed by `TipoRitenutaType`; descriptions in `codeLists.TipoRitenuta`.
 *
 * - `RT01`: Ritenuta di acconto persone fisiche
 * - `RT02`: Ritenuta di acconto persone giuridiche
 * - `RT03`: Contributo INPS
 * - `RT04`: Contributo ENASARCO
 * - `RT05`: Contributo ENPAM
 * - `RT06`: Altro contributo previdenziale
 */
export type TipoRitenuta = 'RT01' | 'RT02' | 'RT03' | 'RT04' | 'RT05' | 'RT06';

/**
 * Codes allowed by `SoggettoEmittenteType`; descriptions in `codeLists.SoggettoEmittente`.
 *
 * - `CC`: Cessionario / Committente
 * - `TZ`: Terzo
 */
export type SoggettoEmittente = 'CC' | 'TZ';

/**
 * Codes allowed by `RegimeFiscaleType`; descriptions in `codeLists.RegimeFiscale`.
 *
 * - `RF01`: Regime ordinario
 * - `RF02`: Regime dei contribuenti minimi (art. 1,c.96-117, L. 244/2007)
 * - `RF04`: Agricoltura e attività connesse e pesca (artt. 34 e 34-bis, D.P.R. 633/1972)
 * - `RF05`: Vendita sali e tabacchi (art. 74, c.1, D.P.R. 633/1972)
 * - `RF06`: Commercio dei fiammiferi (art. 74, c.1, D.P.R. 633/1972)
 * - `RF07`: Editoria (art. 74, c.1, D.P.R. 633/1972)
 * - `RF08`: Gestione di servizi di telefonia pubblica (art. 74, c.1, D.P.R. 633/1972)
 * - `RF09`: Rivendita di documenti di trasporto pubblico e di sosta (art. 74, c.1, D.P.R. 633/1972)
 * - `RF10`: Intrattenimenti, giochi e altre attività di cui alla tariffa allegata al D.P.R. 640/72
 *   (art. 74, c.6, D.P.R. 633/1972)
 * - `RF11`: Agenzie di viaggi e turismo (art. 74-ter, D.P.R. 633/1972)
 * - `RF12`: Agriturismo (art. 5, c.2, L. 413/1991)
 * - `RF13`: Vendite a domicilio (art. 25-bis, c.6, D.P.R. 600/1973)
 * - `RF14`: Rivendita di beni usati, di oggetti d’arte, d’antiquariato o da collezione (art. 36,
 *   D.L. 41/1995)
 * - `RF15`: Agenzie di vendite all’asta di oggetti d’arte, antiquariato o da collezione (art.
 *   40-bis, D.L. 41/1995)
 * - `RF16`: IVA per cassa P.A. (art. 6, c.5, D.P.R. 633/1972)
 * - `RF17`: IVA per cassa (art. 32-bis, D.L. 83/2012)
 * - `RF18`: Altro
 * - `RF19`: Regime forfettario
 * - `RF20`: Regime transfrontaliero di Franchigia IVA (Direttiva UE 2020/285)
 */
export type RegimeFiscale =
  | 'RF01'
  | 'RF02'
  | 'RF04'
  | 'RF05'
  | 'RF06'
  | 'RF07'
  | 'RF08'
  | 'RF09'
  | 'RF10'
  | 'RF11'
  | 'RF12'
  | 'RF13'
  | 'RF14'
  | 'RF15'
  | 'RF16'
  | 'RF17'
  | 'RF18'
  | 'RF19'
  | 'RF20';

/**
 * Codes allowed by `CondizioniPagamentoType`; descriptions in `codeLists.CondizioniPagamento`.
 *
 * - `TP01`: pagamento a rate
 * - `TP02`: pagamento completo
 * - `TP03`: anticipo
 */
export type CondizioniPagamento = 'TP01' | 'TP02' | 'TP03';

/**
 * Codes allowed by `ModalitaPagamentoType`; descriptions in `codeLists.ModalitaPagamento`.
 *
 * - `MP01`: contanti
 * - `MP02`: assegno
 * - `MP03`: assegno circolare
 * - `MP04`: contanti presso Tesoreria
 * - `MP05`: bonifico
 * - `MP06`: vaglia cambiario
 * - `MP07`: bollettino bancario
 * - `MP08`: carta di pagamento
 * - `MP09`: RID
 * - `MP10`: RID utenze
 * - `MP11`: RID veloce
 * - `MP12`: RIBA
 * - `MP13`: MAV
 * - `MP14`: quietanza erario
 * - `MP15`: giroconto su conti di contabilità speciale
 * - `MP16`: domiciliazione bancaria
 * - `MP17`: domiciliazione postale
 * - `MP18`: bollettino di c/c postale
 * - `MP19`: SEPA Direct Debit
 * - `MP20`: SEPA Direct Debit CORE
 * - `MP21`: SEPA Direct Debit B2B
 * - `MP22`: Trattenuta su somme già riscosse
 * - `MP23`: PagoPA
 */
export type ModalitaPagamento =
  | 'MP01'
  | 'MP02'
  | 'MP03'
  | 'MP04'
  | 'MP05'
  | 'MP06'
  | 'MP07'
  | 'MP08'
  | 'MP09'
  | 'MP10'
  | 'MP11'
  | 'MP12'
  | 'MP13'
  | 'MP14'
  | 'MP15'
  | 'MP16'
  | 'MP17'
  | 'MP18'
  | 'MP19'
  | 'MP20'
  | 'MP21'
  | 'MP22'
  | 'MP23';

/**
 * Codes allowed by `RitenutaType`; descriptions in `codeLists.Ritenuta`.
 *
 * - `SI`: SI = Cessione / Prestazione soggetta a ritenuta
 */
export type Ritenuta = 'SI';

/**
 * Codes allowed by `EsigibilitaIVAType`; descriptions in `codeLists.EsigibilitaIVA`.
 *
 * - `D`: esigibilità differita
 * - `I`: esigibilità immediata
 * - `S`: scissione dei pagamenti
 */
export type EsigibilitaIVA = 'D' | 'I' | 'S';

/**
 * Codes allowed by `NaturaType`; descriptions in `codeLists.Natura`.
 *
 * - `N1`: Escluse ex. art. 15 del D.P.R. 633/1972
 * - `N2`: Non soggette
 * - `N2.1`: Non soggette ad IVA ai sensi degli artt. da 7 a 7-septies del DPR 633/72
 * - `N2.2`: Non soggette - altri casi
 * - `N3`: Non imponibili
 * - `N3.1`: Non Imponibili - esportazioni
 * - `N3.2`: Non Imponibili - cessioni intracomunitarie
 * - `N3.3`: Non Imponibili - cessioni verso San Marino
 * - `N3.4`: Non Imponibili - operazioni assimilate alle cessioni all'esportazione
 * - `N3.5`: Non Imponibili - a seguito di dichiarazioni d'intento
 * - `N3.6`: Non Imponibili - altre operazioni che non concorrono alla formazione del plafond
 * - `N4`: Esenti
 * - `N5`: Regime del margine/IVA non esposta in fattura
 * - `N6`: Inversione contabile (per le operazioni in reverse charge ovvero nei casi di
 *   autofatturazione per acquisti extra UE di servizi ovvero per importazioni di beni nei soli casi
 *   previsti)
 * - `N6.1`: Inversione contabile - cessione di rottami e altri materiali di recupero
 * - `N6.2`: Inversione contabile - cessione di oro e argento ai sensi della legge 7/2000 nonché di
 *   oreficeria usata ad OPO
 * - `N6.3`: Inversione contabile - subappalto nel settore edile
 * - `N6.4`: Inversione contabile - cessione di fabbricati
 * - `N6.5`: Inversione contabile - cessione di telefoni cellulari
 * - `N6.6`: Inversione contabile - cessione di prodotti elettronici
 * - `N6.7`: Inversione contabile - prestazioni comparto edile e settori connessi
 * - `N6.8`: Inversione contabile - operazioni settore energetico
 * - `N6.9`: Inversione contabile - altri casi
 * - `N7`: IVA assolta in altro stato UE (prestazione di servizi di telecomunicazioni,
 *   tele-radiodiffusione ed elettronici ex art. 7-octies lett. a, b, art. 74-sexies DPR 633/72)
 */
export type Natura =
  | 'N1'
  | 'N2'
  | 'N2.1'
  | 'N2.2'
  | 'N3'
  | 'N3.1'
  | 'N3.2'
  | 'N3.3'
  | 'N3.4'
  | 'N3.5'
  | 'N3.6'
  | 'N4'
  | 'N5'
  | 'N6'
  | 'N6.1'
  | 'N6.2'
  | 'N6.3'
  | 'N6.4'
  | 'N6.5'
  | 'N6.6'
  | 'N6.7'
  | 'N6.8'
  | 'N6.9'
  | 'N7';

/**
 * Codes allowed by `SocioUnicoType`; descriptions in `codeLists.SocioUnico`.
 *
 * - `SU`: socio unico
 * - `SM`: più soci
 */
export type SocioUnico = 'SU' | 'SM';

/**
 * Codes allowed by `StatoLiquidazioneType`; descriptions in `codeLists.StatoLiquidazione`.
 *
 * - `LS`: in liquidazione
 * - `LN`: non in liquidazione
 */
export type StatoLiquidazione = 'LS' | 'LN';

/**
 * Codes allowed by `TipoCessionePrestazioneType`; descriptions in
 * `codeLists.TipoCessionePrestazione`.
 *
 * - `SC`: Sconto
 * - `PR`: Premio
 * - `AB`: Abbuono
 * - `AC`: Spesa accessoria
 */
export type TipoCessionePrestazione = 'SC' | 'PR' | 'AB' | 'AC';

/**
 * Codes allowed by `BolloVirtualeType`; descriptions in `codeLists.BolloVirtuale`.
 *
 * - `SI`
 */
export type BolloVirtuale = 'SI';
