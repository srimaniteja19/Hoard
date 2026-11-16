import { ChannelMediaItem } from "./types";

export interface RawVgfEntry {
  id?: string;
  title: string;
  year: number;
  director: string;
  country: string;
  lang?: string;
  langFlag?: string;
  genre: string;
  where: string;
  mins?: number;
  imdb?: number;
  recommendedBy?: string;
  blurb: string;
  sourceUrl?: string;
  icon?: string;
}

const COUNTRY_TO_LANG: Record<string, { lang: string; flag: string }> = {
  france: { lang: "French", flag: "🇫🇷" },
  french: { lang: "French", flag: "🇫🇷" },
  usa: { lang: "English", flag: "🇺🇸" },
  "united states": { lang: "English", flag: "🇺🇸" },
  us: { lang: "English", flag: "🇺🇸" },
  uk: { lang: "English", flag: "🇬🇧" },
  "united kingdom": { lang: "English", flag: "🇬🇧" },
  australia: { lang: "English", flag: "🇦🇺" },
  canada: { lang: "English", flag: "🇨🇦" },
  ireland: { lang: "English", flag: "🇮🇪" },
  "new zealand": { lang: "English", flag: "🇳🇿" },
  japan: { lang: "Japanese", flag: "🇯🇵" },
  japanese: { lang: "Japanese", flag: "🇯🇵" },
  "south korea": { lang: "Korean", flag: "🇰🇷" },
  korea: { lang: "Korean", flag: "🇰🇷" },
  korean: { lang: "Korean", flag: "🇰🇷" },
  italy: { lang: "Italian", flag: "🇮🇹" },
  italian: { lang: "Italian", flag: "🇮🇹" },
  germany: { lang: "German", flag: "🇩🇪" },
  "west germany": { lang: "German", flag: "🇩🇪" },
  german: { lang: "German", flag: "🇩🇪" },
  spain: { lang: "Spanish", flag: "🇪🇸" },
  mexico: { lang: "Spanish", flag: "🇲🇽" },
  argentina: { lang: "Spanish", flag: "🇦🇷" },
  chile: { lang: "Spanish", flag: "🇨🇱" },
  taiwan: { lang: "Mandarin", flag: "🇹🇼" },
  "hong kong": { lang: "Cantonese", flag: "🇭🇰" },
  china: { lang: "Mandarin", flag: "🇨🇳" },
  norway: { lang: "Norwegian", flag: "🇳🇴" },
  sweden: { lang: "Swedish", flag: "🇸🇪" },
  denmark: { lang: "Danish", flag: "🇩🇰" },
  iran: { lang: "Persian", flag: "🇮🇷" },
  india: { lang: "Hindi", flag: "🇮🇳" },
  brazil: { lang: "Portuguese", flag: "🇧🇷" },
  poland: { lang: "Polish", flag: "🇵🇱" },
  czechoslovakia: { lang: "Czech", flag: "🇨🇿" },
  "czech republic": { lang: "Czech", flag: "🇨🇿" },
  belgium: { lang: "French", flag: "🇧🇪" },
  senegal: { lang: "Wolof / French", flag: "🇸🇳" },
};

const MOTIF_POOL = [
  "clapper",
  "camera",
  "star",
  "heart",
  "eye",
  "sun",
  "moon",
  "flower",
  "glass",
  "flame",
  "globe",
  "gem",
  "crown",
  "palm",
  "leaf",
];

export function slugifyVgfId(title: string, year?: number): string {
  const base = title
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 36);
  return `vgf_${base}${year ? `_${year}` : ""}`;
}

export function resolveCountryMeta(country?: string, fallbackLang?: string): {
  lang: string;
  langFlag: string;
} {
  const raw = (country || fallbackLang || "USA").trim();
  const primary = raw.split(/[\/,&]/)[0].trim().toLowerCase();
  const matched = COUNTRY_TO_LANG[primary];
  if (matched) {
    return { lang: matched.lang, langFlag: matched.flag };
  }
  return {
    lang: fallbackLang || raw || "English",
    langFlag: "🎬",
  };
}

