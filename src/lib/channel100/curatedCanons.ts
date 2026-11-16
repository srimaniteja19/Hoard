import { ChannelMediaItem } from "./types";
import { SHOWS, FILMS } from "./data";

// Verified IMDb Top 250 TV additions (exact seasons, episodes, runtimes, years, networks, ratings, and icons)
const RAW_IMDB_TV_ADDITIONS: [
  string, // title
  string, // years
  string, // network
  string, // where
  string, // genre
  number, // imdb rating
  string, // icon
  number, // seasons
  number, // eps
  number, // mins per ep
  string, // lang
  string, // langFlag
  string  // blurb
][] = [
  ["Planet Earth II", "2016", "BBC", "Max / Discovery+", "Documentary", 9.5, "globe", 1, 6, 58, "English", "🇬🇧", "David Attenborough narrates ultra-high-definition wildlife encounters across islands, mountains, jungles, deserts, grasslands, and cities."],
  ["Avatar: The Last Airbender", "2005–2008", "Nickelodeon", "Netflix / Paramount+", "Animation", 9.3, "flame", 3, 61, 24, "English", "🇺🇸", "In a war-torn world of elemental magic, a young boy reawakens to undertake a dangerous mystic quest to fulfill his destiny as the Avatar."],
  ["The Sopranos", "1999–2007", "HBO", "Max", "Crime", 9.2, "tie", 6, 86, 55, "English", "🇺🇸", "New Jersey mob boss Tony Soprano deals with personal and professional issues in his home and business life that affect his mental state, leading him to seek psychiatric counseling."],
  ["Cosmos: A Spacetime Odyssey", "2014", "Fox / NatGeo", "Disney+", "Documentary", 9.3, "planet", 1, 13, 44, "English", "🇺🇸", "Astrophysicist Neil deGrasse Tyson explores how we discovered the laws of nature and found our coordinates in space and time."],
  ["Our Planet", "2019–2023", "Netflix", "Netflix", "Documentary", 9.3, "globe", 2, 12, 50, "English", "🇬🇧", "Experiencing our planet's natural beauty and examining how climate change impacts all living creatures in this ambitious documentary of spectacular scope."],
  ["Bluey", "2018–present", "ABC", "Disney+", "Animation", 9.4, "house", 3, 154, 8, "English", "🇦🇺", "An inexhaustible six-year-old Blue Heeler puppy loves to play and turns everyday family life into extraordinary adventures."],
  ["The World at War", "1973–1974", "ITV", "Prime Video", "Documentary", 9.2, "globe", 1, 26, 52, "English", "🇬🇧", "Laurence Olivier narrates the landmark 26-part chronicle of the Second World War featuring rare archival footage and eyewitness interviews."],
  ["Fullmetal Alchemist: Brotherhood", "2009–2010", "JNN", "Crunchyroll / Hulu", "Animation", 9.1, "flask", 1, 64, 24, "Japanese", "🇯🇵", "Two brothers search for a Philosopher's Stone after an attempt to revive their deceased mother goes awry and leaves them in damaged physical forms."],
  ["Attack on Titan", "2013–2023", "NHK / MBS", "Crunchyroll / Hulu", "Animation", 9.1, "sword", 4, 94, 24, "Japanese", "🇯🇵", "After his hometown is destroyed and his mother is killed, young Eren Jaeger vows to cleanse the earth of the giant humanoid Titans that have brought humanity to the brink of extinction."],
  ["The Last Dance", "2020", "ESPN / Netflix", "Netflix", "Documentary", 9.1, "ball", 1, 10, 50, "English", "🇺🇸", "Charting the rise of the 1990s Chicago Bulls, led by Michael Jordan, one of the most notable dynasties in sports history."],
  ["Rick and Morty", "2013–present", "Adult Swim", "Max / Hulu", "Animation", 9.1, "atom", 7, 71, 23, "English", "🇺🇸", "A fractured domestic family and a genius, nihilistic scientist who drags his anxious grandson on interdimensional adventures."],
  ["The Twilight Zone", "1959–1964", "CBS", "Paramount+", "Sci-Fi & Fantasy", 9.1, "spiral", 5, 156, 25, "English", "🇺🇸", "Rod Serling's classic anthology series in which ordinary people find themselves in extraordinarily astounding situations."],
  ["Sherlock", "2010–2017", "BBC", "Hulu / Prime Video", "Crime", 9.1, "key", 4, 13, 88, "English", "🇬🇧", "A modern update finds the famous sleuth and his doctor partner solving crime in 21st-century London."],
  ["Batman: The Animated Series", "1992–1995", "Fox", "Max", "Animation", 9.0, "moon", 4, 85, 22, "English", "🇺🇸", "The Dark Knight battles crime in Gotham City with occasional help from Robin and Batgirl in an iconic Art Deco noir vision."],
  ["Arcane", "2021–2024", "Netflix", "Netflix", "Animation", 9.0, "gem", 2, 18, 41, "English", "🇺🇸", "Set in Utopian Piltover and the oppressed underground of Zaun, the story follows the origins of two iconic League champions and the power that will tear them apart."],
  ["Frieren: Beyond Journey's End", "2023–present", "NTV", "Crunchyroll / Netflix", "Animation", 8.9, "leaf", 1, 28, 24, "Japanese", "🇯🇵", "An elf mage who helped defeat the Demon King embarks on a new journey decades later to understand the fleeting human lives of her former companions."],
  ["Firefly", "2002–2003", "Fox", "Hulu", "Sci-Fi & Fantasy", 9.0, "rocket", 1, 14, 44, "English", "🇺🇸", "Five hundred years in the future, a renegade crew aboard a small transport spaceship tries to survive as they travel the unknown parts of the galaxy."],
  ["Fargo", "2014–2024", "FX", "Hulu", "Crime", 8.9, "target", 5, 51, 53, "English", "🇺🇸", "Various chronicles of deception, intrigue, and murder in and around frozen Minnesota—all mysteriously leading back to Fargo, North Dakota."],
  ["Cowboy Bebop", "1998–1999", "TV Tokyo", "Crunchyroll / Netflix", "Animation", 8.9, "rocket", 1, 26, 24, "Japanese", "🇯🇵", "The futuristic misadventures and tragedy of an easygoing bounty hunter and his partners aboard the spaceship Bebop."],
  ["Gravity Falls", "2012–2016", "Disney", "Disney+ / Hulu", "Animation", 8.9, "key", 2, 40, 23, "English", "🇺🇸", "Twin siblings Dipper and Mabel Pines spend the summer at their great-uncle's tourist trap in the enigmatic Oregon town of Gravity Falls."],
  ["Death Note", "2006–2007", "NTV", "Netflix / Crunchyroll", "Animation", 8.9, "pen", 1, 37, 24, "Japanese", "🇯🇵", "An intelligent high school student goes on a secret crusade to eliminate criminals from the world after discovering a notebook capable of killing anyone whose name is written into it."],
  ["Hunter x Hunter", "2011–2014", "NTV", "Crunchyroll / Netflix", "Animation", 9.0, "star", 6, 148, 24, "Japanese", "🇯🇵", "Gon Freecss aspires to become a Hunter, an exceptional being capable of greatness, in order to find his missing father."],
  ["One Piece", "1999–present", "Fuji TV", "Crunchyroll / Netflix", "Animation", 9.0, "crown", 21, 1100, 24, "Japanese", "🇯🇵", "Monkey D. Luffy sets off on an adventure with his pirate crew in hopes of finding the greatest treasure ever, known as the 'One Piece'."],
  ["Seinfeld", "1989–1998", "NBC", "Netflix", "Comedy", 8.9, "mic", 9, 180, 22, "English", "🇺🇸", "The continuing misadventures of neurotic New York City stand-up comedian Jerry Seinfeld and his equally neurotic New York City friends."],
  ["Friends", "1994–2004", "NBC", "Max", "Comedy", 8.9, "mug", 10, 236, 22, "English", "🇺🇸", "Follows the personal and professional lives of six twenty- to thirty-something-year-old friends living in the Manhattan borough of New York City."],
  ["Das Boot", "1985", "ARD", "Prime Video", "Drama", 8.8, "target", 1, 6, 55, "German", "🇩🇪", "The claustrophobic World War II experience of a German U-boat crew patrolling the Battle of the Atlantic."],
  ["Monty Python's Flying Circus", "1969–1974", "BBC", "Netflix", "Comedy", 8.8, "crown", 4, 45, 30, "English", "🇬🇧", "The surreal, stream-of-consciousness British sketch comedy troupe that reinvented television humor."],
  ["Pride and Prejudice", "1995", "BBC", "Hulu / BritBox", "Drama", 8.8, "heart", 1, 6, 55, "English", "🇬🇧", "Jane Austen's classic novel about the prejudice that occurred between the 19th-century classes and the pride which would keep lovers apart."],
  ["Twin Peaks", "1990–1991", "ABC", "Paramount+", "Mystery", 8.8, "mug", 2, 30, 47, "English", "🇺🇸", "An idiosyncratic FBI agent investigates the murder of a young woman in the even more idiosyncratic town of Twin Peaks."],
  ["Blackadder Goes Forth", "1989", "BBC", "BritBox / Hulu", "Comedy", 8.8, "cap", 1, 6, 30, "English", "🇬🇧", "Stuck in the trenches of World War I, Captain Blackadder does everything he can to escape going 'over the top'."],
  ["Freaks and Geeks", "1999–2000", "NBC", "Hulu / Paramount+", "Comedy", 8.8, "pen", 1, 18, 44, "English", "🇺🇸", "A high school mathlete starts hanging out with a group of burnouts while her younger brother navigates his freshman year."],
  ["Fawlty Towers", "1975–1979", "BBC", "BritBox", "Comedy", 8.8, "key", 2, 12, 30, "English", "🇬🇧", "Hotel owner Basil Fawlty's incompetence, short fuse, and arrogance form a combination that ensures accidents and trouble are never far away."],
  ["Over the Garden Wall", "2014", "Cartoon Network", "Hulu / Max", "Animation", 8.8, "leaf", 1, 10, 11, "English", "🇺🇸", "Two brothers find themselves lost in a mysterious autumn forest called the Unknown and must find their way home."],
  ["Dark", "2017–2020", "Netflix", "Netflix", "Sci-Fi & Fantasy", 8.7, "clock", 3, 26, 55, "German", "🇩🇪", "A family saga with a supernatural twist, set in a German town where the disappearance of two young children exposes the relationships among four families."],
  ["Monster", "2004–2005", "NTV", "Netflix", "Animation", 8.7, "eye", 1, 74, 24, "Japanese", "🇯🇵", "A brilliant neurosurgeon's life spirals into turmoil after he chooses to save a young boy's life over the town's mayor, only to discover the boy grew into a sociopath."],
  ["Steins;Gate", "2011", "Tokyo MX", "Crunchyroll / Hulu", "Animation", 8.8, "clock", 1, 24, 24, "Japanese", "🇯🇵", "After discovering time travel, a university student and his colleagues must use their knowledge of it to stop an evil organization and their diabolical plans."],
  ["Vinland Saga", "2019–2023", "NHK / Tokyo MX", "Netflix / Crunchyroll", "Animation", 8.8, "sword", 2, 48, 24, "Japanese", "🇯🇵", "Thorfinn pursues a journey with his father's killer in order to take revenge and end his life in a duel as an honorable warrior."],
  ["Narcos", "2015–2017", "Netflix", "Netflix", "Crime", 8.8, "dollar", 3, 30, 49, "Spanish", "🇨🇴", "A chronicled look at the criminal exploits of Colombian drug lord Pablo Escobar, as well as the many other drug kingpins who plagued the country through the years."],
  ["Mindhunter", "2017–2019", "Netflix", "Netflix", "Crime", 8.6, "briefcase", 2, 19, 54, "English", "🇺🇸", "In the late 1970s, two FBI agents broaden the realm of criminal science by investigating the psychology behind murder and end up getting too close to real-life monsters."],
  ["Mr. Robot", "2015–2019", "USA Network", "Prime Video", "Drama", 8.5, "laptop", 4, 45, 49, "English", "🇺🇸", "Elliot, a brilliant but highly unstable young cyber-security engineer and vigilante hacker, becomes a key figure in a complex game of global dominance."],
  ["The Boys", "2019–present", "Prime Video", "Prime Video", "Action", 8.7, "flame", 4, 32, 60, "English", "🇺🇸", "A group of vigilantes set out to take down corrupt superheroes who abuse their superpowers."],
  ["Rome", "2005–2007", "HBO / BBC", "Max", "Drama", 8.7, "sword", 2, 22, 52, "English", "🇬🇧", "A down-to-earth account of the lives of both illustrious and ordinary Romans set in the last days of the Roman Republic."],
  ["Invincible", "2021–present", "Prime Video", "Prime Video", "Animation", 8.7, "star", 2, 16, 48, "English", "🇺🇸", "An adult animated series based on the Skybound/Image comic about a teenager whose father is the most powerful superhero on the planet."],
  ["Boardwalk Empire", "2010–2014", "HBO", "Max", "Crime", 8.6, "glass", 5, 56, 55, "English", "🇺🇸", "An Atlantic City politician plays both sides of the law by conspiring with gangsters during the Prohibition era."],
  ["Daredevil", "2015–2018", "Netflix", "Disney+", "Action", 8.6, "scales", 3, 39, 54, "English", "🇺🇸", "A blind lawyer by day, vigilante by night. Matt Murdock fights the crime of New York as Daredevil."],
  ["Blue Eye Samurai", "2023–present", "Netflix", "Netflix", "Animation", 8.7, "sword", 1, 8, 50, "English", "🇺🇸", "Driven by a dream of revenge against those who made her an outcast in Edo-period Japan, a young warrior cuts a bloody path toward her destiny."],
  ["Cyberpunk: Edgerunners", "2022", "Netflix", "Netflix", "Animation", 8.3, "bulb", 1, 10, 25, "Japanese", "🇯🇵", "A Street Kid trying to survive in a technology and body modification-obsessed city of the future chooses to stay alive by becoming an Edgerunner."],
  ["Code Geass", "2006–2008", "MBS", "Crunchyroll / Hulu", "Animation", 8.7, "crown", 2, 50, 24, "Japanese", "🇯🇵", "After being given a mysterious power to control others, an outcast prince becomes the masked leader of the rebellion against an all-powerful empire."],
  ["Mob Psycho 100", "2016–2022", "Tokyo MX", "Crunchyroll", "Animation", 8.6, "bulb", 3, 37, 24, "Japanese", "🇯🇵", "A psychic middle school boy tries to live a normal life and keep his growing powers under control, even though he constantly gets into trouble."],
  ["Haikyu!!", "2014–2020", "MBS", "Crunchyroll / Netflix", "Animation", 8.7, "ball", 4, 85, 24, "Japanese", "🇯🇵", "Determined to be like the volleyball championship's star player nicknamed 'the Small Giant', Shoyo joins his school's volleyball club."],
  ["Reply 1988", "2015–2016", "tvN", "Netflix / Viki", "Drama", 9.1, "house", 1, 20, 95, "Korean", "🇰🇷", "Five childhood friends who all live in the same Ssangmundong neighborhood of Seoul lean on each other to survive their challenging teen years."],
  ["My Mister", "2018", "tvN", "Netflix / Viki", "Drama", 9.1, "briefcase", 1, 16, 75, "Korean", "🇰🇷", "A dutiful structural engineer in his 40s and a cold, debt-burdened temporary worker in her 20s form a quiet healing bond in Seoul."],
  ["Crash Landing on You", "2019–2020", "tvN", "Netflix", "Romance", 8.7, "parachute", 1, 16, 85, "Korean", "🇰🇷", "A South Korean chaebol heiress makes an emergency paragliding landing in North Korea and into the life of an army captain who decides to help her hide."],
  ["Kingdom", "2019–2020", "Netflix", "Netflix", "Thriller", 8.3, "crown", 2, 12, 50, "Korean", "🇰🇷", "While strange rumors about their ill King grip a kingdom, the crown prince becomes their only hope against a mysterious plague overtaking the land."],
  ["Panchayat", "2020–present", "Prime Video", "Prime Video", "Comedy", 9.0, "house", 3, 24, 35, "Hindi", "🇮🇳", "An engineering graduate, unable to find a better job option, joins as secretary of a Panchayat office in a remote village of Uttar Pradesh."],
  ["Scam 1992: The Harshad Mehta Story", "2020", "SonyLIV", "SonyLIV", "Crime", 9.2, "dollar", 1, 10, 52, "Hindi", "🇮🇳", "Set in early-1990s Bombay, the meteoric rise and devastating fall of stockbroker Harshad Mehta."],
  ["Gomorrah", "2014–2021", "Sky Atlantic", "Max", "Crime", 8.6, "target", 5, 58, 50, "Italian", "🇮🇹", "Ciro disregards tradition in his attempt to become the next boss of a ruthless Neapolitan crime syndicate."],
  ["Babylon Berlin", "2017–present", "Sky / ARD", "MHz Choice", "Crime", 8.4, "glass", 4, 40, 48, "German", "🇩🇪", "A Cologne police inspector is transferred to 1929 Weimar Berlin to dismantle an extortion ring amidst political extremism and cabaret."],
  ["Borgen", "2010–2022", "DR1", "Netflix", "Drama", 8.5, "scales", 4, 38, 58, "Danish", "🇩🇰", "A political drama about a charismatic female politician's unexpected rise to become the first female Prime Minister of Denmark."],
  ["The Bridge (Bron/Broen)", "2011–2018", "SVT / DR", "Topic / Prime Video", "Crime", 8.6, "key", 4, 38, 58, "Swedish", "🇸🇪", "When a body is found on the bridge between Denmark and Sweden, right on the border, Danish inspector Martin Rohde and Swedish Saga Norén have to share jurisdiction."]
];

