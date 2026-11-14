# fattura-elettronica-ts

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
