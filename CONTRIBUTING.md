# Contribuire

## Sviluppo

Servono Node (versione in `.nvmrc`) e pnpm (versione in `packageManager` di `package.json`).

```sh
pnpm install
pnpm lint       # formattazione e lint (Biome); `pnpm fix` corregge
pnpm typecheck
pnpm test
pnpm build
pnpm generate   # rigenera src/generated dall'XSD in specs/
```

Il codice in `src/generated` lo scrive `scripts/generate` a partire dall'XSD ufficiale: non si
modifica a mano. Si cambia il generatore e si rilancia `pnpm generate`; la CI controlla che il
codice committato sia identico a quello rigenerato.

## Lingua

Il dominio parla italiano, il meccanismo inglese.

- **Italiano**: i nomi presi dall'XSD (`CedentePrestatore`, `ImponibileImporto`), i messaggi di
  errore, la documentazione, il changelog e le issue.
- **Inglese**: funzioni, opzioni, moduli e variabili tecniche (`parse`, `validate`, `totals`), i
  commenti, la JSDoc, i nomi dei test, i commit e i titoli delle pull request. Le citazioni di norme e Specifiche tecniche restano nella lingua
  originale.

## Commenti

Un commento dice ciò che il codice non dice: il perché di una scelta, un vincolo, un'avvertenza.

- **API pubblica**: JSDoc su ogni export. Una frase, poi formato, vincoli ed errori, con un
  `@example` dove aiuta. I tipi li dichiara già TypeScript.
- **Codice interno**: un commento solo dove il perché non è evidente.
- **Test**: il nome del test descrive il comportamento. Una regola fiscale porta accanto al test la
  sua fonte primaria (norma, circolare o risoluzione dell'Agenzia, Specifiche tecniche), con il
  passo citato e il link.
- **Configurazione e CI**: un commento solo per le scelte diverse dal default o non ovvie. Le azioni
  di GitHub sono fissate per hash, con la versione in commento sulla stessa riga
  (`actions/checkout@<hash> # v7.0.1`): Dependabot la aggiorna insieme all'hash.

## Proporre una modifica

Per una correzione piccola apri direttamente la pull request. Per tutto il resto apri prima una
issue: si decide insieme se la modifica rientra in ciò che la libreria fa (vedi README), prima che
tu scriva il codice. La libreria è sviluppata nel tempo libero: issue e pull request ricevono una
risposta entro 7-14 giorni.

Puoi usare strumenti di intelligenza artificiale. Chi apre la pull request risponde di ogni riga:
deve saperla spiegare e averla provata.

## Versioni e changelog

Le versioni e il `CHANGELOG.md` li gestisce [Changesets](https://changesets.dev). Una modifica che
cambia il comportamento della libreria porta con sé un changeset:

```sh
pnpm changeset
```

Il comando chiede il tipo di versione e un testo, che finisce nel changelog: scrivilo in italiano,
per chi usa la libreria (cosa cambia per lui, non come è fatto il codice). Il file creato in
`.changeset/` va committato con la modifica. Test, CI e documentazione non ne hanno bisogno.

Prima della 1.0 la libreria segue la regola delle versioni 0.x:

| Modifica                                                             | Tipo di versione |
| -------------------------------------------------------------------- | ---------------- |
| Rottura dell'API, o un controllo che rifiuta fatture prima accettate | `minor`          |
| Funzione nuova compatibile, aggiornamento delle specifiche ufficiali | `minor`          |
| Correzione compatibile                                               | `patch`          |

I codici dei problemi (`Problem.code`, tipo `ProblemCode`) sono parte dell'API:

- un codice nuovo, per un controllo aggiunto, è una `minor`;
- un codice tolto o rinominato è una rottura (`minor` sulla 0.x);
- un messaggio cambiato è una `patch`: `message` non è stabile.

Il changeset nomina ogni codice aggiunto, tolto o rinominato: «Nuovo codice `sdi.00426`».

Non scegliere mai `major`: Changesets la applica alla lettera e da una 0.x passa alla 1.0.0
(provato con Changesets 3: `0.1.0` più un changeset `major` dà `1.0.0`, uno `minor` dà `0.2.0`).
La 1.0 si deciderà a parte, quando l'API sarà stabile. Chi installa con `^0.2.0` riceve solo le
patch della 0.2: una minor la sceglie lui, leggendo il changelog.

Al rilascio ci pensa la CI: a ogni push su `main` con changeset in attesa apre (o aggiorna) la
pull request «chore: release», che alza la versione e scrive il changelog. Quando il maintainer la
unisce, la versione viene caricata su npm in attesa di approvazione, e il maintainer la approva con
la verifica in due passaggi. La pubblicazione usa il trusted publishing di npm: nessun token nel
repository, e ogni versione porta la provenance, cioè la prova di quale commit e quale workflow
l'hanno prodotta.

## Specifiche ufficiali

La libreria segue le specifiche in vigore della fattura elettronica: lo schema XSD FatturaPA
1.2.3 (in `specs/`), l'Elenco controlli del SdI, le Specifiche tecniche del SdI e l'Allegato A
dell'Agenzia delle Entrate.

L'Agenzia non annuncia gli aggiornamenti. Ogni settimana un workflow (`spec-watch.yml`) scarica
le pagine e i file elencati in `specs/sources.json` e li confronta con le impronte salvate: per un
file l'hash SHA-256, per una pagina l'elenco dei documenti che collega. Se qualcosa cambia apre
una issue. In locale:

```sh
pnpm specs:watch            # confronta e stampa le differenze
pnpm specs:watch --update   # salva le impronte attuali in specs/sources.json
```

Un aggiornamento delle specifiche esce sempre come versione `minor`.

## Perché alcune scelte

- **Universale.** La libreria gira su Node ≥ 22, Bun, Deno, browser ed edge. Per questo il codice
  in `src/` non usa API di Node né del browser (il `tsconfig.json` non le dichiara, e `tsc` le
  rifiuta) e non ha dipendenze native. Gli script in `scripts/` girano solo su Node e possono
  usarlo.
- **Poche dipendenze.** Ogni dipendenza di runtime arriva a chi installa la libreria: se ne
  aggiunge una solo quando scriverla da sé costerebbe molto di più.
- **pnpm e le sue difese.** pnpm non installa versioni pubblicate da meno di un giorno e rifiuta
  una versione con meno garanzie delle precedenti (per esempio senza provenance): sono i segnali
  tipici di un pacchetto compromesso. Se un'installazione si ferma per questo, è voluto.
- **Una regola fiscale, una fonte.** Una regola fiscale entra solo con un test e la sua fonte
  primaria accanto (vedi «Commenti»): chi legge deve poter verificare da sé.
- **Mai più severi del SdI.** Un controllo della libreria non rifiuta ciò che XSD e SdI accettano:
  nel dubbio, un avviso e non un errore.
- **Niente fatture reali.** Nei test, nelle issue e nelle pull request entrano solo fatture
  costruite a mano o anonimizzate: nomi, partite IVA, codici fiscali, indirizzi e IBAN inventati.
