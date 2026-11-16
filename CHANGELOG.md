# fattura-elettronica-ts

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
