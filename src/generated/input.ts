// Generated from specs/fatturapa-1.2.3/Schema_VFPR12_v1.2.3.xsd by scripts/generate.
// Do not edit: change the generator and run `pnpm generate`.

import type * as Model from './model.js';

/** The simple types whose leaves also take a `number` in `CreateInvoiceInput`. */
export const inputDecimalTypes: readonly string[] = [
  'Amount2DecimalType',
  'Amount8DecimalType',
  'QuantitaType',
  'RateType',
];

/**
 * XML schema fatture destinate a PA e privati in forma ordinaria 1.2.3
 *
 * `FatturaElettronicaType` in the XSD.
 *
 * The input of `createInvoice`: the model of `build`, with the same names, where amounts, rates and
 * quantities may also be a `number` and the fields that `createInvoice` computes are optional.
 */
export interface CreateInvoiceInput {
  versione: Model.FormatoTrasmissione;
  SistemaEmittente?: string;
  FatturaElettronicaHeader: FatturaElettronicaHeaderInput;
  FatturaElettronicaBody: FatturaElettronicaBodyInput[];
  /**
   * XAdES signature (`ds:Signature`) as raw XML, kept exactly as read. Any change to the invoice
   * invalidates it.
   */
  Signature?: string;
}

/** `FatturaElettronicaHeaderType` in the XSD. */
export interface FatturaElettronicaHeaderInput {
  /** Blocco relativo ai dati di trasmissione della Fattura Elettronica */
  DatiTrasmissione: Model.DatiTrasmissione;
  /** Blocco relativo ai dati del Cedente / Prestatore */
  CedentePrestatore: CedentePrestatoreInput;
  /** Blocco relativo ai dati del Rappresentante Fiscale */
  RappresentanteFiscale?: Model.RappresentanteFiscale;
  /** Blocco relativo ai dati del Cessionario / Committente */
  CessionarioCommittente: Model.CessionarioCommittente;
  /**
   * Blocco relativo ai dati del Terzo Intermediario che emette fattura elettronica per conto del
   * Cedente/Prestatore
   */
  TerzoIntermediarioOSoggettoEmittente?: Model.TerzoIntermediarioSoggettoEmittente;
  SoggettoEmittente?: Model.SoggettoEmittente;
}

/** `FatturaElettronicaBodyType` in the XSD. */
export interface FatturaElettronicaBodyInput {
  /** Blocco relativo ai Dati Generali della Fattura Elettronica */
  DatiGenerali: DatiGeneraliInput;
  /** Blocco relativo ai dati di Beni Servizi della Fattura Elettronica */
  DatiBeniServizi: DatiBeniServiziInput;
  /**
   * Blocco relativo ai dati dei Veicoli della Fattura Elettronica (da indicare nei casi di cessioni
   * tra Paesi membri di mezzi di trasporto nuovi, in base all'art. 38, comma 4 del dl 331 del 1993)
   */
  DatiVeicoli?: Model.DatiVeicoli;
  /** Blocco relativo ai dati di Pagamento della Fattura Elettronica */
  DatiPagamento?: DatiPagamentoInput[];
  /** Blocco relativo ai dati di eventuali allegati */
  Allegati?: Model.Allegati[];
}

/**
 * Blocco relativo ai Dati Generali della Fattura Elettronica
 *
 * `DatiGeneraliType` in the XSD.
 */
export interface DatiGeneraliInput {
  DatiGeneraliDocumento: DatiGeneraliDocumentoInput;
  DatiOrdineAcquisto?: Model.DatiDocumentiCorrelati[];
  DatiContratto?: Model.DatiDocumentiCorrelati[];
  DatiConvenzione?: Model.DatiDocumentiCorrelati[];
  DatiRicezione?: Model.DatiDocumentiCorrelati[];
  DatiFattureCollegate?: Model.DatiDocumentiCorrelati[];
  DatiSAL?: Model.DatiSAL[];
  DatiDDT?: Model.DatiDDT[];
  DatiTrasporto?: Model.DatiTrasporto;
  FatturaPrincipale?: Model.FatturaPrincipale;
}

/** `DatiGeneraliDocumentoType` in the XSD. */
export interface DatiGeneraliDocumentoInput {
  TipoDocumento: Model.TipoDocumento;
  Divisa: string;
  Data: string;
  Numero: string;
  DatiRitenuta?: DatiRitenutaInput[];
  DatiBollo?: DatiBolloInput;
  DatiCassaPrevidenziale?: DatiCassaPrevidenzialeInput[];
  ScontoMaggiorazione?: ScontoMaggiorazioneInput[];
  /** Computed by `createInvoice` when missing. */
  ImportoTotaleDocumento?: string | number;
  Arrotondamento?: string | number;
  Causale?: string[];
  Art73?: Model.Art73;
}

