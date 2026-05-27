import { XMLParser } from "fast-xml-parser";

const BASE_URL = "https://wsearch.nlm.nih.gov/ws/query";

// Claude must reason over the conversation FIRST and pass a tight query: a likely condition name ("asthma", "GERD") or a short symptom phrase ("chronic lower back pain"). The tool description in tools.ts must enforce this.

export interface HealthTopic {
  title: string;
  url: string | null;
  organizationName: string | null;
  snippet: string | null;
  fullSummary: string | null;
}

export interface HealthTopicSearch {
  query: string;
  total: number;
  topics: HealthTopic[];
}

// MedlinePlus wraps each field as <content name="FieldName">value</content>. We tell the
// parser to preserve the `name` attribute (prefixed with @_) and to always treat <document>
// and <content> as arrays, so a single result doesn't collapse into a non-array shape.
const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  isArray: (name) => name === "document" || name === "content",
});

interface ParsedResponse {
  nlmSearchResult?: {
    count?: number;
    list?: {
      document?: ParsedDocument[];
    };
  };
}

interface ParsedDocument {
  "@_url"?: string;
  content?: ParsedContent[];
}

interface ParsedContent {
  "@_name"?: string;
  "#text"?: string | number;
}

export async function searchHealthTopics(query: string, maxResults = 3): Promise<HealthTopicSearch> {
  const url = `${BASE_URL}?db=healthTopics&term=${encodeURIComponent(query)}&retmax=${maxResults}`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`MedlinePlus /ws/query returned ${res.status} for "${query}"`);
  }
  const xml = await res.text();
  const parsed = parser.parse(xml) as ParsedResponse;
  const result = parsed.nlmSearchResult;
  const documents = result?.list?.document ?? [];
  return {
    query,
    total: Number(result?.count ?? 0),
    topics: documents.map(toHealthTopic),
  };
}

function toHealthTopic(doc: ParsedDocument): HealthTopic {
  const fields = new Map<string, string>();
  for (const c of doc.content ?? []) {
    if (c["@_name"]) fields.set(c["@_name"], String(c["#text"] ?? ""));
  }
  return {
    title: stripHtml(fields.get("title") ?? ""),
    url: doc["@_url"] ?? null,
    organizationName: stripHtml(fields.get("organizationName") ?? "") || null,
    snippet: stripHtml(fields.get("snippet") ?? "") || null,
    fullSummary: stripHtml(fields.get("FullSummary") ?? "") || null,
  };
}

// Field values contain real HTML markup (<p>, <span class="qt0"> highlight wrappers, etc.)
// after the XML parser decodes the entity-encoded form. Strip tags and collapse whitespace
// so Claude receives clean prose.
function stripHtml(value: string): string {
  return value
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
