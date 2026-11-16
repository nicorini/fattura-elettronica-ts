# fattura-elettronica-ts

## 0.3.0

### Modifiche minor

- 3ccda0b: `createInvoice` calcola anche il contributo della cassa previdenziale: per ogni
  `DatiCassaPrevidenziale` senza `ImportoContributoCassa` lo calcola come `ImponibileCassa` ×
  `AlCassa` / 100, arrotondato al centesimo, e lo somma al riepilogo della sua `AliquotaIVA` e
  `Natura`, e quindi al totale. Vale per ogni cassa, anche più casse nella stessa fattura, e per la
  rivalsa INPS della gestione separata, indicata come cassa `TC22`. `ImportoContributoCassa` diventa
  facoltativo in `CreateInvoiceInput`; se lo scrivi tu, resta il tuo.
  
  La base del contributo la indichi tu: se un blocco non ha né `ImponibileCassa` né
  `ImportoContributoCassa`, `createInvoice` lancia `CreateInvoiceError`. Nuovo codice
  `create.imponibileCassa`.
- 3ccda0b: `createInvoice` calcola anche l'importo da pagare: se il corpo ha un solo `DettaglioPagamento`
  senza `ImportoPagamento`, lo calcola come `ImportoTotaleDocumento` meno ogni `ImportoRitenuta` e
  meno l'`Imposta` dei riepiloghi con `EsigibilitaIVA` `S` (split payment: l'IVA resta in fattura e
  nel totale, ma il cliente la versa all'Erario). `ImportoPagamento` diventa facoltativo in
  `CreateInvoiceInput`; se lo scrivi tu, resta il tuo. `createInvoice` non aggiunge mai
  `DatiPagamento`: se non lo metti, la fattura non lo ha.
  
  Con più `DettaglioPagamento` (pagamento a rate, o più blocchi `DatiPagamento`) la divisione la
  decidi tu: se ne manca uno, `createInvoice` lancia `CreateInvoiceError`. Nuovo codice
  `create.importoPagamento`, che segnala anche l'unica rata che non si può calcolare perché un
  `DatiRiepilogo` in split payment scritto da te non ha l'`Imposta` e la libreria non può
  completarlo.
- 3ccda0b: `createInvoice` calcola anche la ritenuta d'acconto: con un solo `DatiRitenuta` di tipo RT01 o
  RT02 senza `ImportoRitenuta`, lo calcola come `AliquotaRitenuta` / 100 × la somma dei
  `PrezzoTotale` delle righe con `Ritenuta` `SI` e degli `ImportoContributoCassa` delle casse con
  `Ritenuta` `SI`, arrotondato al centesimo. Quali righe e casse sono soggette lo dici tu con il
  flag: per un professionista di solito i compensi e la rivalsa INPS (`TC22`), non il contributo
  della cassa professionale né le spese anticipate (N1). La ritenuta non cambia i riepiloghi né
  `ImportoTotaleDocumento`. `ImportoRitenuta` diventa facoltativo in `CreateInvoiceInput`; se lo
  scrivi tu, resta il tuo, come serve per la base ridotta degli agenti.
  
  Le ritenute RT03–RT06 e quelle di una fattura con più `DatiRitenuta` non si calcolano: se manca
  l'importo, `createInvoice` lancia `CreateInvoiceError`. Nuovo codice `create.importoRitenuta`.
- 3ccda0b: Nuova funzione `createInvoice`: riceve la fattura con le sole righe e restituisce l'oggetto
  completo, da passare a `build`. Calcola, quando mancano, il `PrezzoTotale` di ogni riga (sconti e
  maggiorazioni a cascata, arrotondato al centesimo una volta sola), un `DatiRiepilogo` per ogni
  aliquota e natura con `ImponibileImporto` e `Imposta`, e `ImportoTotaleDocumento`. L'ingresso,
  tipo `CreateInvoiceInput`, è lo stesso modello di `build` con gli stessi nomi: gli importi, le
  aliquote e le quantità possono essere anche `number`, e i campi che la libreria calcola sono
  facoltativi. Ogni campo che scrivi resta identico; un `DatiRiepilogo` con la sola aliquota (o
  natura) e `EsigibilitaIVA` o `RiferimentoNormativo` viene completato con gli importi. Un
  `DatiRiepilogo` creato dalla libreria scrive l'aliquota come lo schema, con due decimali (`22.00`),
  anche se la riga ha `22`.
  
  Se l'ingresso non permette i conti, `createInvoice` lancia `CreateInvoiceError`, con tutti i
  problemi in `problems` (`code`, `path`, `message`). Nuovi codici, nel tipo `CreateInvoiceErrorCode`
  e in `ProblemCode`: `create.number`, `create.scontoAmbiguo`, `create.importoTotaleDocumento`.
  Quest'ultimo segnala un totale che `createInvoice` non calcola: con uno `ScontoMaggiorazione` del
  documento, o con un `DatiRiepilogo` scritto da te senza importi che la libreria non può completare
  (ripete aliquota e natura di un riepilogo precedente, o nessuna riga né cassa le ha).
