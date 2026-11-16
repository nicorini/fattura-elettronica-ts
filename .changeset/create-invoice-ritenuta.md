---
'fattura-elettronica-ts': minor
---

`createInvoice` calcola anche la ritenuta d'acconto: con un solo `DatiRitenuta` di tipo RT01 o
RT02 senza `ImportoRitenuta`, lo calcola come `AliquotaRitenuta` / 100 × la somma dei
`PrezzoTotale` delle righe con `Ritenuta` `SI` e degli `ImportoContributoCassa` delle casse con
`Ritenuta` `SI`, arrotondato al centesimo. Quali righe e casse sono soggette lo dici tu con il
flag: per un professionista di solito i compensi e la rivalsa INPS (`TC22`), non il contributo
della cassa professionale né le spese anticipate (N1). La ritenuta non cambia i riepiloghi né
`ImportoTotaleDocumento`. `ImportoRitenuta` diventa facoltativo in `CreateInvoiceInput`; se lo
scrivi tu, resta il tuo, come serve per la base ridotta degli agenti.

Le ritenute RT03–RT06 e quelle di una fattura con più `DatiRitenuta` non si calcolano: se manca
l'importo, `createInvoice` lancia `CreateInvoiceError`. Nuovo codice `create.importoRitenuta`.
