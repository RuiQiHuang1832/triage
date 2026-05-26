const BASE_URL = "https://rxnav.nlm.nih.gov/REST";

// Concept Unique Identifier (RxCUI) is a unique identifier for a drug concept in RxNorm. API wrapper / client for RxNorm REST API to find RxCUI for a given drug name, using both exact and approximate matching.

export interface DrugMatch {
  rxcui: string;
  inputName: string;
  name: string | null;
}

interface RxCuiResponse {
  idGroup?: {
    rxnormId?: string[];
  };
}

interface ApproximateTermResponse {
  approximateGroup?: {
    candidate?: { rxcui: string }[];
  };
}

interface PropertiesResponse {
  properties?: {
    rxcui: string;
    name?: string;
  };
}

interface RelatedResponse {
  relatedGroup?: {
    conceptGroup?: {
      tty?: string;
      conceptProperties?: Ingredient[];
    }[];
  };
}

export interface Ingredient {
  rxcui: string;
  name: string;
}

// /rxcui.json?name=X echoes the search term in idGroup.name rather than the canonical RxNorm name, and /approximateTerm.json's candidate has no name field at all. So both resolvers return only the rxcui, and the canonical name comes from a separate lookup.
async function fetchCanonicalName(rxcui: string): Promise<string | null> {
  const url = `${BASE_URL}/rxcui/${encodeURIComponent(rxcui)}/properties.json`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`RxNorm /rxcui/${rxcui}/properties returned ${res.status}`);
  }
  const data = (await res.json()) as PropertiesResponse;
  return data.properties?.name ?? null;
}

async function findRxCuiId(drugName: string): Promise<string | null> {
  const url = `${BASE_URL}/rxcui.json?name=${encodeURIComponent(drugName)}`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`RxNorm /rxcui returned ${res.status} for "${drugName}"`);
  }
  const data = (await res.json()) as RxCuiResponse;
  return data.idGroup?.rxnormId?.[0] ?? null;
}

async function approximateRxCuiId(drugName: string): Promise<string | null> {
  const url = `${BASE_URL}/approximateTerm.json?term=${encodeURIComponent(drugName)}&maxEntries=1`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`RxNorm /approximateTerm returned ${res.status} for "${drugName}"`);
  }
  const data = (await res.json()) as ApproximateTermResponse;
  return data.approximateGroup?.candidate?.[0]?.rxcui ?? null;
}

export async function resolveDrug(drugName: string): Promise<DrugMatch | null> {
  const rxcui = (await findRxCuiId(drugName)) ?? (await approximateRxCuiId(drugName));
  if (!rxcui) return null;
  const name = await fetchCanonicalName(rxcui);
  return { rxcui, inputName: drugName, name };
}

// Returns the active ingredient(s) for a drug concept. Brand names (Tylenol) resolve to a single ingredient (Acetaminophen); combination products return multiple ingredients. Used to retry OpenFDA label lookups when the brand name has no label of its own.
export async function getIngredients(rxcui: string): Promise<Ingredient[]> {
  const url = `${BASE_URL}/rxcui/${encodeURIComponent(rxcui)}/related.json?tty=IN`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`RxNorm /rxcui/${rxcui}/related returned ${res.status}`);
  }
  const data = (await res.json()) as RelatedResponse;
  const inGroup = data.relatedGroup?.conceptGroup?.find((g) => g.tty === "IN");
  return inGroup?.conceptProperties ?? [];
}
