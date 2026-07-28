import {
  getExamplesByCategory,
  PGN_EXAMPLES,
  type PGNExample,
  type PGNExampleCategory,
} from "@/data/pgn/examples";

const LAST_EXAMPLE_KEY =
  "chess-coach:last-pgn-example";

const FAVORITE_EXAMPLES_KEY =
  "chess-coach:favorite-pgn-examples";

const RECENT_EXAMPLES_KEY =
  "chess-coach:recent-pgn-examples";

const MAX_RECENT_EXAMPLES = 8;

let lastExampleIdInMemory: string | null =
  null;

function canUseStorage(): boolean {
  return typeof window !== "undefined";
}

function readStringArray(
  key: string,
): string[] {
  if (!canUseStorage()) {
    return [];
  }

  try {
    const rawValue =
      window.localStorage.getItem(key);

    if (!rawValue) {
      return [];
    }

    const parsed = JSON.parse(rawValue);

    return Array.isArray(parsed)
      ? parsed.filter(
          (value): value is string =>
            typeof value === "string",
        )
      : [];
  } catch {
    return [];
  }
}

function writeStringArray(
  key: string,
  values: string[],
): void {
  if (!canUseStorage()) {
    return;
  }

  window.localStorage.setItem(
    key,
    JSON.stringify(values),
  );
}

function getLastExampleId(): string | null {
  if (lastExampleIdInMemory) {
    return lastExampleIdInMemory;
  }

  if (!canUseStorage()) {
    return null;
  }

  return window.localStorage.getItem(
    LAST_EXAMPLE_KEY,
  );
}

function rememberLastExample(
  id: string,
): void {
  lastExampleIdInMemory = id;

  if (canUseStorage()) {
    window.localStorage.setItem(
      LAST_EXAMPLE_KEY,
      id,
    );
  }
}

function chooseRandom(
  examples: PGNExample[],
): PGNExample {
  if (examples.length === 0) {
    throw new Error(
      "Aucun exemple PGN disponible.",
    );
  }

  const lastId = getLastExampleId();

  const candidates =
    examples.length > 1
      ? examples.filter(
          (example) =>
            example.id !== lastId,
        )
      : examples;

  const selected =
    candidates[
      Math.floor(
        Math.random() *
          candidates.length,
      )
    ];

  rememberLastExample(selected.id);

  return selected;
}

export function getRandomPGNExample(
  category?: PGNExampleCategory,
): PGNExample {
  return chooseRandom(
    category
      ? getExamplesByCategory(category)
      : PGN_EXAMPLES,
  );
}

export function getPGNExampleCount(
  category: PGNExampleCategory,
): number {
  return getExamplesByCategory(
    category,
  ).length;
}

export function getFavoriteExampleIds(): string[] {
  return readStringArray(
    FAVORITE_EXAMPLES_KEY,
  );
}

export function isFavoriteExample(
  exampleId: string,
): boolean {
  return getFavoriteExampleIds().includes(
    exampleId,
  );
}

export function toggleFavoriteExample(
  exampleId: string,
): string[] {
  const current =
    getFavoriteExampleIds();

  const next = current.includes(exampleId)
    ? current.filter(
        (id) => id !== exampleId,
      )
    : [exampleId, ...current];

  writeStringArray(
    FAVORITE_EXAMPLES_KEY,
    next,
  );

  return next;
}

export function rememberRecentExample(
  exampleId: string,
): string[] {
  const current =
    readStringArray(
      RECENT_EXAMPLES_KEY,
    );

  const next = [
    exampleId,
    ...current.filter(
      (id) => id !== exampleId,
    ),
  ].slice(0, MAX_RECENT_EXAMPLES);

  writeStringArray(
    RECENT_EXAMPLES_KEY,
    next,
  );

  return next;
}

export function getRecentExampleIds(): string[] {
  return readStringArray(
    RECENT_EXAMPLES_KEY,
  );
}