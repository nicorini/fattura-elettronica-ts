// Form and check character of Italian tax codes, from DM Finanze 23/12/1976 ("Sistemi di
// codificazione dei soggetti da iscrivere all'anagrafe tributaria"). Only what makes a code
// impossible: dates, municipalities and office codes are not checked, since art. 10 allows
// provisional codes built from wrong personal data.

/**
 * Why `value` is not a P.IVA, or `undefined` if it is one: 11 digits whose last one is the check
 * digit of art. 9 (the Luhn algorithm).
 */
export function partitaIvaFault(value: string): string | undefined {
  if (!/^[0-9]{11}$/.test(value)) return 'una partita IVA ha 11 cifre, senza prefisso del paese';
  return luhnHolds(value) ? undefined : 'la cifra di controllo non è quella attesa';
}

/**
 * Why `value` is not a codice fiscale, or `undefined` if it is one: 11 digits as a P.IVA (artt.
 * 8-9), or 16 characters (artt. 2-5) whose digits may be replaced by letters (omocodia, art. 6)
 * and whose last letter is the check of art. 7.
 */
export function codiceFiscaleFault(value: string): string | undefined {
  if (value.length === 11) {
    if (!/^[0-9]{11}$/.test(value)) return 'un codice fiscale di 11 caratteri ha solo cifre';
    return luhnHolds(value) ? undefined : 'la cifra di controllo non è quella attesa';
  }
  if (value.length !== 16) return 'un codice fiscale ha 11 cifre o 16 caratteri';
  // Letters at 1-6, 9, 12, 16; at the 7 numeric places a digit or its omocodia letter.
  const omocodia = '[0-9LMNPQRSTUV]';
  const form = new RegExp(`^[A-Z]{6}${omocodia}{2}[A-Z]${omocodia}{2}[A-Z]${omocodia}{3}[A-Z]$`);
  if (!form.test(value)) return 'la forma non è quella di un codice fiscale di 16 caratteri';
  return checkLetter(value.slice(0, 15)) === value[15]
    ? undefined
    : 'il carattere di controllo non è quello atteso';
}

// Art. 9: digits in odd places summed, in even places doubled (minus 9 above 9) and summed; the
// check digit makes the total a multiple of 10.
function luhnHolds(digits: string): boolean {
  let total = 0;
  for (const [index, char] of [...digits].entries()) {
    const digit = Number(char);
    const doubled = digit * 2;
    total += index % 2 === 0 ? digit : doubled > 9 ? doubled - 9 : doubled;
  }
  return total % 10 === 0;
}

// Art. 7, values of the characters in odd places: 0-9 count as A-J.
const ODD = [
  1, 0, 5, 7, 9, 13, 15, 17, 19, 21, 2, 4, 18, 20, 11, 3, 6, 8, 12, 14, 16, 10, 22, 25, 24, 23,
];

// Art. 7: odd places by the table above, even places by their rank (0-9 and A-Z from 0), the sum
// modulo 26 is the letter.
function checkLetter(first15: string): string {
  let total = 0;
  for (const [index, char] of [...first15].entries()) {
    const rank = /[0-9]/.test(char) ? Number(char) : char.charCodeAt(0) - 65;
    total += index % 2 === 0 ? (ODD[rank] ?? 0) : rank;
  }
  return String.fromCharCode(65 + (total % 26));
}
