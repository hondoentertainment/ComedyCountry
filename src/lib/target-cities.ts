export interface TargetCity {
  slug: string;
  city: string;
  state: string;
  label: string;
  shortLabel: string;
  aliases: string[];
}

export const TARGET_CITIES: TargetCity[] = [
  {
    slug: "new-york-city",
    city: "New York",
    state: "NY",
    label: "New York City, NY",
    shortLabel: "NYC",
    aliases: ["new york", "new york city", "nyc", "manhattan", "brooklyn"],
  },
  {
    slug: "los-angeles",
    city: "Los Angeles",
    state: "CA",
    label: "Los Angeles, CA",
    shortLabel: "LA",
    aliases: ["los angeles", "la", "hollywood"],
  },
  {
    slug: "chicago",
    city: "Chicago",
    state: "IL",
    label: "Chicago, IL",
    shortLabel: "Chicago",
    aliases: ["chicago"],
  },
  {
    slug: "austin",
    city: "Austin",
    state: "TX",
    label: "Austin, TX",
    shortLabel: "Austin",
    aliases: ["austin"],
  },
  {
    slug: "philadelphia",
    city: "Philadelphia",
    state: "PA",
    label: "Philadelphia, PA",
    shortLabel: "Philly",
    aliases: ["philadelphia", "philly"],
  },
];

function normalize(value: string | null | undefined) {
  return (value ?? "").trim().toLowerCase();
}

export function getTargetCityBySlug(slug: string) {
  const normalized = normalize(slug);
  return TARGET_CITIES.find((city) => city.slug === normalized) ?? null;
}

export function matchTargetCity(city: string | null | undefined, state: string | null | undefined) {
  const normalizedCity = normalize(city);
  const normalizedState = normalize(state);

  return (
    TARGET_CITIES.find((target) => {
      if (normalizedState && normalizedState !== normalize(target.state)) {
        return false;
      }

      return target.aliases.some((alias) => normalizedCity.includes(alias));
    }) ?? null
  );
}

export function isTargetCity(city: string | null | undefined, state: string | null | undefined) {
  return !!matchTargetCity(city, state);
}

