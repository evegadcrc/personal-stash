// Spanish → English canonical category slug mapping
const SPANISH_TO_ENGLISH: Record<string, string> = {
  // Movies / TV
  peliculas: "movies",
  pelicula: "movies",
  series: "movies",
  serie: "movies",
  cine: "movies",
  // Places
  lugares: "places",
  lugar: "places",
  viajes: "places",
  viaje: "places",
  destinos: "places",
  destino: "places",
  // AI
  ia: "ai",
  "inteligencia-artificial": "ai",
  // Bookmarks
  marcadores: "bookmarks",
  favoritos: "bookmarks",
  articulos: "bookmarks",
  noticias: "bookmarks",
  recursos: "bookmarks",
  // Ideas
  notas: "ideas",
  proyectos: "ideas",
  // Restaurants
  restaurante: "restaurants",
};

// Icon map — covers English slugs + common extra categories
export const CATEGORY_ICONS: Record<string, string> = {
  ai: "🤖",
  movies: "🎬",
  places: "📍",
  ideas: "💡",
  bookmarks: "🔖",
  restaurants: "🍽️",
  sadhguru: "🧘",
  books: "📚",
  music: "🎵",
  travel: "✈️",
  finance: "💰",
  health: "💪",
  tech: "💻",
  code: "💻",
  news: "📰",
  recipes: "🥘",
  fitness: "🏋️",
  work: "💼",
  shopping: "🛍️",
  education: "🎓",
  games: "🎮",
  sports: "⚽",
  art: "🎨",
  food: "🍴",
  science: "🔬",
};

/** Normalize a category name: strip accents, lowercase, spaces→hyphens, map Spanish→English */
export function normalizeCategory(name: string): string {
  const slug = name
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // strip diacritics (é→e, ü→u, etc.)
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "");
  return SPANISH_TO_ENGLISH[slug] ?? slug;
}

export function getCategoryIcon(name: string): string {
  const normalized = normalizeCategory(name);
  return CATEGORY_ICONS[normalized] ?? CATEGORY_ICONS[name] ?? "📁";
}