/** `DatiRitenutaType` in the XSD. */
export interface DatiRitenutaInput {
  TipoRitenuta: Model.TipoRitenuta;
  ImportoRitenuta: string | number;
  AliquotaRitenuta: string | number;
  CausalePagamento: Model.CausalePagamento;
}

/** `DatiBolloType` in the XSD. */
export interface DatiBolloInput {
  BolloVirtuale: Model.BolloVirtuale;
  ImportoBollo?: string | number;
}

/** `DatiCassaPrevidenzialeType` in the XSD. */
export interface DatiCassaPrevidenzialeInput {
  TipoCassa: Model.TipoCassa;
  AlCassa: string | number;
  ImportoContributoCassa: string | number;
  ImponibileCassa?: string | number;
  AliquotaIVA: string | number;
  Ritenuta?: Model.Ritenuta;
  Natura?: Model.Natura;
  RiferimentoAmministrazione?: string;
}

/** `ScontoMaggiorazioneType` in the XSD. */
export interface ScontoMaggiorazioneInput {
  Tipo: Model.TipoScontoMaggiorazione;
  Percentuale?: string | number;
  Importo?: string | number;
}

/**
 * Blocco relativo ai dati del Cedente / Prestatore
 *
 * `CedentePrestatoreType` in the XSD.
 */
export interface CedentePrestatoreInput {
  DatiAnagrafici: Model.DatiAnagraficiCedente;
  Sede: Model.Indirizzo;
  StabileOrganizzazione?: Model.Indirizzo;
  IscrizioneREA?: IscrizioneREAInput;
  Contatti?: Model.Contatti;
  RiferimentoAmministrazione?: string;
}

/** `IscrizioneREAType` in the XSD. */
export interface IscrizioneREAInput {
  Ufficio: string;
  NumeroREA: string;
  CapitaleSociale?: string | number;
  SocioUnico?: Model.SocioUnico;
  StatoLiquidazione: Model.StatoLiquidazione;
}

/**
 * Blocco relativo ai dati di Beni Servizi della Fattura Elettronica
 *
 * `DatiBeniServiziType` in the XSD.
 */
export interface DatiBeniServiziInput {
  DettaglioLinee: DettaglioLineeInput[];
  /** Computed by `createInvoice` when missing. */
  DatiRiepilogo?: DatiRiepilogoInput[];
}

/**
 * Blocco relativo ai dati di Pagamento della Fattura Elettronica
 *
 * `DatiPagamentoType` in the XSD.
 */
export interface DatiPagamentoInput {
  CondizioniPagamento: Model.CondizioniPagamento;
  DettaglioPagamento: DettaglioPagamentoInput[];
}

/** `DettaglioPagamentoType` in the XSD. */
export interface DettaglioPagamentoInput {
  Beneficiario?: string;
  ModalitaPagamento: Model.ModalitaPagamento;
  DataRiferimentoTerminiPagamento?: string;
  GiorniTerminiPagamento?: string;
  DataScadenzaPagamento?: string;
  ImportoPagamento: string | number;
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
  ScontoPagamentoAnticipato?: string | number;
  DataLimitePagamentoAnticipato?: string;
  PenalitaPagamentiRitardati?: string | number;
  DataDecorrenzaPenale?: string;
  CodicePagamento?: string;
}

/** `DettaglioLineeType` in the XSD. */
export interface DettaglioLineeInput {
  NumeroLinea: string;
  TipoCessionePrestazione?: Model.TipoCessionePrestazione;
  CodiceArticolo?: Model.CodiceArticolo[];
  Descrizione: string;
  Quantita?: string | number;
  UnitaMisura?: string;
  DataInizioPeriodo?: string;
  DataFinePeriodo?: string;
  PrezzoUnitario: string | number;
  ScontoMaggiorazione?: ScontoMaggiorazioneInput[];
  /** Computed by `createInvoice` when missing. */
  PrezzoTotale?: string | number;
  AliquotaIVA: string | number;
  Ritenuta?: Model.Ritenuta;
  Natura?: Model.Natura;
  RiferimentoAmministrazione?: string;
  AltriDatiGestionali?: AltriDatiGestionaliInput[];
}

/** `AltriDatiGestionaliType` in the XSD. */
export interface AltriDatiGestionaliInput {
  TipoDato: string;
  RiferimentoTesto?: string;
  RiferimentoNumero?: string | number;
  RiferimentoData?: string;
}

/** `DatiRiepilogoType` in the XSD. */
export interface DatiRiepilogoInput {
  AliquotaIVA: string | number;
  Natura?: Model.Natura;
  SpeseAccessorie?: string | number;
  Arrotondamento?: string | number;
  /** Computed by `createInvoice` when missing. */
  ImponibileImporto?: string | number;
  /** Computed by `createInvoice` when missing. */
  Imposta?: string | number;
  EsigibilitaIVA?: Model.EsigibilitaIVA;
  RiferimentoNormativo?: string;
}
