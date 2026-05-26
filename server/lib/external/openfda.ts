const BASE_URL = "https://api.fda.gov/drug/label.json";

// Structured Product Labeling (SPL) data from OpenFDA's drug label endpoint.
// The drug_interactions field is plain-language text taken from the official label.
//
// Note: OpenFDA's openfda.rxcui index uses product-level rxcuis, not the ingredient-level
// rxcuis that RxNorm's /rxcui endpoint returns. The reliable bridge between the two APIs
// is the canonical drug name (from RxNorm's DrugMatch.name), searched against both
// brand_name and generic_name fields here.

export interface DrugLabel {
  queriedName: string;
  brandNames: string[];
  genericNames: string[];
  interactionsText: string | null;
}

interface OpenFdaLabelResponse {
  results?: Array<{
    drug_interactions?: string[];
    openfda?: {
      brand_name?: string[];
      generic_name?: string[];
    };
  }>;
}

// Two-tier lookup: prefer single-ingredient labels via .exact, fall back to a loose match.
// .exact requires the queried term to equal a full array element, which skips combination
// products (e.g. "HYDROCODONE BITARTRATE AND ACETAMINOPHEN") but also misses labels stored
// under a salt form (e.g. "METFORMIN HYDROCHLORIDE"). The loose fallback catches those.
// _exists_:drug_interactions filters out OTC labels that omit the interactions SPL section.
export async function fetchLabelByName(drugName: string): Promise<DrugLabel | null> {
  // Search by exact first
  const exact = await searchLabel(drugName, true);
  if (exact) return exact;
  return searchLabel(drugName, false);
}

async function searchLabel(drugName: string, exact: boolean): Promise<DrugLabel | null> {
  const term = encodeURIComponent(`"${drugName}"`);
  const field = exact ? "generic_name.exact" : "generic_name";
  const brandField = exact ? "brand_name.exact" : "brand_name";
  const search = `(openfda.${field}:${term}+OR+openfda.${brandField}:${term})+AND+_exists_:drug_interactions`;
  const url = `${BASE_URL}?search=${search}&limit=1`;
  const res = await fetch(url);
  if (res.status === 404) return null;
  if (!res.ok) {
    throw new Error(`OpenFDA /drug/label returned ${res.status} for "${drugName}"`);
  }

  const data = (await res.json()) as OpenFdaLabelResponse;
  const result = data.results?.[0];
  if (!result) return null;

  return {
    queriedName: drugName,
    brandNames: result.openfda?.brand_name ?? [],
    genericNames: result.openfda?.generic_name ?? [],
    interactionsText: result.drug_interactions?.[0] ?? null,
  };
}