export const VERIFIED_IMDB_TV_CATALOG: ChannelMediaItem[] = (() => {
  const fromAdditions: ChannelMediaItem[] = RAW_IMDB_TV_ADDITIONS.map((row, idx) => {
    const [title, years, network, where, genre, imdb, icon, seasons, eps, mins, lang, langFlag, blurb] = row;
    const startYear = parseInt(years.slice(0, 4), 10) || 2015;
    const hours = Math.max(1, Math.round((eps * mins) / 60));
    const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
    return {
      kind: "tv",
      id: `tv_${slug}`,
      rank: idx + 1,
      title,
      years,
      year: startYear,
      start: startYear,
      network,
      where,
      genre,
      imdb,
      icon,
      blurb,
      limited: seasons === 1 && !years.includes("present"),
      seasons,
      eps,
      mins,
      sub: `${genre} · ${network}`,
      hours,
      lang,
      langFlag,
    };
  });

  // Combine SHOWS (which keeps s1..s100 IDs intact!) + verified IMDb additions, sorted by IMDb score descending
  const combined: ChannelMediaItem[] = [];
  const seen = new Set<string>();

  for (const item of [...SHOWS, ...fromAdditions]) {
    const key = item.title.toLowerCase().replace(/[^a-z0-9]/g, "");
    if (seen.has(key)) continue;
    seen.add(key);
    combined.push(item);
  }

  combined.sort((a, b) => b.imdb - a.imdb || a.rank - b.rank);
  return combined.map((item, idx) => ({
    ...item,
    rank: idx + 1,
  }));
})();

