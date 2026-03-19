import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const OWNER = "edwin.vega@gmail.com";

const items = [
  // The Witch — movie poster
  {
    id: "cfb73914-5695-4f85-8213-4857fb2ffaca",
    ownerEmail: OWNER,
    title: "The Witch (2015)",
    url: "https://www.imdb.com/title/tt4263482/",
    summary: "A24 folk horror film directed by Robert Eggers. A Puritan family in 1630s New England is torn apart by supernatural forces after being exiled from their plantation. Starring Anya Taylor-Joy in her breakout role alongside Ralph Ineson and Kate Dickie. Critically acclaimed for its slow-burn dread, period-accurate dialogue, and deeply unsettling atmosphere.",
    category: "movies",
    subcategory: "to-watch",
    tags: ["a24", "horror", "robert-eggers", "anya-taylor-joy", "folk-horror"],
    source: "manual",
    read: false,
    dateAdded: new Date("2026-03-19T00:00:00Z"),
  },
  // Sadhguru quotes
  {
    id: "fb1bb5c2-fa19-4b33-b4ca-ff2e829934e8",
    ownerEmail: OWNER,
    title: "Quienes están absolutamente seguros de todo han congelado su inteligencia",
    url: null,
    summary: "Quienes están absolutamente seguros de todo han congelado su inteligencia.",
    category: "sadhguru",
    subcategory: "quote",
    tags: ["inteligencia", "certeza", "mente", "sadhguru"],
    source: "manual",
    read: false,
    dateAdded: new Date("2026-03-19T00:00:00Z"),
  },
  {
    id: "4492bd8d-9a12-40d6-bf27-cd7f5cde0319",
    ownerEmail: OWNER,
    title: "Nadie puede alcanzar el bienestar a través del sufrimiento de otra persona",
    url: null,
    summary: "Nadie puede alcanzar el bienestar a través del sufrimiento de otra persona. Aunque te beneficies temporalmente, pagarás por ello.",
    category: "sadhguru",
    subcategory: "quote",
    tags: ["bienestar", "karma", "relaciones", "sadhguru"],
    source: "manual",
    read: false,
    dateAdded: new Date("2026-03-19T00:00:00Z"),
  },
  {
    id: "86654443-ceb5-402d-b67f-e22594d69247",
    ownerEmail: OWNER,
    title: "No malgastes tu tiempo y tu Vida en cosas que no importan",
    url: null,
    summary: "No malgastes tu tiempo y tu Vida en cosas que no importan. Dedícate al cien por ciento a lo que realmente te importa a ti: hoy, no mañana.",
    category: "sadhguru",
    subcategory: "quote",
    tags: ["tiempo", "enfoque", "prioridades", "sadhguru"],
    source: "manual",
    read: false,
    dateAdded: new Date("2026-03-19T00:00:00Z"),
  },
  {
    id: "4a9853d4-a1b2-4ccf-9a9b-8c485baec731",
    ownerEmail: OWNER,
    title: "Cuanto más exclusivo te vuelves en tus pensamientos, más excluido te vuelves de la Vida",
    url: null,
    summary: "Cuanto más exclusivo te vuelves en tus pensamientos y emociones, más excluido te vuelves de la Vida.",
    category: "sadhguru",
    subcategory: "quote",
    tags: ["mente", "emociones", "apertura", "sadhguru"],
    source: "manual",
    read: false,
    dateAdded: new Date("2026-03-19T00:00:00Z"),
  },
  {
    id: "3c291490-9bed-4ac5-b7d8-c006ed6e8775",
    ownerEmail: OWNER,
    title: "Este es el momento en que el Sol está en su plenitud",
    url: null,
    summary: "Este es el momento en que el Sol está en su plenitud. La vida está en su plenitud. Si quieres que tu Vida dé frutos, si deseas Transformación, este es el momento.",
    category: "sadhguru",
    subcategory: "quote",
    tags: ["presente", "transformacion", "plenitud", "sadhguru"],
    source: "manual",
    read: false,
    dateAdded: new Date("2026-03-19T00:00:00Z"),
  },
];

async function main() {
  for (const item of items) {
    const existing = await prisma.item.findUnique({ where: { id: item.id } });
    if (existing) { console.log(`SKIP: ${item.title}`); continue; }
    await prisma.item.create({ data: item });
    console.log(`ADDED: ${item.title}`);
  }
  await prisma.$disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });
