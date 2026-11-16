---
'fattura-elettronica-ts': minor
---

`createInvoice` calcola anche l'importo da pagare: se il corpo ha un solo `DettaglioPagamento`
senza `ImportoPagamento`, lo calcola come `ImportoTotaleDocumento` meno ogni `ImportoRitenuta` e
meno l'`Imposta` dei riepiloghi con `EsigibilitaIVA` `S` (split payment: l'IVA resta in fattura e
nel totale, ma il cliente la versa all'Erario). `ImportoPagamento` diventa facoltativo in
`CreateInvoiceInput`; se lo scrivi tu, resta il tuo. `createInvoice` non aggiunge mai
`DatiPagamento`: se non lo metti, la fattura non lo ha.

Con più `DettaglioPagamento` (pagamento a rate, o più blocchi `DatiPagamento`) la divisione la
decidi tu: se ne manca uno, `createInvoice` lancia `CreateInvoiceError`. Nuovo codice
`create.importoPagamento`.
