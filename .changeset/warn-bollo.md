---
'fattura-elettronica-ts': minor
---

`validate` avvisa quando una fattura sembra dovere il bollo e non lo dichiara. Nuovo codice
`warn.bollo`: manca `BolloVirtuale` `SI` e la somma dei `PrezzoTotale` delle righe con natura
N2.1, N2.2, N3.5, N3.6 o N4, tolte quelle con `AltriDatiGestionali/TipoDato` NB1, NB2 o NB3, supera
77,47 € (77,47 esatti non avvisano). È il criterio con cui l'Agenzia delle Entrate integra il bollo
d'ufficio e ne chiede il pagamento: non avvisa con `TipoDocumento` TD16–TD19 e TD28, con
`RegimeFiscale` da RF05 a RF11 o con `CodiceDestinatario` `XXXXXXX`, e non guarda le righe N1 e
N3.4, che per legge possono dovere il bollo anche se l'Agenzia non le segnala. In un lotto ogni
fattura si giudica da sola.
