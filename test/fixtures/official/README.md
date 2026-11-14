# Esempi ufficiali

Copie esatte degli esempi pubblicati su
<https://www.fatturapa.gov.it/it/norme-e-regole/documentazione-fattura-elettronica/formato-fatturapa/>
(cartella `export/documenti/fatturapa/v1.2/`), scaricate il 2026-11-13.

Servono per la struttura e per l'andata e ritorno (`parse` poi `build` restituisce lo stesso
contenuto), non come prova che i conti siano giusti.

**Nessuno è una fattura che il SdI accetterebbe.** Gli identificativi sono di prova, con la cifra
di controllo sbagliata: partita IVA `01234567890` di trasmittente e cedente (la cifra giusta è 7),
codice fiscale `09876543210` del cessionario (anche qui 7), partita IVA `24681012141` del vettore
(la cifra giusta è 2). `validate` dà quindi sempre gli errori `sdi.00300`, `sdi.00301` e
`sdi.00306`, e l'avviso `warn.partitaIva`; i test che li scrivono con `build` usano
`{ validate: false }`. "Valido per l'XSD" nella tabella riguarda solo la struttura.

| File                      | Formato | Valido per l'XSD 1.2.3 | Note                                                   |
| ------------------------- | ------- | ---------------------- | ------------------------------------------------------ |
| `IT01234567890_FPA01.xml` | FPA12   | sì                     |                                                        |
| `IT01234567890_FPA02.xml` | FPA12   | sì                     | fine riga LF; gli altri hanno CRLF                     |
| `IT01234567890_FPA03.xml` | FPA12   | sì                     |                                                        |
| `IT01234567890_FPR01.xml` | FPR12   | sì                     |                                                        |
| `IT01234567890_FPR02.xml` | FPR12   | **no**                 | vedi sotto                                             |
| `IT01234567890_FPR03.xml` | FPR12   | sì                     | conti della prima fattura fuori tolleranza, come FPR02 |

## Anomalie di FPR02

- **Ordine dei campi**: `ContattiTrasmittente` sta dopo `PECDestinatario`, ma l'XSD lo vuole
  prima. `xmllint` lo rifiuta alla riga 16: "Element 'ContattiTrasmittente': This element is not
  expected".
- **Conti**: righe da 5.00 e 20.00 al 22%, ma `ImponibileImporto` 27.00 e `Imposta` 5.95, senza
  cassa né arrotondamenti. La differenza di 2 € supera la tolleranza di 1 € del controllo 00422
  del SdI (Allegato A alle Specifiche tecniche 1.9.1).
