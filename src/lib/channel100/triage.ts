export type TriageTime = "20m" | "45m" | "2h" | "binge";
export type TriageEnergy = "brain-off" | "rollercoaster" | "intellectual" | "adrenaline";
export type TriageContext = "solo" | "duo" | "crowd";

export interface TriagePick {
  id: string;
  title: string;
  year: number;
  kind: "series" | "film" | "anime" | "mini-series" | "documentary";
  lang: string;
  langFlag: string;
  runtime: string;
  genre: string;
  where: string;
  ratingScore: string;
  tagline: string;
  hook: string;
  whyThisFits: string;
  color: string;
  matchedFromWatchlist?: boolean;
}

export interface TriageResponse {
  prescription: TriagePick;
  alternatives: TriagePick[];
  source: "ai" | "curated";
}

export const TRIAGE_TIME_OPTIONS = [
  {
    id: "20m" as TriageTime,
    label: "20–25 Min",
    badge: "QUICK BITE",
    desc: "Eating a meal, short break, lunch hour, fast comedy or anime episode",
    icon: "⏱️",
  },
  {
    id: "45m" as TriageTime,
    label: "45–60 Min",
    badge: "PRESTIGE HOUR",
    desc: "Meaty standalone TV episode, peak drama, prime-time chapter",
    icon: "📺",
  },
  {
    id: "2h" as TriageTime,
    label: "~2 Hours",
    badge: "FEATURE FILM",
    desc: "Complete cinematic journey, start-to-finish movie night",
    icon: "🎬",
  },
  {
    id: "binge" as TriageTime,
    label: "3+ Hours",
    badge: "BINGE MARATHON",
    desc: "Weekend deep dive, can't stop watching, total rabbit hole",
    icon: "🍿",
  },
];

export const TRIAGE_ENERGY_OPTIONS = [
  {
    id: "brain-off" as TriageEnergy,
    label: "Brain-Off Comfort",
    badge: "ZERO FRICTION",
    desc: "Exhausted after a long day. Wholesome laughs, comforting, easy watching",
    icon: "🛋️",
  },
  {
    id: "rollercoaster" as TriageEnergy,
    label: "Emotional Rollercoaster",
    badge: "FEEL SOMETHING",
    desc: "Cathartic tearjerker, intense human depth, poignant empathy and beauty",
    icon: "🎢",
  },
  {
    id: "intellectual" as TriageEnergy,
    label: "Intellectual Intrigue",
    badge: "MIND-BENDER",
    desc: "Complex puzzle-box, existential sci-fi, philosophical questions, psychological noir",
    icon: "🧠",
  },
  {
    id: "adrenaline" as TriageEnergy,
    label: "Pure Adrenaline",
    badge: "HIGH OCTANE",
    desc: "Edge-of-your-seat thriller, breathless momentum, pulse-pounding stakes",
    icon: "⚡",
  },
];

export const TRIAGE_CONTEXT_OPTIONS = [
  {
    id: "solo" as TriageContext,
    label: "Solo Deep-Dive",
    badge: "TOTAL IMMERSION",
    desc: "Headphones on, subtitles welcomed, weird or uncompromising masterpiece",
    icon: "🎧",
  },
  {
    id: "duo" as TriageContext,
    label: "Date Night / Duo",
    badge: "ENGROSSING PAIR",
    desc: "Great for two people, romantic, conversation-starter, impossible to look away",
    icon: "🍷",
  },
  {
    id: "crowd" as TriageContext,
    label: "Friends & Crowd Pleaser",
    badge: "HIGH ENERGY",
    desc: "Group hangout, communal gasps or laughs, accessible, high crowd-satisfaction",
    icon: "🍿",
  },
];