export const VERY_GOOD_FILMS_SEED: RawVgfEntry[] = [
  {
    title: "Breathless (À bout de souffle)",
    year: 1960,
    director: "Jean-Luc Godard",
    country: "France",
    genre: "Crime / New Wave",
    where: "Criterion Channel / Kanopy",
    mins: 90,
    imdb: 7.7,
    recommendedBy: "Beth Wilkinson",
    blurb: "A small-time Parisian car thief impulsively murders a motorcycle policeman and hides out with an American journalism student selling the New York Herald Tribune on the Champs-Élysées.",
    icon: "camera",
  },
  {
    title: "Le Bonheur",
    year: 1965,
    director: "Agnès Varda",
    country: "France",
    genre: "Drama / Romance",
    where: "Criterion Channel / Max",
    mins: 79,
    imdb: 7.6,
    recommendedBy: "Emma Stevenson",
    blurb: "Shot in lush Impressionist pastels and scored to Mozart, a young carpenter effortlessly loves both his devoted wife and a postal clerk—provoking a chilling question about the nature of happiness.",
    icon: "flower",
  },
  {
    title: "Mid90s",
    year: 2018,
    director: "Jonah Hill",
    country: "USA",
    genre: "Coming-of-Age / Drama",
    where: "Netflix / Kanopy / A24",
    mins: 85,
    imdb: 7.4,
    recommendedBy: "Emma Stevenson",
    blurb: "Thirteen-year-old Stevie escapes his turbulent Los Angeles home life by finding brotherhood, bruises, and self-hood among an older crew at Motor Avenue Skateshop.",
    icon: "sun",
  },
  {
    title: "Heathers",
    year: 1988,
    director: "Michael Lehmann",
    country: "USA",
    genre: "Black Comedy",
    where: "Prime Video / Tubi",
    mins: 103,
    imdb: 7.2,
    recommendedBy: "Beth Wilkinson",
    blurb: "Veronica Sawyer is desperate to escape her Ohio high school's cruelest clique of identically named Heathers—until a trench-coated new transfer student takes her revenge fantasies literally.",
    icon: "flame",
  },
  {
    title: "20,000 Days on Earth",
    year: 2014,
    director: "Iain Forsyth & Jane Pollard",
    country: "UK",
    genre: "Documentary / Music",
    where: "Kanopy / Apple TV",
    mins: 97,
    imdb: 7.4,
    recommendedBy: "Very Good Films",
    blurb: "An inventive, staged-yet-intimate portrait following musician and writer Nick Cave through a fictionalized 20,000th day of his life in Brighton as he reflects on memory, myth, and songwriting.",
    icon: "mic",
  },
  {
    title: "Paris, Texas",
    year: 1984,
    director: "Wim Wenders",
    country: "West Germany / USA",
    genre: "Drama",
    where: "Criterion Channel / Max",
    mins: 145,
    imdb: 8.1,
    recommendedBy: "Beth Wilkinson",
    blurb: "A mute drifter wanders out of the Mojave Desert in a red baseball cap and slowly attempts to reconnect with his young son and the estranged wife he left behind.",
    icon: "palm",
  },
  {
    title: "In the Mood for Love",
    year: 2000,
    director: "Wong Kar-wai",
    country: "Hong Kong",
    genre: "Romance / Drama",
    where: "Criterion Channel / Max",
    mins: 98,
    imdb: 8.1,
    recommendedBy: "Emma Stevenson",
    blurb: "Two neighbors in 1962 Hong Kong discover that their respective spouses are having an affair, and form a restraint-bound, aching intimacy in noodle shops and rain-slicked corridors.",
    icon: "heart",
  },
  {
    title: "Cléo from 5 to 7",
    year: 1962,
    director: "Agnès Varda",
    country: "France",
    genre: "Drama / New Wave",
    where: "Criterion Channel / Max",
    mins: 90,
    imdb: 7.9,
    recommendedBy: "Beth Wilkinson",
    blurb: "In real time across two summer hours in Paris, a pop singer wanders from Montparnasse cafés to Parc Montsouris while awaiting the results of a medical biopsy.",
    icon: "clock",
  },
  {
    title: "Tampopo",
    year: 1985,
    director: "Juzo Itami",
    country: "Japan",
    genre: "Comedy / Food",
    where: "Criterion Channel / Max",
    mins: 114,
    imdb: 7.9,
    recommendedBy: "Very Good Films",
    blurb: "A cowboy-hatted milk-truck driver rides into a struggling Tokyo noodle shop and mentors its widowed owner in the high-stakes art of crafting the Platonic ideal of ramen.",
    icon: "plate",
  },
  {
    title: "Portrait of a Lady on Fire",
    year: 2019,
    director: "Céline Sciamma",
    country: "France",
    genre: "Romance / Period Drama",
    where: "Hulu / Criterion Channel",
    mins: 122,
    imdb: 8.1,
    recommendedBy: "Emma Stevenson",
    blurb: "On an isolated windswept island in 18th-century Brittany, a painter is commissioned to complete a wedding portrait of a defiant young woman in secret.",
    icon: "flame",
  },
  {
    title: "Chungking Express",
    year: 1994,
    director: "Wong Kar-wai",
    country: "Hong Kong",
    genre: "Romance / Comedy-Drama",
    where: "Criterion Channel",
    mins: 102,
    imdb: 8.0,
    recommendedBy: "Beth Wilkinson",
    blurb: "Two lovesick Hong Kong cops—one buying tins of pineapple expiring on May 1st, the other oblivious as a snack-bar clerk secretly redecorates his apartment—brush past heartbreak.",
    icon: "star",
  },
  {
    title: "Aftersun",
    year: 2022,
    director: "Charlotte Wells",
    country: "UK",
    genre: "Drama",
    where: "Netflix / MUBI / Kanopy",
    mins: 102,
    imdb: 7.6,
    recommendedBy: "Emma Stevenson",
    blurb: "Twenty years later, Sophie pieces together MiniDV camcorder footage and unspoken memories of a fading late-1990s Turkish resort holiday with her loving, quietly struggling young father.",
    icon: "sun",
  },
  {
    title: "Beau Travail",
    year: 1999,
    director: "Claire Denis",
    country: "France",
    genre: "Drama",
    where: "Criterion Channel",
    mins: 92,
    imdb: 7.4,
    recommendedBy: "Very Good Films",
    blurb: "Under the blinding sun of Djibouti, a disgraced French Foreign Legion sergeant major fixates on a serene, beloved new recruit in a hypnotic study of repression and rhythm.",
    icon: "sun",
  },
  {
    title: "Frances Ha",
    year: 2012,
    director: "Noah Baumbach",
    country: "USA",
    genre: "Comedy / Drama",
    where: "Netflix / Criterion Channel",
    mins: 86,
    imdb: 7.4,
    recommendedBy: "Emma Stevenson",
    blurb: "An apprentice dancer in New York who doesn't really have an apartment—and refuses to settle for less than joy—bounces from Brooklyn to Chinatown to Paris in luminous black-and-white.",
    icon: "star",
  },
  {
    title: "The Worst Person in the World",
    year: 2021,
    director: "Joachim Trier",
    country: "Norway",
    genre: "Comedy / Drama / Romance",
    where: "Hulu / Kanopy",
    mins: 128,
    imdb: 7.7,
    recommendedBy: "Beth Wilkinson",
    blurb: "Told in twelve chapters, a prologue, and an epilogue, Julie navigates four turbulent years of career pivots, love affairs, and existential restlessness in contemporary Oslo.",
    icon: "heart",
  },
  {
    title: "Yi Yi",
    year: 2000,
    director: "Edward Yang",
    country: "Taiwan",
    genre: "Drama",
    where: "Criterion Channel",
    mins: 173,
    imdb: 8.1,
    recommendedBy: "Very Good Films",
    blurb: "Beginning with a wedding and ending with a funeral, three generations of a middle-class Taipei family search for grace, while eight-year-old Yang-Yang photographs the backs of people's heads.",
    icon: "camera",
  },
  {
    title: "Stop Making Sense",
    year: 1984,
    director: "Jonathan Demme",
    country: "USA",
    genre: "Documentary / Concert",
    where: "Max / A24",
    mins: 88,
    imdb: 8.7,
    recommendedBy: "Beth Wilkinson",
    blurb: "David Byrne walks onto a bare stage with a boombox and an acoustic guitar; song by song, Talking Heads assemble into the most euphoric concert film ever captured.",
    icon: "drum",
  },
  {
    title: "A Woman Under the Influence",
    year: 1974,
    director: "John Cassavetes",
    country: "USA",
    genre: "Drama",
    where: "Criterion Channel / Max",
    mins: 155,
    imdb: 8.0,
    recommendedBy: "Very Good Films",
    blurb: "Gena Rowlands gives a volcanic, fiercely tender performance as Mabel Longhetti, a Los Angeles suburban wife and mother whose emotional volatility overwhelms her blue-collar husband.",
    icon: "eye",
  },
  {
    title: "The Gleaners and I",
    year: 2000,
    director: "Agnès Varda",
    country: "France",
    genre: "Documentary",
    where: "Criterion Channel / Kanopy",
    mins: 82,
    imdb: 7.8,
    recommendedBy: "Beth Wilkinson",
    blurb: "Armed with a handheld digital camera, Agnès Varda travels across rural and urban France meeting modern gleaners—foragers, artists, and salvagers—while reflecting on aging and cinema itself.",
    icon: "leaf",
  },
  {
    title: "Wings of Desire",
    year: 1987,
    director: "Wim Wenders",
    country: "West Germany",
    genre: "Drama / Fantasy",
    where: "Criterion Channel / Kanopy",
    mins: 128,
    imdb: 7.9,
    recommendedBy: "Emma Stevenson",
    blurb: "An invisible angel listening to the inner monologues of divided Berlin falls in love with a lonely trapeze artist and chooses mortality so he can taste coffee and feel the cold.",
    icon: "cloud",
  },
  {
    title: "Harold and Maude",
    year: 1971,
    director: "Hal Ashby",
    country: "USA",
    genre: "Comedy / Romance",
    where: "Paramount+ / Prime Video",
    mins: 91,
    imdb: 7.9,
    recommendedBy: "Beth Wilkinson",
    blurb: "A death-obsessed, hearse-driving twenty-year-old from a wealthy California family meets a seventy-nine-year-old Holocaust survivor who teaches him how to fiercely love being alive.",
    icon: "flower",
  },
  {
    title: "Close-Up",
    year: 1990,
    director: "Abbas Kiarostami",
    country: "Iran",
    genre: "Docudrama",
    where: "Criterion Channel",
    mins: 98,
    imdb: 8.2,
    recommendedBy: "Very Good Films",
    blurb: "The real-life trial and re-enactment of Hossain Sabzian, an unemployed print-shop worker in Tehran who impersonated beloved filmmaker Mohsen Makhmalbaf on a bus.",
    icon: "clapper",
  },
  {
    title: "La Haine",
    year: 1995,
    director: "Mathieu Kassovitz",
    country: "France",
    genre: "Crime / Drama",
    where: "Criterion Channel / Kanopy",
    mins: 98,
    imdb: 8.1,
    recommendedBy: "Emma Stevenson",
    blurb: "Twenty-four ticking hours in the lives of three young friends—Vinz, Saïd, and Hubert—from the suburban Paris banlieues in the aftermath of a violent police riot.",
    icon: "clock",
  },
  {
    title: "Do the Right Thing",
    year: 1989,
    director: "Spike Lee",
    country: "USA",
    genre: "Drama",
    where: "Criterion Channel / Peacock",
    mins: 120,
    imdb: 8.0,
    recommendedBy: "Very Good Films",
    blurb: "On the hottest day of the summer on a single block in Bedford-Stuyvesant, Brooklyn, simmering racial tensions around Sal's Famous Pizzeria reach a boiling point.",
    icon: "sun",
  },
  {
    title: "Drive My Car",
    year: 2021,
    director: "Ryusuke Hamaguchi",
    country: "Japan",
    genre: "Drama",
    where: "Max / Criterion Channel",
    mins: 179,
    imdb: 7.5,
    recommendedBy: "Beth Wilkinson",
    blurb: "A grieving stage actor and director travels to Hiroshima to mount a multilingual production of Uncle Vanya and forms a quiet bond with the young woman assigned to drive his red Saab 900.",
    icon: "key",
  },
  {
    title: "Past Lives",
    year: 2023,
    director: "Celine Song",
    country: "USA / South Korea",
    genre: "Drama / Romance",
    where: "Paramount+ / Netflix",
    mins: 106,
    imdb: 7.8,
    recommendedBy: "Emma Stevenson",
    blurb: "Nora and Hae Sung, two deeply connected childhood sweethearts in Seoul, are separated when Nora's family emigrates—and reunite twenty-four years later for one fateful week in New York.",
    icon: "heart",
  },
  {
    title: "Daisies (Sedmikrásky)",
    year: 1966,
    director: "Věra Chytilová",
    country: "Czechoslovakia",
    genre: "Avant-Garde / Comedy",
    where: "Criterion Channel",
    mins: 76,
    imdb: 7.4,
    recommendedBy: "Very Good Films",
    blurb: "Deciding that because the world is spoiled they will be spoiled too, two young women named Marie embark on a joyful, anarchic, collage-tinted spree of pranks and banquets.",
    icon: "cake",
  },
  {
    title: "Paterson",
    year: 2016,
    director: "Jim Jarmusch",
    country: "USA",
    genre: "Drama",
    where: "Prime Video",
    mins: 118,
    imdb: 7.3,
    recommendedBy: "Beth Wilkinson",
    blurb: "Seven quiet days in the life of a bus driver named Paterson in Paterson, New Jersey, who writes unrhymed poetry in a secret notebook before his shift each morning.",
    icon: "pen",
  },
  {
    title: "Columbus",
    year: 2017,
    director: "Kogonada",
    country: "USA",
    genre: "Drama",
    where: "Kanopy / Criterion Channel",
    mins: 104,
    imdb: 7.2,
    recommendedBy: "Emma Stevenson",
    blurb: "Stranded in Columbus, Indiana—a Midwest mecca of modernist architecture—a translator and a young library worker who loves buildings find solace in symmetry and conversation.",
    icon: "building",
  },
  {
    title: "Perfect Days",
    year: 2023,
    director: "Wim Wenders",
    country: "Japan",
    genre: "Drama",
    where: "Hulu / MUBI",
    mins: 124,
    imdb: 7.9,
    recommendedBy: "Beth Wilkinson",
    blurb: "Hirayama is utterly content with his simple life cleaning Tokyo's architectural public toilets, listening to Lou Reed and Nina Simone on cassette, and photographing sunlight through trees.",
    icon: "leaf",
  },
  {
    title: "The Florida Project",
    year: 2017,
    director: "Sean Baker",
    country: "USA",
    genre: "Drama",
    where: "Max / Kanopy",
    mins: 111,
    imdb: 7.6,
    recommendedBy: "Emma Stevenson",
    blurb: "Precocious six-year-old Moonee and her ragtag friends spend a boundless summer in the shadow of Walt Disney World while her twenty-two-year-old mother fights to keep a roof over their lilac motel room.",
    icon: "house",
  },
  {
    title: "High and Low",
    year: 1963,
    director: "Akira Kurosawa",
    country: "Japan",
    genre: "Crime / Thriller",
    where: "Criterion Channel / Max",
    mins: 143,
    imdb: 8.4,
    recommendedBy: "Very Good Films",
    blurb: "A Yokohama shoe-company executive facing a boardroom buyout learns that kidnappers aiming for his son have mistakenly abducted his chauffeur's boy—and still demand his entire fortune.",
    icon: "briefcase",
  },
  {
    title: "Koyaanisqatsi",
    year: 1982,
    director: "Godfrey Reggio",
    country: "USA",
    genre: "Documentary / Experimental",
    where: "MGM+ / Prime Video",
    mins: 86,
    imdb: 8.2,
    recommendedBy: "Very Good Films",
    blurb: "Wordless slow-motion and time-lapse visions of untouched canyons, assembly lines, and urban gridlock propelled by Philip Glass's hypnotic minimalist score.",
    icon: "globe",
  },
  {
    title: "Moonlight",
    year: 2016,
    director: "Barry Jenkins",
    country: "USA",
    genre: "Drama",
    where: "Max / Kanopy",
    mins: 111,
    imdb: 7.4,
    recommendedBy: "Emma Stevenson",
    blurb: "Three defining chapters in the life of Chiron—Little, Chiron, and Black—growing up in Liberty City, Miami, searching for tenderness, identity, and home.",
    icon: "moon",
  },
  {
    title: "The Red Shoes",
    year: 1948,
    director: "Michael Powell & Emeric Pressburger",
    country: "UK",
    genre: "Drama / Romance",
    where: "Criterion Channel / Max",
    mins: 135,
    imdb: 8.1,
    recommendedBy: "Beth Wilkinson",
    blurb: "A young prima ballerina is torn between the obsessive impresario of Ballet Lermontov and the composer she loves, in Technicolor of almost supernatural intensity.",
    icon: "crown",
  },
  {
    title: "Burning",
    year: 2018,
    director: "Lee Chang-dong",
    country: "South Korea",
    genre: "Mystery / Drama",
    where: "Netflix / Peacock / Kanopy",
    mins: 148,
    imdb: 7.5,
    recommendedBy: "Very Good Films",
    blurb: "Adapted from a Haruki Murakami short story, an aspiring novelist watches his childhood friend's cat—until she returns from Africa with a wealthy stranger who confesses a strange hobby.",
    icon: "flame",
  },
];