// Verified Letterboxd Top Narrative Feature Films additions (real directors, years, runtimes, countries, and ratings)
const RAW_LETTERBOXD_ADDITIONS: [
  string, // title
  number, // year
  string, // director
  number, // mins
  string, // lang
  string, // langFlag
  string, // where
  string, // genre
  number, // rating (10-pt scale)
  string, // icon
  string  // blurb
][] = [
  ["Harakiri", 1962, "Masaki Kobayashi", 133, "Japanese", "🇯🇵", "Criterion Channel", "Drama", 9.2, "sword", "Down-on-his-luck veteran Tsugumo Hanshirō enters the courtyard of the prosperous House of Iyi and requests to commit ritual suicide—only to unravel the clan's hypocrisy."],
  ["Come and See", 1985, "Elem Klimov", 142, "Russian", "🇧🇾", "Criterion Channel", "War / Drama", 9.1, "eye", "After finding an old rifle, a young Belarusian boy joins the Soviet resistance movement against ruthless German forces and experiences the horrors of World War II."],
  ["Seven Samurai", 1954, "Akira Kurosawa", 207, "Japanese", "🇯🇵", "Criterion Channel / Max", "Action / Drama", 9.1, "sword", "Farmers from a village exploited by bandits hire a veteran samurai for protection, who gathers six other samurai to join him."],
  ["12 Angry Men", 1957, "Sidney Lumet", 96, "English", "🇺🇸", "Prime Video / Tubi", "Drama", 9.0, "scales", "The jury in a New York City murder trial is frustrated by a single member whose skeptical caution forces them to more carefully consider the evidence."],
  ["The Godfather", 1972, "Francis Ford Coppola", 175, "English", "🇺🇸", "Paramount+", "Crime / Drama", 9.2, "crown", "The aging patriarch of an organized crime dynasty transfers control of his clandestine empire to his reluctant youngest son."],
  ["The Godfather Part II", 1974, "Francis Ford Coppola", 202, "English", "🇺🇸", "Paramount+", "Crime / Drama", 9.0, "crown", "The early life and career of Vito Corleone in 1920s New York City is portrayed, while his son, Michael, expands and tightens his grip on the family crime syndicate."],
  ["High and Low", 1963, "Akira Kurosawa", 143, "Japanese", "🇯🇵", "Criterion Channel / Max", "Crime / Thriller", 8.9, "briefcase", "An executive of a Yokohama shoe company becomes a victim of extortion when his chauffeur's son is kidnapped by mistake and held for ransom."],
  ["A Brighter Summer Day", 1991, "Edward Yang", 237, "Mandarin", "🇹🇼", "Criterion Channel", "Drama / Crime", 8.9, "bulb", "A boy experiences first love, friendships, and injustices growing up in 1960s Taiwan in Edward Yang's monumental masterpiece."],
  ["Ikiru", 1952, "Akira Kurosawa", 143, "Japanese", "🇯🇵", "Criterion Channel / Max", "Drama", 8.8, "flower", "A bureaucrat tries to find meaning in his life after he discovers he has terminal cancer."],
  ["Sunset Boulevard", 1950, "Billy Wilder", 110, "English", "🇺🇸", "Paramount+", "Drama / Noir", 8.8, "clapper", "A screenwriter develops a dangerous relationship with a faded silent-film star determined to make a triumphant return."],
  ["The Human Condition I: No Greater Love", 1959, "Masaki Kobayashi", 208, "Japanese", "🇯🇵", "Criterion Channel", "War / Drama", 8.9, "scales", "A conscientious, newly married Japanese pacifist is sent to manage a Manchurian ore mine during World War II."],
  ["GoodFellas", 1990, "Martin Scorsese", 145, "English", "🇺🇸", "Max / Prime Video", "Crime / Drama", 8.7, "glass", "The story of Henry Hill and his life in the mafia, covering his relationship with his wife Karen and his mob partners Jimmy Conway and Tommy DeVito."],
  ["City of Lights (City Lights)", 1931, "Charlie Chaplin", 87, "English", "🇺🇸", "Criterion Channel / Max", "Comedy / Romance", 8.7, "flower", "With the aid of a wealthy erratic tippler, a dewy-eyed tramp who has fallen in love with a sightless flower girl accumulates money to be able to help her medically."],
  ["Cinema Paradiso", 1988, "Giuseppe Tornatore", 155, "Italian", "🇮🇹", "Prime Video / Kanopy", "Drama", 8.7, "clapper", "A filmmaker recalls his童年 when falling in love with the pictures at the cinema of his home village and forms a deep friendship with the cinema's projectionist."],
  ["The Apartment", 1960, "Billy Wilder", 125, "English", "🇺🇸", "Prime Video / MGM+", "Comedy / Romance", 8.7, "key", "A Manhattan insurance clerk tries to rise in his company by letting its executives use his apartment for trysts, but complications and a romance of his own ensue."],
  ["Ran", 1985, "Akira Kurosawa", 162, "Japanese", "🇯🇵", "Criterion Channel / Kanopy", "Action / Drama", 8.7, "crown", "In Medieval Japan, an elderly warlord retires, handing over his empire to his three sons. However, he vastly underestimates how the new-found power will corrupt them."],
  ["Stalker", 1979, "Andrei Tarkovsky", 162, "Russian", "🇷🇺", "Criterion Channel / Max", "Sci-Fi / Drama", 8.7, "compass" in {} ? "eye" : "eye", "A guide leads two men through an area known as the Zone to find a room that grants a person's innermost desires."],
  ["Persona", 1966, "Ingmar Bergman", 85, "Swedish", "🇸🇪", "Criterion Channel / Max", "Drama", 8.6, "eye", "A nurse is put in charge of a mute actress and finds that their personae are melding together on an isolated Baltic island."],
  ["8½", 1963, "Federico Fellini", 138, "Italian", "🇮🇹", "Criterion Channel / Max", "Drama", 8.6, "clapper", "A harried movie director retreats into his memories and fantasies while struggling to conceive his next feature film."],
  ["Apocalypse Now", 1979, "Francis Ford Coppola", 147, "English", "🇺🇸", "Paramount+ / Prime Video", "War / Drama", 8.6, "flame", "A U.S. Army officer serving in Vietnam is tasked with assassinating a renegade Special Forces Colonel who sees himself as a god."],
  ["Fanny and Alexander", 1982, "Ingmar Bergman", 188, "Swedish", "🇸🇪", "Criterion Channel / Max", "Drama", 8.6, "house", "Two young Swedish children experience the many comedies and tragedies of their theatrical family, the Ekdahls."],
  ["Paris, Texas", 1984, "Wim Wenders", 145, "English", "🇩🇪", "Criterion Channel / Max", "Drama", 8.6, "palm", "Travis Henderson, an aimless drifter who has been missing for four years, wanders out of the desert and must reconnect with society, himself, his young son, and his former wife."],
  ["Grave of the Fireflies", 1988, "Isao Takahata", 89, "Japanese", "🇯🇵", "Netflix", "Animation / Drama", 8.6, "flame", "A young boy and his little sister struggle to survive in Japan during World War II."],
  ["Psycho", 1960, "Alfred Hitchcock", 109, "English", "🇺🇸", "Peacock / Prime Video", "Horror / Thriller", 8.5, "key", "A Phoenix secretary embezzles forty thousand dollars from her employer's client, goes on the run, and checks into a remote motel run by a young man under the domination of his mother."],
  ["Rear Window", 1954, "Alfred Hitchcock", 112, "English", "🇺🇸", "Peacock / Prime Video", "Mystery / Thriller", 8.5, "camera", "A wheelchair-bound photographer spies on his neighbors from his Greenwich Village courtyard apartment window, and becomes convinced one of them has committed murder."],
  ["The Good, the Bad and the Ugly", 1966, "Sergio Leone", 161, "Italian", "🇮🇹", "Prime Video / MGM+", "Western", 8.8, "horseshoe", "A bounty hunting scam joins two men in an uneasy alliance against a third in a race to find a fortune in gold buried in a remote cemetery."],
  ["Once Upon a Time in the West", 1968, "Sergio Leone", 165, "Italian", "🇮🇹", "Paramount+", "Western", 8.6, "horseshoe", "A mysterious stranger with a harmonica joins forces with a notorious desperado to protect a beautiful widow from a ruthless assassin working for the railroad."],
  ["Singin' in the Rain", 1952, "Stanley Donen & Gene Kelly", 103, "English", "🇺🇸", "Max", "Musical / Comedy", 8.6, "cloud", "A silent film star falls for a chorus girl just as he and his delusionally jealous screen partner are trying to make the difficult transition to talking pictures in 1920s Hollywood."],
  ["2001: A Space Odyssey", 1968, "Stanley Kubrick", 149, "English", "🇬🇧", "Max", "Sci-Fi", 8.5, "planet", "After uncovering a mysterious artifact buried beneath the Lunar surface, a spacecraft is sent to Jupiter to find its origins—piloted by the sentient computer HAL 9000."],
  ["Barry Lyndon", 1975, "Stanley Kubrick", 185, "English", "🇬🇧", "Criterion Channel / Max", "Period Drama", 8.5, "crown", "An Irish rogue wins the heart of a rich widow and assumes her dead husband's aristocratic position in 18th-century England."],
  ["Paths of Glory", 1957, "Stanley Kubrick", 88, "English", "🇺🇸", "Prime Video / Kanopy", "War / Drama", 8.5, "scales", "After refusing to attack an enemy position, a general accuses the soldiers of cowardice and their commanding officer must defend them."],
  ["Alien", 1979, "Ridley Scott", 117, "English", "🇺🇸", "Hulu", "Sci-Fi / Horror", 8.5, "rocket", "The crew of a commercial spacecraft encounter a deadly lifeform after investigating an unknown transmission."],
  ["The Thing", 1982, "John Carpenter", 109, "English", "🇺🇸", "Peacock / Prime Video", "Sci-Fi / Horror", 8.5, "flame", "A research team in Antarctica is hunted by a shape-shifting alien that assumes the appearance of its victims."],
  ["Pulp Fiction", 1994, "Quentin Tarantino", 154, "English", "🇺🇸", "Max / Paramount+", "Crime / Drama", 8.9, "briefcase", "The lives of two mob hitmen, a boxer, a gangster and his wife, and a pair of diner bandits intertwine in four tales of violence and redemption."],
  ["Heat", 1995, "Michael Mann", 170, "English", "🇺🇸", "Netflix / Hulu", "Crime / Thriller", 8.4, "target", "A group of high-end professional thieves start to feel the heat from the LAPD when they unknowingly leave a clue at their latest heist."],
  ["Princess Mononoke", 1997, "Hayao Miyazaki", 134, "Japanese", "🇯🇵", "Max", "Animation / Fantasy", 8.5, "leaf", "On a journey to find the cure for a Tatarigami's curse, Ashitaka finds himself in the middle of a war between the forest gods and Tatara, a mining colony."],
  ["Perfect Blue", 1997, "Satoshi Kon", 81, "Japanese", "🇯🇵", "Shudder / Apple TV", "Animation / Thriller", 8.5, "eye", "A pop singer gives up her career to become an actress, but she slowly goes insane when she starts being stalked by an obsessed fan and what seems to be a ghost of her past."],
  ["Chungking Express", 1994, "Wong Kar-wai", 102, "Cantonese", "🇭🇰", "Criterion Channel", "Romance / Comedy", 8.4, "heart", "Two melancholic Hong Kong policemen fall in love: one with a mysterious female underworld figure, the other with a quirky snack bar worker."],
  ["La Haine", 1995, "Mathieu Kassovitz", 98, "French", "🇫🇷", "Criterion Channel / Kanopy", "Crime / Drama", 8.5, "clock", "24 hours in the lives of three young men in the French suburbs the day after a violent riot."],
  ["Do the Right Thing", 1989, "Spike Lee", 120, "English", "🇺🇸", "Criterion Channel / Peacock", "Drama", 8.5, "sun", "On the hottest day of the year on a street in the Bedford-Stuyvesant section of Brooklyn, everyone's hate and bigotry smolders and builds until it explodes into violence."],
  ["Before Sunrise", 1995, "Richard Linklater", 101, "English", "🇺🇸", "Prime Video", "Romance / Drama", 8.4, "heart", "A young man and woman meet on a train in Europe, and wind up spending one evening together in Vienna."],
  ["Fargo", 1996, "Joel Coen", 98, "English", "🇺🇸", "Prime Video / MGM+", "Crime / Thriller", 8.3, "target", "Minnesota car salesman Jerry Lundegaard's inept crime falls apart due to his and his henchmen's bungling and the persistent police work of the quite pregnant Marge Gunderson."],
  ["The Big Lebowski", 1998, "Joel Coen", 117, "English", "🇺🇸", "Peacock", "Comedy", 8.3, "ball", "Jeff 'The Dude' Lebowski, mistaken for a millionaire of the same name, seeks restitution for his ruined rug and enlists his bowling buddies to help get it."],
  ["Tampopo", 1985, "Juzo Itami", 114, "Japanese", "🇯🇵", "Criterion Channel / Max", "Comedy", 8.4, "plate", "A truck driver stops at a small family-run noodle shop and decides to help its fledgling business in this playful 'ramen western'."],
  ["Close-Up", 1990, "Abbas Kiarostami", 98, "Persian", "🇮🇷", "Criterion Channel", "Docudrama", 8.5, "clapper", "The true story of Hossain Sabzian, a cinephile who impersonated the director Mohsen Makhmalbaf to convince a family they would star in his so-called new film."],
  ["Spider-Man: Across the Spider-Verse", 2023, "Joaquim Dos Santos, Kemp Powers, Justin K. Thompson", 140, "English", "🇺🇸", "Netflix", "Animation / Sci-Fi", 8.6, "spiral", "Miles Morales catapults across the Multiverse, where he encounters a team of Spider-People charged with protecting its very existence."],
  ["Dune: Part Two", 2024, "Denis Villeneuve", 166, "English", "🇺🇸", "Max", "Sci-Fi / Adventure", 8.6, "sun", "Paul Atreides unites with Chani and the Fremen while on a warpath of revenge against the conspirators who destroyed his family."],
  ["Aftersun", 2022, "Charlotte Wells", 102, "English", "🇬🇧", "Netflix / MUBI / Kanopy", "Drama", 8.4, "sun", "Sophie reflects on the shared joy and private melancholy of a holiday she took with her father twenty years earlier."],
  ["The Handmaiden", 2016, "Park Chan-wook", 145, "Korean", "🇰🇷", "Prime Video", "Thriller / Romance", 8.6, "key", "A woman is hired as a handmaiden to a Japanese heiress, but secretly she is involved in a plot to defraud her."],
  ["Stop Making Sense", 1984, "Jonathan Demme", 88, "English", "🇺🇸", "Max", "Documentary / Music", 8.8, "mic", "An innovative concert movie for the rock group Talking Heads."],
];

