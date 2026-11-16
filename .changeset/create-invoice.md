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
natura) e `EsigibilitaIVA` o `RiferimentoNormativo` viene completato con gli importi. Un
`DatiRiepilogo` creato dalla libreria scrive l'aliquota come lo schema, con due decimali (`22.00`),
anche se la riga ha `22`.

Se l'ingresso non permette i conti, `createInvoice` lancia `CreateInvoiceError`, con tutti i
problemi in `problems` (`code`, `path`, `message`). Nuovi codici, nel tipo `CreateInvoiceErrorCode`
e in `ProblemCode`: `create.number`, `create.scontoAmbiguo`, `create.importoTotaleDocumento`.
Quest'ultimo segnala un totale che `createInvoice` non calcola: con uno `ScontoMaggiorazione` del
documento, o con un `DatiRiepilogo` scritto da te senza importi che la libreria non può completare
(ripete aliquota e natura di un riepilogo precedente, o nessuna riga né cassa le ha).
