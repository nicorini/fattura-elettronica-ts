---
'fattura-elettronica-ts': minor
---

Nuova funzione `createInvoice`: riceve la fattura con le sole righe e restituisce l'oggetto
completo, da passare a `build`. Calcola, quando mancano, il `PrezzoTotale` di ogni riga (sconti e
maggiorazioni a cascata, arrotondato al centesimo una volta sola), un `DatiRiepilogo` per ogni
aliquota e natura con `ImponibileImporto` e `Imposta`, e `ImportoTotaleDocumento`. L'ingresso,
tipo `CreateInvoiceInput`, è lo stesso modello di `build` con gli stessi nomi: gli importi, le
aliquote e le quantità possono essere anche `number`, e i campi che la libreria calcola sono
facoltativi. Ogni campo che scrivi resta identico; un `DatiRiepilogo` con la sola aliquota (o
natura) e `EsigibilitaIVA` o `RiferimentoNormativo` viene completato con gli importi.

Se l'ingresso non permette i conti, `createInvoice` lancia `CreateInvoiceError`, con tutti i
problemi in `problems` (`code`, `path`, `message`). Nuovi codici, nel tipo `CreateInvoiceErrorCode`
e in `ProblemCode`: `create.number`, `create.scontoAmbiguo`, `create.importoTotaleDocumento`.