export const CURATED_TRIAGE_DATABASE: Array<{
  times: TriageTime[];
  energies: TriageEnergy[];
  contexts: TriageContext[];
  pick: TriagePick;
}> = [
  // 1. RRR
  {
    times: ["2h", "binge"],
    energies: ["adrenaline", "brain-off"],
    contexts: ["crowd", "duo"],
    pick: {
      id: "triage_rrr",
      title: "RRR",
      year: 2022,
      kind: "film",
      lang: "Telugu",
      langFlag: "🇮🇳",
      runtime: "182 mins",
      genre: "Action / Historical Epic",
      where: "Netflix",
      ratingScore: "8.8/10 IMDb · 95% RT",
      tagline: "Fire and Water collide in the wildest cinematic spectacle of the decade.",
      hook: "A fearless warrior on a perilous mission confronts an iron-willed British cop in 1920s India.",
      whyThisFits: "Pure unadulterated cinematic adrenaline built for crowd viewing with gravity-defying setpieces.",
      color: "#F5C518",
    },
  },
  // 2. Severance
  {
    times: ["45m", "binge"],
    energies: ["intellectual", "adrenaline"],
    contexts: ["solo", "duo"],
    pick: {
      id: "triage_severance",
      title: "Severance",
      year: 2022,
      kind: "series",
      lang: "English",
      langFlag: "🇺🇸",
      runtime: "48–56m per ep",
      genre: "Sci-Fi / Psychological Thriller",
      where: "Apple TV+",
      ratingScore: "8.7/10 IMDb · 97% RT",
      tagline: "Your work self has no idea who you are at home.",
      hook: "Employees at Lumon undergo a surgical procedure that splits their memories between work and personal lives.",
      whyThisFits: "Brilliant, razor-sharp puzzle-box mystery that grips your intellect and refuses to let go.",
      color: "#3CC4DE",
    },
  },
  // 3. Parasite
  {
    times: ["2h"],
    energies: ["intellectual", "rollercoaster", "adrenaline"],
    contexts: ["solo", "duo", "crowd"],
    pick: {
      id: "triage_parasite",
      title: "Parasite",
      year: 2019,
      kind: "film",
      lang: "Korean",
      langFlag: "🇰🇷",
      runtime: "132 mins",
      genre: "Black Comedy / Thriller",
      where: "Max / Hulu",
      ratingScore: "8.5/10 IMDb · 99% RT",
      tagline: "Act like you own the place until the doorbell rings.",
      hook: "Greed and class discrimination threaten the newly formed symbiotic relationship between the wealthy Park family and the destitute Kim clan.",
      whyThisFits: "Masterclass in pacing, unpredictable tonal shifts, and jaw-dropping social commentary.",
      color: "#3DBE6A",
    },
  },
  // 4. Bocchi the Rock!
  {
    times: ["20m"],
    energies: ["brain-off"],
    contexts: ["solo", "duo"],
    pick: {
      id: "triage_bocchi",
      title: "Bocchi the Rock!",
      year: 2022,
      kind: "anime",
      lang: "Japanese",
      langFlag: "🇯🇵",
      runtime: "23m per ep",
      genre: "Comedy / Music",
      where: "Crunchyroll",
      ratingScore: "8.8/10 IMDb · 98% MAL",
      tagline: "Severe social anxiety meets explosive indie rock.",
      hook: "An agonizingly shy guitar prodigy gets pulled into an indie girl-rock band and faces the terrifying world of social interaction.",
      whyThisFits: "Effortlessly hilarious, wildly inventive visual gags, and total feel-good comfort for tired brains.",
      color: "#E4509E",
    },
  },
  // 5. Dark
  {
    times: ["45m", "binge"],
    energies: ["intellectual"],
    contexts: ["solo"],
    pick: {
      id: "triage_dark",
      title: "Dark",
      year: 2017,
      kind: "series",
      lang: "German",
      langFlag: "🇩🇪",
      runtime: "52m per ep",
      genre: "Sci-Fi / Mystery Noir",
      where: "Netflix",
      ratingScore: "8.7/10 IMDb · 95% RT",
      tagline: "The question isn't where... but when.",
      hook: "A missing child sets four families on a frantic hunt for answers across three generations of a tangled time loop.",
      whyThisFits: "The ultimate solo intellectual deep dive—peerless atmospheric dread and tight temporal mechanics.",
      color: "#3F6BF0",
    },
  },
  // 6. Fleabag
  {
    times: ["20m"],
    energies: ["rollercoaster", "brain-off"],
    contexts: ["solo", "duo"],
    pick: {
      id: "triage_fleabag",
      title: "Fleabag",
      year: 2016,
      kind: "series",
      lang: "English",
      langFlag: "🇬🇧",
      runtime: "25m per ep",
      genre: "Comedy / Drama",
      where: "Prime Video",
      ratingScore: "8.7/10 IMDb · 100% RT",
      tagline: "A dry-witted woman with no filter tries to cope with grief.",
      hook: "A riotous and poignant window into the mind of a London woman navigating modern life while looking straight into the camera lens.",
      whyThisFits: "Crackling wit delivered in 25-minute doses that oscillates between laugh-out-loud humor and raw heartbreak.",
      color: "#EF4A3A",
    },
  },
  // 7. Anatomy of a Fall
  {
    times: ["2h"],
    energies: ["intellectual", "rollercoaster"],
    contexts: ["duo", "solo"],
    pick: {
      id: "triage_anatomy",
      title: "Anatomy of a Fall",
      year: 2023,
      kind: "film",
      lang: "French / English",
      langFlag: "🇫🇷",
      runtime: "151 mins",
      genre: "Courtroom Drama / Psychological",
      where: "Hulu / Rent",
      ratingScore: "7.7/10 IMDb · 96% RT",
      tagline: "Did he jump, or was he pushed?",
      hook: "A woman is suspected of her husband's murder, and their blind son faces a moral dilemma as the sole witness in a French alpine chalet.",
      whyThisFits: "Riveting dissective drama that sparks endless discussion for date night or focused solo contemplation.",
      color: "#F5C518",
    },
  },
  // 8. Frieren: Beyond Journey's End
  {
    times: ["20m", "45m"],
    energies: ["rollercoaster", "brain-off", "intellectual"],
    contexts: ["solo", "duo"],
    pick: {
      id: "triage_frieren",
      title: "Frieren: Beyond Journey's End",
      year: 2023,
      kind: "anime",
      lang: "Japanese",
      langFlag: "🇯🇵",
      runtime: "24m per ep",
      genre: "Fantasy / Drama / Adventure",
      where: "Crunchyroll / Netflix",
      ratingScore: "8.9/10 IMDb · #1 MyAnimeList",
      tagline: "What happens after the Demon King is already defeated?",
      hook: "An elf mage who outlives her mortal companions embarks on a quiet journey across the continent to learn what human connection truly meant.",
      whyThisFits: "Breathtakingly gorgeous animation with a meditative tempo and profound emotional warmth.",
      color: "#3CC4DE",
    },
  },
  // 9. I Think You Should Leave
  {
    times: ["20m"],
    energies: ["brain-off"],
    contexts: ["crowd", "duo", "solo"],
    pick: {
      id: "triage_itysl",
      title: "I Think You Should Leave with Tim Robinson",
      year: 2019,
      kind: "series",
      lang: "English",
      langFlag: "🇺🇸",
      runtime: "16–18m per ep",
      genre: "Sketch Comedy",
      where: "Netflix",
      ratingScore: "8.0/10 IMDb · 96% RT",
      tagline: "When someone refuses to admit they made a mistake.",
      hook: "Absurd, high-decibel sketch comedy exploring social embarrassment and people who violently double down.",
      whyThisFits: "Zero brainpower required. Uncontrollable laughter and quote machine for movie night or unwinding.",
      color: "#EF4A3A",
    },
  },
  // 10. Shōgun
  {
    times: ["45m", "binge"],
    energies: ["adrenaline", "intellectual"],
    contexts: ["duo", "solo"],
    pick: {
      id: "triage_shogun",
      title: "Shōgun",
      year: 2024,
      kind: "mini-series",
      lang: "Japanese / English",
      langFlag: "🇯🇵",
      runtime: "58m per ep",
      genre: "Historical Epic / Political Intrigue",
      where: "Hulu / Disney+",
      ratingScore: "8.7/10 IMDb · 99% RT",
      tagline: "Destiny is a beast you cannot steer, only ride.",
      hook: "In 1600 Japan at the dawn of a century-defining civil war, Lord Toranaga fights for his life as an English ship washes ashore.",
      whyThisFits: "Rich political chess matches, lavish production design, and gripping tension tailored for prestige viewing.",
      color: "#F5C518",
    },
  },
  // 11. Mad Max: Fury Road
  {
    times: ["2h"],
    energies: ["adrenaline"],
    contexts: ["crowd", "solo", "duo"],
    pick: {
      id: "triage_madmax",
      title: "Mad Max: Fury Road",
      year: 2015,
      kind: "film",
      lang: "English",
      langFlag: "🇦🇺",
      runtime: "120 mins",
      genre: "Action / Post-Apocalyptic",
      where: "Max / Rent",
      ratingScore: "8.1/10 IMDb · 97% RT",
      tagline: "What a lovely day.",
      hook: "In a post-apocalyptic wasteland, a woman rebels against a tyrannical ruler in search for her homeland with the aid of a group of female prisoners.",
      whyThisFits: "Non-stop kinetic poetry and peerless stunt work from minute one to the final frame.",
      color: "#F5C518",
    },
  },
  // 12. Past Lives
  {
    times: ["2h"],
    energies: ["rollercoaster"],
    contexts: ["duo", "solo"],
    pick: {
      id: "triage_pastlives",
      title: "Past Lives",
      year: 2023,
      kind: "film",
      lang: "Korean / English",
      langFlag: "🇰🇷",
      runtime: "106 mins",
      genre: "Romance / Drama",
      where: "Paramount+ / Rent",
      ratingScore: "7.8/10 IMDb · 96% RT",
      tagline: "Two childhood sweethearts across twenty-four years of what-ifs.",
      hook: "Nora and Hae Sung, two deeply connected childhood friends, are wrested apart after Nora's family emigrates from South Korea, reuniting decades later.",
      whyThisFits: "Heart-achingly subtle and deeply romantic—the quintessential duo / date-night emotional journey.",
      color: "#E4509E",
    },
  },
  // 13. The Bear
  {
    times: ["20m", "45m"],
    energies: ["adrenaline", "rollercoaster"],
    contexts: ["solo", "duo"],
    pick: {
      id: "triage_thebear",
      title: "The Bear",
      year: 2022,
      kind: "series",
      lang: "English",
      langFlag: "🇺🇸",
      runtime: "30–40m per ep",
      genre: "Drama / Comedy",
      where: "Hulu / Disney+",
      ratingScore: "8.6/10 IMDb · 99% RT",
      tagline: "Every second counts.",
      hook: "A fine-dining young chef returns to Chicago to run his family Italian beef sandwich shop after a tragic suicide in his family.",
      whyThisFits: "Intense kitchen chaos, sublime needle drops, and unforgettable emotional payoffs.",
      color: "#3CC4DE",
    },
  },
  // 14. Memories of Murder
  {
    times: ["2h"],
    energies: ["intellectual", "adrenaline"],
    contexts: ["solo", "duo"],
    pick: {
      id: "triage_memories",
      title: "Memories of Murder",
      year: 2003,
      kind: "film",
      lang: "Korean",
      langFlag: "🇰🇷",
      runtime: "132 mins",
      genre: "Crime / Noir Mystery",
      where: "Criterion / Rent",
      ratingScore: "8.1/10 IMDb · 95% RT",
      tagline: "In 1986, a small Korean province was shaken by its first serial killer.",
      hook: "Two mismatched detectives in a rural Korean town fumble and fight against a phantom killer in Bong Joon-ho's breakthrough masterpiece.",
      whyThisFits: "Atmospheric, gripping detective noir that rewards close attention and lingers in the head for days.",
      color: "#3F6BF0",
    },
  },
  // 15. Derry Girls
  {
    times: ["20m"],
    energies: ["brain-off"],
    contexts: ["duo", "crowd", "solo"],
    pick: {
      id: "triage_derrygirls",
      title: "Derry Girls",
      year: 2018,
      kind: "series",
      lang: "English / Irish",
      langFlag: "🇮🇪",
      runtime: "22m per ep",
      genre: "Comedy / Coming-of-Age",
      where: "Netflix",
      ratingScore: "8.3/10 IMDb · 99% RT",
      tagline: "Growing up in Northern Ireland during the Troubles.",
      hook: "Five high school students attend an all-girls Catholic school in 1990s Derry, getting into outrageous trouble at every turn.",
      whyThisFits: "Lightning-fast banter, incredible heart, and instant mood-booster for anyone needing an uplifting laugh.",
      color: "#3DBE6A",
    },
  },
  // 16. Succession
  {
    times: ["45m", "binge"],
    energies: ["intellectual", "adrenaline"],
    contexts: ["duo", "solo"],
    pick: {
      id: "triage_succession",
      title: "Succession",
      year: 2018,
      kind: "series",
      lang: "English",
      langFlag: "🇺🇸",
      runtime: "60m per ep",
      genre: "Drama / Satire",
      where: "Max",
      ratingScore: "8.9/10 IMDb · 95% RT",
      tagline: "Blood, money, and the battle for an empire.",
      hook: "The Roy family is known for controlling the biggest media and entertainment company in the world. However, their world changes when their aging father steps down from the company.",
      whyThisFits: "Shakespearean family warfare and viciously hilarious dialogue that keeps you hooked episode after episode.",
      color: "#F5C518",
    },
  },
  // 17. Portrait of a Lady on Fire
  {
    times: ["2h"],
    energies: ["rollercoaster", "intellectual"],
    contexts: ["solo", "duo"],
    pick: {
      id: "triage_portrait",
      title: "Portrait of a Lady on Fire",
      year: 2019,
      kind: "film",
      lang: "French",
      langFlag: "🇫🇷",
      runtime: "122 mins",
      genre: "Romance / Drama",
      where: "Hulu / Criterion Channel",
      ratingScore: "8.1/10 IMDb · 98% RT",
      tagline: "Do all lovers feel as though they're inventing something?",
      hook: "On an isolated island in Brittany at the end of the eighteenth century, a female painter is commissioned to paint a wedding portrait of a reluctant young woman.",
      whyThisFits: "Visually ravishing, quiet, and profoundly moving—every frame looks like an oil painting.",
      color: "#E4509E",
    },
  },
  // 18. Chernobyl
  {
    times: ["45m", "binge"],
    energies: ["adrenaline", "intellectual", "rollercoaster"],
    contexts: ["solo", "duo"],
    pick: {
      id: "triage_chernobyl",
      title: "Chernobyl",
      year: 2019,
      kind: "mini-series",
      lang: "English",
      langFlag: "🇺🇦",
      runtime: "60m per ep (5 eps total)",
      genre: "Historical Drama / Thriller",
      where: "Max",
      ratingScore: "9.3/10 IMDb · 96% RT",
      tagline: "What is the cost of lies?",
      hook: "In April 1986, an explosion at the Chernobyl nuclear power plant in the Union of Soviet Socialist Republics becomes one of the world's worst man-made catastrophes.",
      whyThisFits: "Unflinching, claustrophobic suspense and historical integrity that plays out like an apocalypse in slow motion.",
      color: "#3DBE6A",
    },
  },
];

export function getCuratedTriage(
  time: TriageTime,
  energy: TriageEnergy,
  context: TriageContext,
  excludeIds: string[] = []
): { prescription: TriagePick; alternatives: TriagePick[] } {
  // Score candidates based on match
  const scored = CURATED_TRIAGE_DATABASE.map((item) => {
    let score = 0;
    if (item.times.includes(time)) score += 3;
    if (item.energies.includes(energy)) score += 3;
    if (item.contexts.includes(context)) score += 2;
    if (excludeIds.includes(item.pick.id)) score -= 10;
    return { ...item, score };
  });

  scored.sort((a, b) => b.score - a.score);

  const prescription = scored[0]?.pick || CURATED_TRIAGE_DATABASE[0].pick;
  const alt1 = scored[1]?.pick || CURATED_TRIAGE_DATABASE[1].pick;
  const alt2 = scored[2]?.pick || CURATED_TRIAGE_DATABASE[2].pick;

  return {
    prescription,
    alternatives: [alt1, alt2],
  };
}
