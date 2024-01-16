import IDictionary from "./IDictionary";
export function combineDictionaries(
  rootDictionary: IDictionary<string>,
  overiddingDictionary: IDictionary<string>,
): IDictionary<string> {
  let combinedDictionary: IDictionary<string> = {};
  if (rootDictionary && Object.keys(rootDictionary).length > 0) {
    const overiddingKeys = Object.keys(overiddingDictionary);
    combinedDictionary = rootDictionary;

    for (const key of overiddingKeys) {
      combinedDictionary[key] = overiddingDictionary[key];
    }
  } else {
    combinedDictionary = overiddingDictionary;
  }

  return combinedDictionary;
}