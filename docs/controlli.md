# Controlli di `validate`

`validate` (e `build`, che valida prima di scrivere) restituisce tutti i problemi di una fattura,
in ordine di documento. Ogni problema ha:

- `code` (tipo `ProblemCode`): il codice della libreria, stabile (elencati sotto);
- `sdiCode` (tipo `SdiCode`): il codice che darebbe il Sistema di Interscambio (SdI), dove
  esiste: `00200` per ogni problema di struttura, `00423` e simili per i suoi controlli;
- `path`: il campo, con i nomi dell'XSD e l'indice dei campi ripetibili da 0, per esempio
  `FatturaElettronicaBody[0].DatiBeniServizi.DettaglioLinee[1].PrezzoTotale`;
- `message`: la spiegazione in italiano (può cambiare tra una versione e l'altra);
- `severity`: `error` se il SdI scarterebbe la fattura, `warning` se la accetta ma qualcosa non
  torna;
- `source`: per i controlli del SdI, il documento dell'Agenzia delle Entrate e la pagina;
- `expected` e `actual`: per i controlli sugli importi, il valore calcolato e quello in fattura.

Una fattura è valida (`valid: true`) quando nessun problema è un `error`. La libreria non è mai
più severa dell'XSD o del SdI: dove le fonti ufficiali divergono o lasciano un dubbio, dà un avviso
e non un errore.

Nessun controllo locale garantisce che il SdI accetterà la fattura: alcuni controlli richiedono
dati che ha solo l'Agenzia (vedi [Controlli non verificabili in locale](#controlli-non-verificabili-in-locale)).

## Documenti di riferimento

| Abbreviazione              | Documento                                                                                                                                                                                                 |
| -------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Elenco controlli           | [Elenco dei controlli del SdI, versione 2.0](https://www.fatturapa.gov.it/export/documenti/fatturapa/v1.4/Elenco-Controlli-versione-2.0.pdf)                                                              |
| Allegato A                 | [Allegato A – Specifiche tecniche, versione 1.9.1](https://www.agenziaentrate.gov.it/portale/documents/d/guest/allegato-a-specifiche-tecniche-vers-1-9-1) (fatture tra privati, FPR12)                    |
| Specifiche SdI             | [Specifiche tecniche del Sistema di Interscambio, versione 1.8.4](https://www.fatturapa.gov.it/export/documenti/Specifiche-tecniche-relative-al-Sistema-di-Interscambio-versione-1.8.4.pdf)               |
| Formato                    | [Specifiche tecniche del formato FatturaPA, versione 1.4](https://www.fatturapa.gov.it/export/documenti/fatturapa/v1.4/Specifiche_tecniche_del_formato_FatturaPA_V1.4.pdf)                                |
| Rappresentazione tabellare | [Rappresentazione tabellare del tracciato fattura ordinaria](https://www.fatturapa.gov.it/export/documenti/fatturapa/v1.4/RappresentazioneTabellareFattOrdinaria-1.pdf), colonna "Controlli extra schema" |
| XSD                        | [Schema FatturaPA 1.2.3](https://www.fatturapa.gov.it/export/documenti/fatturapa/v1.4/Schema_VFPR12_v1.2.3.xsd)                                                                                           |

## Codici della libreria

### Il file non è una FatturaPA

Gli stessi codici di `ParseError`, l'eccezione di `parse`. `validate` non lancia: li restituisce
come problema sul percorso vuoto, senza `sdiCode`.

| Codice             | Gravità | Cosa segnala                                                                                  |
| ------------------ | ------- | --------------------------------------------------------------------------------------------- |
| `xml.malformed`    | errore  | XML non ben formato (con riga e colonna nel messaggio), o vuoto                               |
| `xml.notFatturaPA` | errore  | elemento radice o namespace sbagliati, o attributo `versione` assente o sconosciuto           |
| `xml.encoding`     | errore  | codifica non supportata (sono supportate UTF-8, ISO-8859-1 e windows-1252), o byte non validi |
| `xml.doctype`      | errore  | il file ha un `DOCTYPE`, rifiutato per sicurezza (attacchi XXE e "billion laughs")            |

### Ingresso di `createInvoice`

Gli stessi codici di `CreateInvoiceError`, l'eccezione di `createInvoice` (tipo
`CreateInvoiceErrorCode`): `validate` non li dà mai. Ogni problema ha `code`, `path` e `message`;
l'eccezione li raccoglie tutti.

| Codice                          | Cosa segnala                                                                                                                                                                                   |
| ------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `create.number`                 | un importo, un'aliquota o una quantità è un `number` che `decimal(n)` rifiuta (non finito, con l'esponente, più di 15 cifre significative), o una stringa che non è un numero decimale         |
| `create.scontoAmbiguo`          | uno `ScontoMaggiorazione` di una riga senza `PrezzoTotale` ha sia `Importo` sia `Percentuale`, o un `Importo` negativo: la direzione la dà `Tipo`                                              |
| `create.imponibileCassa`        | un `DatiCassaPrevidenziale` non ha né `ImponibileCassa` né `ImportoContributoCassa`: la base del contributo la indica l'utente, perché il formato non lega righe e cassa                       |
| `create.importoTotaleDocumento` | il documento ha uno `ScontoMaggiorazione` e manca `ImportoTotaleDocumento`: in quel caso `createInvoice` non lo calcola, perché il formato non dice se lo sconto si applica prima o dopo l'IVA |

### Struttura (XSD)

Il file non rispetta lo schema XSD 1.2.3: il SdI lo scarta con il codice 00200, che è il `sdiCode`
di tutti questi problemi.

| Codice            | Gravità | Cosa segnala                                                                                                                                                                                         |
| ----------------- | ------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `input.type`      | errore  | nell'oggetto, un valore di tipo sbagliato (per esempio un `number` dove il modello vuole una stringa, un oggetto dove vuole un array, un array su un campo non ripetibile): non viene mai convertito |
| `xsd.required`    | errore  | manca un campo obbligatorio                                                                                                                                                                          |
| `xsd.unexpected`  | errore  | un elemento, attributo o testo che lo schema non prevede in quel punto (nell'oggetto: una proprietà che il modello non ha)                                                                           |
| `xsd.order`       | errore  | nell'XML, un elemento fuori dall'ordine dello schema                                                                                                                                                 |
| `xsd.namespace`   | errore  | nell'XML, un elemento nel namespace sbagliato (per esempio per un `xmlns` di default sulla radice)                                                                                                   |
| `xsd.maxOccurs`   | errore  | un campo ripetuto più volte di quante lo schema ne ammette                                                                                                                                           |
| `xsd.choice`      | errore  | nessuna o più di una delle alternative di una scelta (per esempio `Denominazione` insieme a `Nome` e `Cognome`)                                                                                      |
| `xsd.enumeration` | errore  | un codice che non è nell'elenco dello schema (`TipoDocumento`, `Natura`…)                                                                                                                            |
| `xsd.pattern`     | errore  | un valore di forma sbagliata: importo con troppi decimali, data inesistente, carattere non ammesso, `xsi:schemaLocation` con un numero dispari di URI                                                |
| `xsd.length`      | errore  | un valore troppo corto o troppo lungo                                                                                                                                                                |
| `xsd.range`       | errore  | un numero o una data fuori dai limiti (aliquota oltre 100, `NumeroLinea` fuori da 1–9999, data prima del 1970)                                                                                       |

### Controlli del SdI

Il codice è `sdi.` seguito dal codice ufficiale, che è anche il `sdiCode`. Dove una sola fonte
dell'Agenzia rende un controllo più severo, o dove le fonti non dicono come il SdI si comporta, la
parte certa è un errore e il resto un avviso con il codice `sdi.<codice>.warn`, senza `sdiCode`. L'elenco completo, con le fonti, è nella sezione
[Controlli del SdI implementati](#controlli-del-sdi-implementati).

### Avvisi della libreria

Il SdI accetta la fattura, ma qualcosa non torna. Nessuno ha `sdiCode`.

| Codice                         | Cosa segnala                                                                                                                                                                                                   | Fonte                            |
| ------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------- |
| `warn.tolerance`               | un importo diverso da quello calcolato, ma entro la tolleranza del SdI (00421, 00422, 00423); un importo uguale al calcolato arrotondato al centesimo non dà l'avviso, e `expected` è il calcolato arrotondato | Elenco controlli, pp. 24–26      |
| `warn.riferimentoNormativo`    | un `DatiRiepilogo` con `Natura` e senza `RiferimentoNormativo`, che le specifiche del formato chiedono ma il SdI non controlla                                                                                 | Formato, p. 27                   |
| `warn.partitaIva`              | partita IVA (`IdFiscaleIVA/IdCodice` con `IdPaese` IT) di forma o cifra di controllo sbagliata per un soggetto che il SdI non controlla: terzo intermediario, vettore                                          | DM Finanze 23/12/1976, artt. 6–9 |
| `warn.codiceFiscale`           | codice fiscale di forma o carattere di controllo sbagliato per un soggetto che il SdI non controlla: terzo intermediario, vettore, `CFQuietanzante`                                                            | DM Finanze 23/12/1976, artt. 6–9 |
| `warn.idTrasmittenteMinuscolo` | `IdTrasmittente/IdCodice` è un codice fiscale valido ma scritto in minuscolo                                                                                                                                   | Elenco controlli, p. 7 (00300)   |
| `warn.pecDestinatario`         | `PECDestinatario` con `CodiceDestinatario` diverso da `0000000`, o in una fattura alla PA                                                                                                                      | Formato, p. 10                   |

### Errori della libreria

Nessuno ha `sdiCode`: non vengono dal SdI, ma impediscono a `build` di scrivere la fattura.

| Codice          | Cosa segnala                                                                                                                                      |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| `option.today`  | l'opzione `today` non è una data `AAAA-MM-GG` del calendario: il controllo 00403 non viene fatto. Sul percorso vuoto                              |
| `internal.rule` | un controllo si è interrotto per un difetto della libreria: la fattura non è stata controllata del tutto. Sul percorso vuoto; va aperta una issue |

## Controlli del SdI implementati

Tutti i controlli dell'Elenco controlli che si possono fare con il solo file. "Entrambi" vale per
FPR12 (verso privati) e FPA12 (verso la PA); il formato si legge da `FormatoTrasmissione`.

### Soggetti e trasmissione

| Codice           | Controllo                                                                                                            | Formati  | Fonte                                 |
| ---------------- | -------------------------------------------------------------------------------------------------------------------- | -------- | ------------------------------------- |
| `sdi.00300`      | `IdTrasmittente/IdCodice` italiano non è né una partita IVA né un codice fiscale validi (forma e cifra di controllo) | entrambi | Elenco controlli, p. 7; DM 23/12/1976 |
| `sdi.00301`      | partita IVA del cedente non valida (11 cifre e cifra di controllo)                                                   | entrambi | Elenco controlli, p. 7; DM 23/12/1976 |
| `sdi.00302`      | codice fiscale del cedente non valido                                                                                | entrambi | Elenco controlli, p. 7; DM 23/12/1976 |
| `sdi.00303`      | partita IVA del rappresentante fiscale (del cedente o del cessionario) non valida                                    | entrambi | Elenco controlli, p. 8; DM 23/12/1976 |
| `sdi.00304`      | codice fiscale del rappresentante fiscale non valido                                                                 | entrambi | Elenco controlli, p. 8; DM 23/12/1976 |
| `sdi.00305`      | partita IVA del cessionario non valida                                                                               | entrambi | Elenco controlli, p. 8; DM 23/12/1976 |
| `sdi.00306`      | codice fiscale del cessionario non valido, se il cessionario non ha `IdFiscaleIVA`                                   | entrambi | Elenco controlli, p. 8; DM 23/12/1976 |
| `sdi.00306.warn` | lo stesso con `IdFiscaleIVA` presente: il SdI non fa 00306, ma controlla la coerenza con la partita IVA (00324)      | entrambi | Allegato A, p. 121; DM 23/12/1976     |
| `sdi.00313`      | `CodiceDestinatario` `XXXXXXX` a un cessionario senza identificativo IVA estero                                      | FPR12    | Allegato A, p. 31                     |
| `sdi.00330`      | `PECDestinatario` è una casella del SdI (`sdi<numero>@pec.fatturapa.it`)                                             | FPR12    | Allegato A, p. 32                     |
| `sdi.00330.warn` | `PECDestinatario` è un altro indirizzo del dominio `pec.fatturapa.it`                                                | FPR12    | Allegato A, p. 32                     |
| `sdi.00417`      | il cessionario non ha né `IdFiscaleIVA` né `CodiceFiscale`                                                           | entrambi | Elenco controlli, p. 20               |
| `sdi.00427`      | `CodiceDestinatario` di lunghezza sbagliata per il formato: 6 caratteri per FPA12, 7 per FPR12                       | entrambi | Elenco controlli, p. 33               |
| `sdi.00428`      | `FormatoTrasmissione` diverso dall'attributo `versione`                                                              | entrambi | Elenco controlli, p. 34               |
| `sdi.00476`      | cedente e cessionario entrambi con `IdFiscaleIVA` estero                                                             | entrambi | Elenco controlli, p. 45               |

Le partite IVA si controllano solo con `IdPaese` IT. Del codice fiscale si controllano forma
(16 caratteri, anche con omocodia, oppure 11 cifre) e carattere di controllo; non si controllano
data, comune e coerenza col nome, che i codici fiscali provvisori violano di proposito.

### Documento

| Codice           | Controllo                                                                                                                                                                              | Formati  | Fonte                   |
| ---------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- | ----------------------- |
| `sdi.00403`      | `Data` del documento successiva a oggi (in Italia, fuso `Europe/Rome`), o all'opzione `today`                                                                                          | entrambi | Elenco controlli, p. 11 |
| `sdi.00409`      | due fatture dello stesso lotto con lo stesso numero nello stesso anno (o nella stessa data, se entrambe hanno `Art73` SI); una nota di credito TD04 può avere il numero di una fattura | entrambi | Elenco controlli, p. 15 |
| `sdi.00418`      | una nota di credito (TD04) con data precedente a quella di una fattura collegata (`DatiFattureCollegate`)                                                                              | entrambi | Elenco controlli, p. 21 |
| `sdi.00418.warn` | lo stesso per gli altri tipi di documento, che solo l'Allegato A controlla                                                                                                             | entrambi | Allegato A, p. 46       |
| `sdi.00425`      | `Numero` del documento senza alcuna cifra                                                                                                                                              | entrambi | Elenco controlli, p. 32 |
| `sdi.00471`      | cedente e cessionario uguali in TD16, TD17, TD18, TD19, TD20, TD29                                                                                                                     | entrambi | Elenco controlli, p. 40 |
| `sdi.00471.warn` | cedente e cessionario uguali in TD01, TD02, TD03, TD06, TD24, TD25, TD28, che solo l'Allegato A controlla                                                                              | entrambi | Allegato A, p. 119      |
| `sdi.00472`      | cedente e cessionario diversi in TD21                                                                                                                                                  | entrambi | Elenco controlli, p. 41 |
| `sdi.00472.warn` | cedente e cessionario diversi in TD27, che solo l'Allegato A controlla                                                                                                                 | entrambi | Allegato A, p. 119      |
| `sdi.00473`      | TD17, TD18, TD19, TD28 con cedente italiano (`IdPaese` IT), o TD29 con cedente estero                                                                                                  | entrambi | Elenco controlli, p. 42 |
| `sdi.00473.warn` | TD18 o TD28 con cedente di Livigno o Campione d'Italia (`IdPaese` OO), che l'Allegato A ammette solo per TD17 e TD19                                                                   | entrambi | Allegato A, p. 119      |
| `sdi.00474`      | TD21 con una linea ad aliquota zero                                                                                                                                                    | entrambi | Elenco controlli, p. 43 |
| `sdi.00475`      | TD16, TD17, TD18, TD19, TD20, TD22, TD23, TD28, TD29 senza `IdFiscaleIVA` del cessionario                                                                                              | entrambi | Elenco controlli, p. 44 |

00471 e 00472 si giudicano solo quando cedente e cessionario hanno entrambi `IdFiscaleIVA`: con il
solo codice fiscale del cessionario il SdI cerca la partita IVA nell'Anagrafe tributaria.

### Importi, aliquote e nature

| Codice           | Controllo                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              | Formati  | Fonte                                      |
| ---------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- | ------------------------------------------ |
| `sdi.00400`      | linea ad aliquota zero senza `Natura`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  | entrambi | Elenco controlli, p. 10                    |
| `sdi.00401`      | linea con aliquota diversa da zero e `Natura` (salvo TD16)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             | entrambi | Elenco controlli, p. 10                    |
| `sdi.00411`      | linea con `Ritenuta` SI senza `DatiRitenuta`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           | entrambi | Elenco controlli, p. 17                    |
| `sdi.00413`      | cassa previdenziale ad aliquota zero senza `Natura`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    | entrambi | Elenco controlli, p. 18                    |
| `sdi.00414`      | cassa previdenziale con aliquota diversa da zero e `Natura`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            | entrambi | Elenco controlli, p. 18                    |
| `sdi.00415`      | cassa previdenziale con `Ritenuta` SI senza `DatiRitenuta`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             | entrambi | Elenco controlli, p. 19                    |
| `sdi.00419`      | meno `DatiRiepilogo` delle aliquote distinte di linee e cassa                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          | entrambi | Elenco controlli, p. 22                    |
| `sdi.00420`      | `DatiRiepilogo` con `EsigibilitaIVA` S (scissione dei pagamenti) e `Natura` N6.x (inversione contabile)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                | entrambi | Elenco controlli, p. 23                    |
| `sdi.00421`      | `Imposta` diversa da `ImponibileImporto` × `AliquotaIVA` / 100, arrotondata al centesimo; tolleranza 0,01 €                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            | entrambi | Elenco controlli, p. 24                    |
| `sdi.00422`      | `ImponibileImporto` di un'aliquota diverso dalla somma di `PrezzoTotale`, contributi di cassa e `Arrotondamento`, anche quando l'aliquota di linee o cassa non ha alcun `DatiRiepilogo` (somma zero); tolleranza 1 €                                                                                                                                                                                                                                                                                                                                                                                                                   | entrambi | Elenco controlli, p. 25                    |
| `sdi.00423`      | `PrezzoTotale` diverso da `PrezzoUnitario`, con sconti e maggiorazioni applicati in ordine, per `Quantita` (1 se manca); tolleranza 0,01 € sulla differenza arrotondata al centesimo, quindi errore da 0,015 €                                                                                                                                                                                                                                                                                                                                                                                                                         | entrambi | Elenco controlli, p. 26                    |
| `sdi.00423.warn` | `PrezzoTotale` torna con alcune letture di `ScontoMaggiorazione` e non con altre: un `Importo` negativo col segno o in valore assoluto, l'`Importo` o la `Percentuale` dello stesso blocco quando non sono coerenti. Le specifiche non dicono quale lettura usi il SdI (con nessuna è `sdi.00423`). Se l'`Importo`, in valore assoluto, è la `Percentuale` del prezzo arrotondata al centesimo, conta solo l'`Importo`, come nel Caso 3 dell'Elenco controlli (p. 30). Anche una differenza sopra 0,01 € che arrotondata al centesimo vale 0,01 €: le specifiche la scartano, il SdI reale l'ha accettata (FatturaElettronica.NET#394) | entrambi | Elenco controlli, p. 27; Allegato A, p. 51 |
| `sdi.00424`      | aliquota scritta come frazione (`0.22` invece di `22.00`)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              | entrambi | Elenco controlli, p. 31                    |
| `sdi.00429`      | `DatiRiepilogo` ad aliquota zero senza `Natura`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        | entrambi | Elenco controlli, p. 35                    |
| `sdi.00430`      | `DatiRiepilogo` con aliquota diversa da zero e `Natura` (salvo TD16)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   | entrambi | Elenco controlli, p. 35                    |
| `sdi.00437`      | sconto o maggiorazione del documento senza `Percentuale` né `Importo`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  | entrambi | Elenco controlli, p. 36                    |
| `sdi.00438`      | sconto o maggiorazione di una linea senza `Percentuale` né `Importo`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   | entrambi | Elenco controlli, p. 36                    |
| `sdi.00443`      | un'aliquota di linee o cassa senza il suo `DatiRiepilogo`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              | entrambi | Elenco controlli, p. 37                    |
| `sdi.00444`      | una `Natura` di linee o cassa senza il suo `DatiRiepilogo`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             | entrambi | Elenco controlli, p. 38                    |
| `sdi.00443.warn` | un `DatiRiepilogo` con un'aliquota che nessuna linea e nessuna cassa ha                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                | entrambi | Rappresentazione tabellare, p. 7           |
| `sdi.00444.warn` | un `DatiRiepilogo` con una `Natura` che nessuna linea e nessuna cassa ha                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               | entrambi | Rappresentazione tabellare, p. 7           |
| `sdi.00445`      | `Natura` generica N2, N3 o N6, non più ammessa dal 1° gennaio 2021 (servono N2.1, N2.2, N3.1…)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         | entrambi | Elenco controlli, p. 39                    |

Le tolleranze seguono la fonte meno severa: una differenza pari alla tolleranza passa, con
l'avviso `warn.tolerance`. Gli importi si calcolano in decimale esatto, arrotondando al centesimo
"half-up" sul valore assoluto. L'errore si giudica sul valore esatto; l'avviso non c'è se
l'importo è il valore esatto arrotondato al centesimo.

## Controlli non verificabili in locale

Questi controlli del SdI richiedono dati che ha solo l'Agenzia delle Entrate, o informazioni che
non stanno nel file XML. `validate` non li fa.

| Codice       | Controllo                                                                                    | Perché non si può fare in locale                                                                                        |
| ------------ | -------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| 00001        | nome del file non valido                                                                     | il nome del file non è nell'XML                                                                                         |
| 00002        | nome del file già inviato                                                                    | serve lo storico degli invii al SdI                                                                                     |
| 00003        | file troppo grande                                                                           | dipende dal canale di trasmissione                                                                                      |
| 00100–00107  | firma digitale e busta (certificato, revoca, autorità, riferimento temporale, file corrotto) | servono gli elenchi delle autorità di certificazione; la verifica legale della firma è fuori dagli scopi della libreria |
| 00201        | più di 50 errori di formato                                                                  | è solo il limite del SdI: la libreria li elenca tutti                                                                   |
| 00300–00306  | partita IVA o codice fiscale inesistenti                                                     | serve l'Anagrafe tributaria; in locale si controllano solo forma e cifra di controllo (sopra)                           |
| 00311, 00312 | `CodiceDestinatario` inesistente o non attivo                                                | servono l'Indice PA e il registro dei codici dei destinatari                                                            |
| 00320–00327  | coerenza tra partita IVA e codice fiscale, gruppi IVA, partita IVA cessata                   | serve l'Anagrafe tributaria                                                                                             |
| 00398, 00399 | ufficio "Centrale" della PA; fattura FPR12 a un ente presente nell'Indice PA                 | serve l'Indice PA                                                                                                       |
| 00404        | fattura duplicata                                                                            | serve lo storico delle fatture accettate dal SdI                                                                        |
| 00477        | dichiarazione d'intento invalidata                                                           | serve la banca dati delle dichiarazioni d'intento                                                                       |

00460 riguarda la fattura semplificata (FSM10), che la libreria non tratta.

Le regole della PA che non sono controlli del SdI, come CIG e CUP, non si controllano: le verifica
l'amministrazione che riceve la fattura, e non sono sempre obbligatorie.

## Fatture di versioni precedenti

`parse` legge anche i file conformi alle versioni precedenti dello schema (1.2, 1.2.1, 1.2.2).
`validate` e `build` giudicano sempre con le regole in vigore oggi, anche una fattura vecchia: per
esempio il regime fiscale `RF03`, presente solo nello schema 1.2, è un errore `xsd.enumeration`, e
la `Natura` generica `N2` è un errore `sdi.00445`. Una fattura accettata dal SdI anni fa può quindi
avere problemi oggi.
