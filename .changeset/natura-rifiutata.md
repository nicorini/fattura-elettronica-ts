---
'fattura-elettronica-ts': patch
---

`validate` non giudica più con i controlli del SdI una `Natura` che lo schema XSD rifiuta (vuota o
con un codice sconosciuto): resta il solo errore `xsd.enumeration`. Prima, ad esempio, una `Natura`
vuota su un riepilogo al 22% dava anche `sdi.00430`, l'avviso `sdi.00444.warn` e l'avviso
`warn.riferimentoNormativo`.