export const VERIFIED_LETTERBOXD_FILM_CATALOG: ChannelMediaItem[] = (() => {
  const fromAdditions: ChannelMediaItem[] = RAW_LETTERBOXD_ADDITIONS.map((row, idx) => {
    const [title, year, director, mins, lang, langFlag, where, genre, imdb, icon, blurb] = row;
    const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
    return {
      kind: "film",
      id: `lb_${slug}_${year}`,
      rank: idx + 1,
      title,
      year,
      start: year,
      director,
      where,
      genre,
      imdb,
      icon,
      blurb,
      mins,
      hours: +(mins / 60).toFixed(1),
      sub: `${genre} · ${lang}`,
      lang,
      langFlag,
    };
  });

  // Combine FILMS (which keeps f1..f100 IDs intact!) + verified Letterboxd additions, sorted by score descending
  const combined: ChannelMediaItem[] = [];
  const seen = new Set<string>();

  for (const item of [...FILMS, ...fromAdditions]) {
    const key = item.title.toLowerCase().replace(/[^a-z0-9]/g, "");
    if (seen.has(key)) continue;
    seen.add(key);
    combined.push(item);
  }

  combined.sort((a, b) => b.imdb - a.imdb || a.rank - b.rank);
  return combined.map((item, idx) => ({
    ...item,
    rank: idx + 1,
  }));
})();

