# Schema FatturaPA 1.2.3

Copie esatte dei file ufficiali, scaricate il 2026-11-13. Non vanno modificate: un aggiornamento
dell'Agenzia delle Entrate si aggiunge come nuova cartella.

| File                       | Origine                                                                                 | SHA-256                                                            |
| -------------------------- | --------------------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| `Schema_VFPR12_v1.2.3.xsd` | <https://www.fatturapa.gov.it/export/documenti/fatturapa/v1.4/Schema_VFPR12_v1.2.3.xsd> | `152944f6eef9f5d69ef6e955ee173b32142b00a8c1c5222fc97dfab5910e8a8c` |
| `xmldsig-core-schema.xsd`  | <https://www.w3.org/TR/2002/REC-xmldsig-core-20020212/xmldsig-core-schema.xsd>          | `35cf8197da812c85e40d57891b35c94187569ed474a2dac813ce5090dafcd35c` |

- Lo schema vale per le fatture verso privati (`FPR12`) e verso la PA (`FPA12`):
  `Schema_VFPA12_V1.2.3.xsd`, pubblicato nella stessa pagina, è identico byte per byte.
- Pagina ufficiale: <https://www.fatturapa.gov.it/it/norme-e-regole/documentazione-fattura-elettronica/formato-fatturapa/>
  ("Documentazione valida dal 1 aprile 2025").
- `xmldsig-core-schema.xsd` definisce la firma `ds:Signature` che lo schema importa; è distribuito
  con la W3C Software License, riportata nel file.