- 3ccda0b: `validate` avvisa quando una fattura sembra dovere il bollo e non lo dichiara. Nuovo codice
  `warn.bollo`: manca `BolloVirtuale` `SI` e la somma dei `PrezzoTotale` delle righe con natura
  N2.1, N2.2, N3.5, N3.6 o N4, tolte quelle con `AltriDatiGestionali/TipoDato` NB1, NB2 o NB3, supera
  77,47 € (77,47 esatti non avvisano). È il criterio con cui l'Agenzia delle Entrate integra il bollo
  d'ufficio e ne chiede il pagamento: non avvisa con `TipoDocumento` TD16–TD19 e TD28, con
  `RegimeFiscale` da RF05 a RF11 o con `CodiceDestinatario` `XXXXXXX`, e non guarda le righe N1 e
  N3.4, che per legge possono dovere il bollo anche se l'Agenzia non le segnala. In un lotto ogni
  fattura si giudica da sola.
- 3ccda0b: `validate` avvisa quando un importo che `createInvoice` saprebbe calcolare non torna con i conti,
  per chi scrive la fattura a mano o legge quelle ricevute. Sono avvisi: `build` scrive comunque la
  fattura, e ognuno ha `expected` (il valore calcolato), `actual` (quello in fattura) e `source`
  (la fonte della formula).
  
  - Nuovo codice `warn.importoContributoCassa`: `ImportoContributoCassa` diverso da
    `ImponibileCassa` × `AlCassa` / 100, arrotondato al centesimo; solo se c'è `ImponibileCassa`.
  - Nuovo codice `warn.importoRitenuta`: con un solo `DatiRitenuta` RT01 o RT02, `ImportoRitenuta`
    maggiore di `AliquotaRitenuta` % delle righe e delle casse con `Ritenuta` `SI`. Una ritenuta
    minore non avvisa: è il caso legittimo della base ridotta degli agenti.
  - Nuovo codice `warn.importoTotaleDocumento`: `ImportoTotaleDocumento` diverso dalla somma di
    imponibili e imposte dei riepiloghi più l'`Arrotondamento`; non si controlla se il documento ha
    uno `ScontoMaggiorazione`.
  - Nuovo codice `warn.importoPagamento`: con un solo `DettaglioPagamento`, `ImportoPagamento`
    diverso dal totale meno ogni `ImportoRitenuta` e meno l'IVA in split payment (`EsigibilitaIVA`
    `S`).

## 0.2.1

### Modifiche patch

- 1bceabe: `validate` non dà più l'errore `sdi.00423` su un `PrezzoTotale` che si discosta di poco più di un
  centesimo dal valore calcolato: il SdI reale ha accettato una riga con uno scarto di 0,012 €
  (FatturaElettronica.NET#394). La tolleranza di 0,01 € ora si confronta con la differenza
  arrotondata al centesimo: l'errore arriva da 0,015 €, e tra 0,01 € e 0,015 € c'è l'avviso
  `sdi.00423.warn`, che suggerisce il valore arrotondato.

## 0.2.0

### Modifiche minor

- 472cc3e: `codeLists` ha ora la descrizione di tutti i codici. I due elenchi che nello schema XSD ne erano
  privi la prendono da altri documenti ufficiali, con il testo integrale:
  
  - `CausalePagamento`: dalle istruzioni della Certificazione Unica 2026 (aggiornamento del
    24/02/2026). `X` e `Y`, tolti dalla CU dal 2025, hanno il testo della CU 2024. `Z` ha il testo di
    `ZO`, il codice che rappresentava. Nella descrizione di `W` manca l'anno («nel 2025»), che cambia
    a ogni edizione.
  - `BolloVirtuale`: `SI` ha il testo della Rappresentazione tabellare della fattura ordinaria.
  
  Una nuova edizione della CU che cambia un testo arriverà come versione `minor`, e il changelog dirà
  di quale edizione si tratta.

### Modifiche patch

- 755bbbf: `validate` non giudica più con i controlli del SdI una `Natura` che lo schema XSD rifiuta (vuota o
  con un codice sconosciuto): resta il solo errore `xsd.enumeration`. Prima, ad esempio, una `Natura`
  vuota su un riepilogo al 22% dava anche `sdi.00430`, l'avviso `sdi.00444.warn` e l'avviso
  `warn.riferimentoNormativo`.

## 0.1.0

### Modifiche minor

- 1a9d270: Prima versione pubblica: legge, scrive e controlla la fattura elettronica FatturaPA, verso privati
  (FPR12) e verso la Pubblica Amministrazione (FPA12).
  
  - `parse`: dall'XML (testo o byte) all'oggetto tipizzato, con i tipi generati dallo schema XSD
    1.2.3. Legge anche i file delle versioni 1.2, 1.2.1 e 1.2.2.
  - `build`: dall'oggetto all'XML, dopo averlo validato; lancia `BuildError` se la fattura ha errori.
  - `validate`: tutti i problemi in una volta, senza eccezioni. Ogni problema ha codice, percorso,
    messaggio in italiano, gravità e fonte: lo schema XSD completo e i controlli del SdI fattibili
    con il solo file, con il codice ufficiale (Elenco controlli 2.0).
  - `codeLists` per i menu delle interfacce e `decimal` per convertire un `number` in importo.
  - Importi come stringhe e conti in aritmetica decimale. Solo ESM, tipi inclusi; Node ≥ 22, Bun e
    Deno.
