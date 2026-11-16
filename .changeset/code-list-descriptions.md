---
'fattura-elettronica-ts': minor
---

`codeLists` ha ora la descrizione di tutti i codici. I due elenchi che nello schema XSD ne erano
privi la prendono da altri documenti ufficiali, con il testo integrale:

- `CausalePagamento`: dalle istruzioni della Certificazione Unica 2026 (aggiornamento del
  24/02/2026). `X` e `Y`, tolti dalla CU dal 2025, hanno il testo della CU 2024. `Z` ha il testo di
  `ZO`, il codice che rappresentava. Nella descrizione di `W` manca l'anno («nel 2025»), che cambia
  a ogni edizione.
- `BolloVirtuale`: `SI` ha il testo della Rappresentazione tabellare della fattura ordinaria.

Una nuova edizione della CU che cambia un testo arriverà come versione `minor`, e il changelog dirà
di quale edizione si tratta.
