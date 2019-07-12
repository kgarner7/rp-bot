// tslint:disable
const syllable: (value: string) => number = require("syllable");
// tslint:enable

const HAIKU_COUNT = 17;
// tslint:disable-next-line:no-magic-numbers
const HAIKU_RULES = [5, 7, 5];

export function toHaiku(message: string): string | undefined {
  const count = syllable(message);

  if (count !== HAIKU_COUNT) return undefined;

  const haiku: string[] = [],
    words = message.split(" ");

  let syllableCount = 0,
    tempString = "";

  for (const word of words) {
    tempString += word + " ";
    syllableCount += syllable(word);

    if (syllableCount === HAIKU_RULES[haiku.length]) {
      haiku.push(tempString.substr(0, tempString.length - 1));
      tempString = "";
      syllableCount = 0;
    } else if (syllableCount > HAIKU_RULES[haiku.length]) {
      return undefined;
    }
  }

  return haiku.join("\n");
}