function stripHtml(raw: string): string {
  return raw
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&#8217;|&#039;|&rsquo;/gi, "’")
    .replace(/&#8220;|&ldquo;/gi, "“")
    .replace(/&#8221;|&rdquo;/gi, "”")
    .replace(/&#8211;|&ndash;/gi, "–")
    .replace(/&quot;/gi, '"')
    .replace(/\s+/g, " ")
    .trim();
}

export function rawVgfToChannelItem(
  entry: RawVgfEntry,
  index: number
): ChannelMediaItem {
  const { lang, langFlag } = resolveCountryMeta(entry.country, entry.lang);
  const mins = entry.mins || 105;
  const hours = +(mins / 60).toFixed(1);
  const recTag = entry.recommendedBy
    ? `Recommended by ${entry.recommendedBy}`
    : `Origin: ${entry.country || "International"}`;

  return {
    kind: "vgf",
    id: entry.id || slugifyVgfId(entry.title, entry.year),
    rank: index + 1,
    title: entry.title,
    year: entry.year,
    start: entry.year || 2020,
    director: entry.director || "Curated Selection",
    where: entry.where || "Criterion / Kanopy",
    genre: entry.genre || "Drama",
    imdb: entry.imdb || 7.8,
    icon: entry.icon || MOTIF_POOL[index % MOTIF_POOL.length],
    blurb: entry.blurb,
    mins,
    hours,
    sub: `${entry.country} · ${recTag}`,
    lang,
    langFlag: entry.langFlag || langFlag,
  };
}

/**
 * Parse WordPress REST API posts/films JSON from verygoodfilms.co
 */
export function parseVeryGoodFilmsWpJson(items: unknown[]): RawVgfEntry[] {
  if (!Array.isArray(items)) return [];
  const results: RawVgfEntry[] = [];

  for (const raw of items) {
    if (!raw || typeof raw !== "object") continue;
    const post = raw as Record<string, any>;
    const rawTitle =
      typeof post.title === "string"
        ? post.title
        : typeof post.title?.rendered === "string"
        ? stripHtml(post.title.rendered)
        : "";
    if (!rawTitle) continue;

    const acf = (post.acf || post.meta || {}) as Record<string, any>;
    const contentText = stripHtml(
      post.content?.rendered || post.excerpt?.rendered || acf.synopsis || acf.description || ""
    );

    // Extract year if embedded in title e.g. "Mid90s (2018)"
    const yearMatch =
      String(acf.year || acf.release_year || "").match(/\b(19\d{2}|20\d{2})\b/) ||
      rawTitle.match(/\(?(19\d{2}|20\d{2})\)?/) ||
      contentText.match(/\b(19\d{2}|20\d{2})\b/);
    const year = yearMatch ? parseInt(yearMatch[1], 10) : 2020;
    const cleanTitle = rawTitle.replace(/\s*\((?:19|20)\d{2}\)\s*$/, "").trim();

    const director =
      stripHtml(String(acf.director || acf.directed_by || "")) ||
      contentText.match(/Directed by\s+([^.,\n]+)/i)?.[1]?.trim() ||
      "Very Good Films Pick";

    const country =
      stripHtml(String(acf.country || acf.origin || "")) ||
      contentText.match(/Country:\s*([^.,\n]+)/i)?.[1]?.trim() ||
      "International";

    const genre =
      stripHtml(String(acf.genre || acf.category || "")) ||
      contentText.match(/Genre:\s*([^.,\n]+)/i)?.[1]?.trim() ||
      "Arthouse / Indie";

    const where =
      stripHtml(String(acf.where_to_watch || acf.watch || acf.stream || "")) ||
      "Criterion / Kanopy / VOD";

    const recommendedBy =
      stripHtml(String(acf.recommended_by || acf.curator || "")) ||
      contentText.match(/Recommended by\s+([^.,\n]+)/i)?.[1]?.trim() ||
      "Very Good Films";

    results.push({
      title: cleanTitle,
      year,
      director,
      country,
      genre,
      where,
      recommendedBy,
      blurb:
        contentText.slice(0, 320) ||
        `Hand-picked recommendation on Very Good Films (${country}, ${year}).`,
      sourceUrl: typeof post.link === "string" ? post.link : "https://verygoodfilms.co/",
    });
  }

  return results;
}

/**
 * Parse verygoodfilms.co HTML catalogue (table rows, film blocks, or embedded JSON)
 */
export function parseVeryGoodFilmsHtml(html: string): RawVgfEntry[] {
  if (!html) return [];
  const results: RawVgfEntry[] = [];
  const seenKeys = new Set<string>();

  const pushUnique = (entry: RawVgfEntry) => {
    const clean = entry.title.trim();
    if (!clean || clean.length < 2) return;
    if (/^(title|film|movie|director|year|country|genre|search|filter|about|submit)$/i.test(clean)) {
      return;
    }
    const key = `${clean.toLowerCase()}_${entry.year || ""}`;
    if (seenKeys.has(key)) return;
    seenKeys.add(key);
    results.push(entry);
  };

  // Strategy 1: Table rows or structured data-attributes
  const rowRegex = /<(?:tr|article|li|div)[^>]*class=["'][^"']*(?:film|movie|catalogue-item|post-item|row-item)[^"']*["'][^>]*>([\s\S]*?)<\/(?:tr|article|li|div)>/gi;
  let match: RegExpExecArray | null;
  while ((match = rowRegex.exec(html)) !== null) {
    const block = match[1];
    const titleMatch =
      block.match(/class=["'][^"']*title[^"']*["'][^>]*>([\s\S]*?)<\//i) ||
      block.match(/<h[234][^>]*>([\s\S]*?)<\/h[234]>/i);
    if (!titleMatch) continue;

    const title = stripHtml(titleMatch[1]);
    const yearMatch =
      block.match(/class=["'][^"']*year[^"']*["'][^>]*>\s*(19\d{2}|20\d{2})/i) ||
      block.match(/\b(19\d{2}|20\d{2})\b/);
    const directorMatch =
      block.match(/class=["'][^"']*director[^"']*["'][^>]*>([\s\S]*?)<\//i) ||
      block.match(/Directed by[:\s]*([^<\n]+)/i);
    const countryMatch =
      block.match(/class=["'][^"']*country[^"']*["'][^>]*>([\s\S]*?)<\//i) ||
      block.match(/Country[:\s]*([^<\n]+)/i);
    const genreMatch =
      block.match(/class=["'][^"']*genre[^"']*["'][^>]*>([\s\S]*?)<\//i) ||
      block.match(/Genre[:\s]*([^<\n]+)/i);
    const whereMatch =
      block.match(/class=["'][^"']*(?:watch|stream)[^"']*["'][^>]*>([\s\S]*?)<\//i);
    const recMatch =
      block.match(/Recommended by[:\s]*([^<\n]+)/i);
    const pMatch = block.match(/<p[^>]*>([\s\S]*?)<\/p>/i);

    const year = yearMatch ? parseInt(yearMatch[1], 10) : 2020;
    const director = directorMatch ? stripHtml(directorMatch[1]) : "Curated Selection";
    const country = countryMatch ? stripHtml(countryMatch[1]) : "International";
    const genre = genreMatch ? stripHtml(genreMatch[1]) : "Drama";
    const where = whereMatch ? stripHtml(whereMatch[1]) : "Criterion / Kanopy";
    const recommendedBy = recMatch ? stripHtml(recMatch[1]) : "Very Good Films";
    const blurb = pMatch
      ? stripHtml(pMatch[1]).slice(0, 320)
      : `Hand-picked recommendation on Very Good Films, directed by ${director} (${year}).`;

    pushUnique({
      title,
      year,
      director,
      country,
      genre,
      where,
      recommendedBy,
      blurb,
    });
  }

  return results;
}

/**
 * Merge live-fetched Very Good Films entries with the curated seed list so
 * newly discovered entries appear first and every entry has a stable ID.
 */
export function buildVeryGoodFilmsCatalog(
  liveEntries: RawVgfEntry[] = []
): ChannelMediaItem[] {
  const merged: RawVgfEntry[] = [];
  const seen = new Set<string>();

  for (const item of [...liveEntries, ...VERY_GOOD_FILMS_SEED]) {
    const key = item.title
      .toLowerCase()
      .replace(/\s*\([^)]*\)\s*/g, "")
      .replace(/[^a-z0-9]/g, "");
    if (!key || seen.has(key)) continue;
    seen.add(key);
    merged.push(item);
  }

  return merged.map((entry, idx) => rawVgfToChannelItem(entry, idx));
}

export const INITIAL_VGF_ITEMS: ChannelMediaItem[] = buildVeryGoodFilmsCatalog();
