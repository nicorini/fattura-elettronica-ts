---
'fattura-elettronica-ts': patch
---

`validate` non dà più l'errore `sdi.00423` su un `PrezzoTotale` che si discosta di poco più di un
centesimo dal valore calcolato: il SdI reale ha accettato una riga con uno scarto di 0,012 €
(FatturaElettronica.NET#394). La tolleranza di 0,01 € ora si confronta con la differenza
arrotondata al centesimo: l'errore arriva da 0,015 €, e tra 0,01 € e 0,015 € c'è l'avviso
`sdi.00423.warn`, che suggerisce il valore arrotondato.
