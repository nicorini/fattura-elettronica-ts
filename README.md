# fattura-elettronica-ts

[![npm](https://img.shields.io/npm/v/fattura-elettronica-ts)](https://www.npmjs.com/package/fattura-elettronica-ts)
[![CI](https://github.com/nicorini/fattura-elettronica-ts/actions/workflows/ci.yml/badge.svg)](https://github.com/nicorini/fattura-elettronica-ts/actions/workflows/ci.yml)
[![Licenza MIT](https://img.shields.io/npm/l/fattura-elettronica-ts)](#licenza)

Libreria TypeScript che legge, scrive e controlla la fattura elettronica italiana (FatturaPA),
verso privati e verso la Pubblica Amministrazione. È pensata per chi deve integrarla in un
gestionale o in un servizio: trova gli errori prima che la fattura arrivi al Sistema di
Interscambio (SdI).

- **Modello 1:1 con l'XSD.** I tipi sono generati dallo schema ufficiale 1.2.3: stessi nomi
  (`CedentePrestatore`, `DatiRiepilogo`), stessa struttura, i codici (`TipoDocumento`, `Natura`…)
  limitati ai valori ammessi. Chi conosce il tracciato lo ritrova com'è, e l'editor completa il
  resto.
- **Importi come stringhe.** `"5.00"` resta `"5.00"`: nessun `number` in virgola mobile tra il
  file e il tuo codice. I conti dei controlli usano l'aritmetica decimale.
- **Controlli con i codici del SdI.** Lo schema XSD completo e i controlli del SdI fattibili con
  il solo file, ognuno con il codice ufficiale (`00423`…), il campo, un messaggio in italiano e il
  documento dell'Agenzia delle Entrate da cui viene. Mai più severi del SdI: nel dubbio, un avviso.
- **JavaScript standard.** Solo ESM, tipi inclusi, due dipendenze in JavaScript puro e nessuna
  nativa, meno di 30 kB minificata e compressa. Gira su Node ≥ 22, Bun, Deno, nel browser e su
  workerd (vedi [Runtime](#runtime)).

**Stato: 0.x.** La 0.1 è la prima versione pubblicata. Fino alla 1.0 l'API può cambiare da una
minor all'altra (da 0.1 a 0.2), mai in una patch: con il `^0.1.0` che npm scrive di default ricevi
solo le patch. Ogni cambiamento è nel [changelog](CHANGELOG.md).

_English: a TypeScript library to read, write and validate Italian e-invoices (FatturaPA). Typed
model generated 1:1 from the official XSD, amounts as strings, validation with the official codes
of the exchange system (SdI). ESM only, no native dependencies; tested on Node ≥ 22, Bun, Deno,
headless Chromium and workerd. The documentation is in Italian._

## Installazione

```sh
npm install fattura-elettronica-ts
```

Oppure `pnpm add`, `yarn add`, `bun add`; con Deno, `import … from 'npm:fattura-elettronica-ts'`.

## In breve

```ts
import { readFile } from 'node:fs/promises';
import { validate } from 'fattura-elettronica-ts';

const { valid, problems } = validate(await readFile('fattura.xml'));

console.log(valid ? 'Nessun errore nei controlli locali' : 'Il SdI la scarterebbe');
for (const problem of problems) {
  // Per esempio:
  // error sdi.00301 FatturaElettronicaHeader.CedentePrestatore.DatiAnagrafici.IdFiscaleIVA.IdCodice
  //   La partita IVA 01234567890 non è valida: la cifra di controllo non è quella attesa.
  console.log(problem.severity, problem.code, problem.path);
  console.log(`  ${problem.message}`);
}
```

`validate` accetta il testo o i byte del file, oppure l'oggetto del modello, e non lancia mai
eccezioni. La fattura è valida quando nessun problema è un `error`; un `warning` segnala qualcosa
di strano che il SdI accetta. Nessun controllo locale garantisce che il SdI accetti la fattura:
alcuni richiedono dati che ha solo l'Agenzia (vedi [Cosa non fa](#cosa-non-fa)).

Gli esempi di fattura pubblicati dall'Agenzia delle Entrate hanno partite IVA e codici fiscali di
prova, con la cifra di controllo sbagliata (come `01234567890` sopra): vanno bene per provare
`parse`, non come modello di fattura accettata.

## Esempi

### Leggere una fattura ricevuta

```ts
import { readFile } from 'node:fs/promises';
import { parse } from 'fattura-elettronica-ts';

const fattura = parse(await readFile('fattura.xml'));

const fornitore = fattura.FatturaElettronicaHeader.CedentePrestatore.DatiAnagrafici;
console.log(fornitore.IdFiscaleIVA?.IdCodice, fornitore.Anagrafica.Denominazione);

// Un file può contenere più fatture (un lotto): una per FatturaElettronicaBody.
for (const body of fattura.FatturaElettronicaBody) {
  const { TipoDocumento, Numero, Data, ImportoTotaleDocumento } =
    body.DatiGenerali.DatiGeneraliDocumento;
  console.log(TipoDocumento, Numero, Data, ImportoTotaleDocumento);
  for (const linea of body.DatiBeniServizi.DettaglioLinee) {
    console.log(linea.Descrizione, linea.PrezzoTotale);
  }
}
```

`parse` legge file in UTF-8, windows-1252 e ISO-8859-1, con qualunque prefisso sulla radice, e
rifiuta i `DOCTYPE` (protezione dagli attacchi XXE). Ogni valore è la stringa esatta del file;
scarta solo ciò che il modello non prevede: elementi sconosciuti, commenti e istruzioni di
elaborazione. Lancia `ParseError` (con un `code` stabile) solo se il file non è una FatturaPA:
XML malformato, radice sbagliata… Non valida: per sapere se la fattura è corretta serve
`validate`.

Nel browser, passa i byte del file scelto dall'utente:
`parse(new Uint8Array(await file.arrayBuffer()))`.

### Creare una fattura

Gli importi sono stringhe, come nel file: un `number` di JavaScript non conserva i decimali
(`0.1 + 0.2` fa `0.30000000000000004`). `decimal` converte un numero nella stringa di un importo
e lancia un errore se il numero ha già perso precisione.

```ts
import { build, decimal, type FatturaElettronica } from 'fattura-elettronica-ts';

const fattura: FatturaElettronica = {
  versione: 'FPR12',
  FatturaElettronicaHeader: {
    DatiTrasmissione: {
      IdTrasmittente: { IdPaese: 'IT', IdCodice: '01234567897' },
      ProgressivoInvio: '00001',
      FormatoTrasmissione: 'FPR12',
      CodiceDestinatario: '0000000',
    },
    CedentePrestatore: {
      DatiAnagrafici: {
        IdFiscaleIVA: { IdPaese: 'IT', IdCodice: '01234567897' },
        Anagrafica: { Denominazione: 'ALPHA SRL' },
        RegimeFiscale: 'RF01',
      },
      Sede: {
        Indirizzo: 'VIA ROMA 1',
        CAP: '00100',
        Comune: 'ROMA',
        Provincia: 'RM',
        Nazione: 'IT',
      },
    },
    CessionarioCommittente: {
      DatiAnagrafici: {
        CodiceFiscale: 'RSSMRA80A01H501U',
        Anagrafica: { Nome: 'MARIO', Cognome: 'ROSSI' },
      },
      Sede: { Indirizzo: 'VIA MILANO 2', CAP: '20100', Comune: 'MILANO', Nazione: 'IT' },
    },
  },
  FatturaElettronicaBody: [
    {
      DatiGenerali: {
        DatiGeneraliDocumento: {
          TipoDocumento: 'TD01',
          Divisa: 'EUR',
          Data: '2025-01-15',
          Numero: '1',
          ImportoTotaleDocumento: decimal(122),
        },
      },
      DatiBeniServizi: {
        DettaglioLinee: [
          {
            NumeroLinea: '1',
            Descrizione: 'Consulenza',
            Quantita: decimal(2),
            PrezzoUnitario: decimal(50),
            PrezzoTotale: decimal(100),
            AliquotaIVA: decimal(22),
          },
        ],
        DatiRiepilogo: [
          {
            AliquotaIVA: decimal(22),
            ImponibileImporto: decimal(100),
            Imposta: decimal(22),
            EsigibilitaIVA: 'I',
          },
        ],
      },
    },
  ],
};

// Valida prima di scrivere: lancia BuildError, con l'elenco degli errori, se ne trova anche uno.
const xml = build(fattura);
console.log(xml);
```

`build` scrive i campi nell'ordine dello schema, qualunque sia l'ordine delle chiavi. Qui gli
importi derivati (riepilogo IVA, totale) sono scritti a mano: `validate` controlla che tornino,
con le tolleranze del SdI. Per farli calcolare, vedi l'esempio seguente.

### Creare una fattura dalle righe

`createInvoice` completa la fattura dalle righe: calcola gli importi che dipendono da loro e che
hai lasciato vuoti, e restituisce l'oggetto del modello, pronto per `build`. Qui: le righe, una
cassa previdenziale, una ritenuta e una rata di pagamento. Gli importi possono essere anche
`number` (`50` diventa `"50.00"`).

```ts
import { build, createInvoice, validate } from 'fattura-elettronica-ts';

const fattura = createInvoice({
  versione: 'FPR12',
  FatturaElettronicaHeader: {
    DatiTrasmissione: {
      IdTrasmittente: { IdPaese: 'IT', IdCodice: '01234567897' },
      ProgressivoInvio: '00001',
      FormatoTrasmissione: 'FPR12',
      CodiceDestinatario: '0000000',
    },
    CedentePrestatore: {
      DatiAnagrafici: {
        IdFiscaleIVA: { IdPaese: 'IT', IdCodice: '01234567897' },
        Anagrafica: { Denominazione: 'ALPHA SRL' },
        RegimeFiscale: 'RF01',
      },
      Sede: {
        Indirizzo: 'VIA ROMA 1',
        CAP: '00100',
        Comune: 'ROMA',
        Provincia: 'RM',
        Nazione: 'IT',
      },
    },
    CessionarioCommittente: {
      DatiAnagrafici: {
        CodiceFiscale: 'RSSMRA80A01H501U',
        Anagrafica: { Nome: 'MARIO', Cognome: 'ROSSI' },
      },
      Sede: { Indirizzo: 'VIA MILANO 2', CAP: '20100', Comune: 'MILANO', Nazione: 'IT' },
    },
  },
  FatturaElettronicaBody: [
    {
      DatiGenerali: {
        DatiGeneraliDocumento: {
          TipoDocumento: 'TD01',
          Divisa: 'EUR',
          Data: '2025-01-15',
          Numero: '1',
          // La ritenuta del 20%: sulle righe con Ritenuta SI. L'importo lo calcola createInvoice.
          DatiRitenuta: [{ TipoRitenuta: 'RT01', AliquotaRitenuta: 20, CausalePagamento: 'A' }],
          // La cassa: il contributo è il 4% di ImponibileCassa, e lo calcola createInvoice.
          DatiCassaPrevidenziale: [
            { TipoCassa: 'TC04', AlCassa: 4, ImponibileCassa: 1000, AliquotaIVA: 22 },
          ],
        },
      },
      DatiBeniServizi: {
        DettaglioLinee: [
          {
            NumeroLinea: '1',
            Descrizione: 'Consulenza',
            Quantita: 10,
            PrezzoUnitario: 100,
            AliquotaIVA: 22,
            Ritenuta: 'SI',
          },
          { NumeroLinea: '2', Descrizione: 'Spese', PrezzoUnitario: 50, AliquotaIVA: 22 },
        ],
      },
      DatiPagamento: [
        {
          CondizioniPagamento: 'TP02',
          // Una sola rata: l'importo è il totale meno la ritenuta.
          DettaglioPagamento: [{ ModalitaPagamento: 'MP05', DataScadenzaPagamento: '2025-02-15' }],
        },
      ],
    },
  ],
});

const body = fattura.FatturaElettronicaBody[0];
console.log(body?.DatiBeniServizi.DatiRiepilogo);
console.log(body?.DatiPagamento?.[0]?.DettaglioPagamento[0]?.ImportoPagamento);

console.log(validate(fattura).valid ? build(fattura) : 'Fattura da correggere');
```

Se un dato che serve a un calcolo manca (per esempio l'`ImponibileCassa`), `createInvoice` lancia
`CreateInvoiceError` con l'elenco dei problemi. La struttura non la controlla: ci pensano `build` e
`validate`.

### Mostrare i problemi all'utente

Ogni problema ha un `path` con i nomi del modello, da collegare al campo del modulo, e un `code`
stabile. Il tipo `ProblemCode` elenca tutti i codici: TypeScript segnala un codice scritto male, o
tolto in una versione nuova. Il `message` è per le persone e può cambiare in una patch.

```ts
import { readFile } from 'node:fs/promises';
import { type ProblemCode, parse, validate } from 'fattura-elettronica-ts';

// Una fattura del gestionale, qui letta da un file.
const fattura = parse(await readFile('fattura.xml'));

// Indicazioni del gestionale per alcuni codici; per gli altri, il messaggio della libreria.
const hints: Partial<Record<ProblemCode, string>> = {
  'sdi.00301': 'Controlla la partita IVA in Impostazioni > Azienda.',
  'sdi.00306': "Controlla il codice fiscale nell'anagrafica del cliente.",
};

for (const problem of validate(fattura).problems) {
  const level = problem.severity === 'error' ? 'Errore' : 'Avviso';
  const sdi = problem.sdiCode === undefined ? '' : ` (codice SdI ${problem.sdiCode})`;
  console.log(`${level}${sdi} su ${problem.path || 'documento'}`);
  console.log(`  ${hints[problem.code] ?? problem.message}`);
}
```

L'elenco dei codici, con la fonte di ogni controllo, è in
[Controlli di `validate`](docs/controlli.md).

### Riempire i menu

`codeLists` dà gli elenchi di codici dello schema, con le descrizioni ufficiali.

```ts
import { codeLists } from 'fattura-elettronica-ts';

// Le voci di un menu: TD01 - Fattura, TD04 - Nota di credito…
const options = codeLists.TipoDocumento.map(({ code, description }) => ({
  value: code,
  label: description === undefined ? code : `${code} - ${description}`,
}));
console.log(options);
```

## Cosa fa

- **Formati**: FPR12 (verso privati) e FPA12 (verso la PA), con un modello unico; le regole della
  PA si attivano in base al formato.
- **`parse`**: dall'XML all'oggetto tipizzato. I campi ripetibili sono sempre array, la firma
  `ds:Signature` si conserva così com'è.
- **`build`**: dall'oggetto all'XML, dopo averlo validato. Sugli esempi ufficiali, `parse` e poi
  `build` danno lo stesso contenuto.
- **`validate`**: tutti i problemi in una volta, in ordine di documento, ciascuno con codice,
  percorso, messaggio, gravità e fonte. I test confrontano i controlli di struttura con un
  validatore XSD di riferimento (libxml2).
- **`codeLists`** e **`decimal`**: elenchi dei codici per le interfacce, conversione sicura da
  `number` a importo.

- **`createInvoice`**: dalle righe alla fattura completa. Calcola `PrezzoTotale`, contributo della
  cassa previdenziale, riepiloghi IVA, ritenuta, totale del documento e importo della rata. Il
  livello 2 fa i conti, non decide il fisco: aliquota, natura, tipo di ritenuta e cassa le scegli
  tu. Ogni campo calcolato si può scrivere a mano, e `createInvoice` lo lascia com'è. Sul bollo
  avvisa soltanto: `validate` segnala (`warn.bollo`) quando manca, non lo aggiunge.

In programma: l'estrazione dell'XML dalle buste firmate `.p7m` e una riga di comando.

## Cosa non fa

- Non invia le fatture al SdI e non riceve le notifiche: non è un canale di trasmissione.
- Non firma i file e non verifica la validità legale della firma.
- Non legge ancora i `.p7m`: per ora l'XML va estratto prima, con un altro strumento.
- Non decide le regole fiscali: sceglie tu aliquota, natura, ritenuta, cassa e bollo.
- Non fa la conservazione sostitutiva, né il PDF di cortesia.
- Non gestisce anagrafiche, numerazione o database: sono compiti del gestionale.
- Non tratta la fattura semplificata (FSM10).
- Non fa i controlli che richiedono dati dell'Agenzia delle Entrate: partita IVA esistente, codice
  fiscale registrato, fattura duplicata, codice ufficio esistente. Li può fare solo il SdI: una
  fattura senza errori per la libreria può ancora essere scartata.

## Runtime

| Runtime                     | Come è provato in CI                                                      |
| --------------------------- | ------------------------------------------------------------------------- |
| Node 22, 24 e 26            | tutti i test, a ogni commit                                               |
| Bun e Deno                  | il pacchetto, installato come da npm, legge e valida un esempio ufficiale |
| Browser (Chromium headless) | come Bun e Deno, con il pacchetto in un bundle e l'esempio scaricato      |
| Edge (workerd)              | come Bun e Deno, con il pacchetto in un bundle e l'esempio incorporato    |

Il codice della libreria non usa API di Node né del browser (lo verifica il compilatore), quindi
funziona senza file system: nel browser e su workerd, il runtime di Cloudflare Workers, riceve i
byte della fattura. Sugli altri browser e runtime edge non è provato: se la usi lì, una
segnalazione, di successo o di problema, aiuta.

## Specifiche supportate

- Schema XSD FatturaPA **1.2.3** e Specifiche tecniche del formato 1.4.
- Elenco controlli del SdI 2.0, Specifiche tecniche del SdI 1.8.4 e Allegato A alle Specifiche
  tecniche 1.9.1.

`parse` legge anche i file conformi alle versioni precedenti dello schema (1.2, 1.2.1, 1.2.2).
`validate` e `build` applicano sempre le regole in vigore, anche alle fatture vecchie. Un
controllo automatico apre una issue quando l'Agenzia delle Entrate pubblica nuove specifiche.

## La firma

`parse` conserva la firma XAdES (`ds:Signature`) di una fattura firmata, e `build` la riscrive
così com'è. Ma una firma vale solo per il file che è stato firmato: se modifichi la fattura, o
anche solo la riscrivi con `build` (che può cambiare spazi, prefissi e ordine), la firma non è più
valida e il file va firmato di nuovo.

## Manutenzione e contributi

La sviluppa una persona, nel tempo libero. Issue e pull request ricevono una risposta entro 7-14
giorni, secondo gravità e priorità; le correzioni escono sull'ultima versione.

- Per contribuire: [CONTRIBUTING.md](CONTRIBUTING.md) e il
  [codice di condotta](CODE_OF_CONDUCT.md).
- Una fattura scartata dal SdI che la libreria considerava valida è la segnalazione più utile:
  c'è un [modulo apposito](https://github.com/nicorini/fattura-elettronica-ts/issues/new/choose).
  Non allegare fatture reali: sostituisci nomi, partite IVA, codici fiscali, indirizzi e IBAN.
- Una vulnerabilità si segnala in privato: [SECURITY.md](SECURITY.md).

## Licenza

Il codice è sotto licenza [MIT](LICENSE). Ne sono esclusi i file ufficiali copiati così come
sono, che restano dei loro autori: in [`specs/`](specs/fatturapa-1.2.3/) lo schema XSD FatturaPA
dell'Agenzia delle Entrate e lo schema xmldsig del W3C (con la W3C Software License, riportata nel
file); in [`test/fixtures/official/`](test/fixtures/official/) gli esempi di fattura dell'Agenzia
delle Entrate. La provenienza di ciascuno è nel README della cartella.
