---
'fattura-elettronica-ts': minor
---

`createInvoice` calcola anche il contributo della cassa previdenziale: per ogni
`DatiCassaPrevidenziale` senza `ImportoContributoCassa` lo calcola come `ImponibileCassa` ×
`AlCassa` / 100, arrotondato al centesimo, e lo somma al riepilogo della sua `AliquotaIVA` e
`Natura`, e quindi al totale. Vale per ogni cassa, anche più casse nella stessa fattura, e per la
rivalsa INPS della gestione separata, indicata come cassa `TC22`. `ImportoContributoCassa` diventa
facoltativo in `CreateInvoiceInput`; se lo scrivi tu, resta il tuo.

La base del contributo la indichi tu: se un blocco non ha né `ImponibileCassa` né
`ImportoContributoCassa`, `createInvoice` lancia `CreateInvoiceError`. Nuovo codice
`create.imponibileCassa`.
