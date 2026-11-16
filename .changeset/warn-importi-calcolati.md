---
'fattura-elettronica-ts': minor
---

`validate` avvisa quando un importo che `createInvoice` saprebbe calcolare non torna con i conti,
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
