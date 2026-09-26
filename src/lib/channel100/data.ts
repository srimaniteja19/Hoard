import { ChannelMediaItem, ArtMeta, CatalogConfig, MediaKind } from "./types";

export const RAW_SHOWS: [number, string, string, string, string, string, number, string, string, number?][] = [
  [1, "Breaking Bad", "2008–2013", "AMC", "Netflix", "Crime", 9.5, "flask", "A mild chemistry teacher with a cancer diagnosis cooks his way into the drug trade and becomes someone else entirely."],
  [2, "The Wire", "2002–2008", "HBO", "HBO Max", "Crime", 9.3, "star", "Baltimore seen whole: street corners, police units, the docks, City Hall, schools and the newsroom, all failing together."],
  [3, "Mad Men", "2007–2015", "AMC", "HBO Max", "Drama", 8.7, "glass", "A gifted, hollow ad man sells the American dream on Madison Avenue while the 1960s shift under him."],
  [4, "Succession", "2018–2023", "HBO", "HBO Max", "Drama", 8.9, "tie", "Four grasping children circle their media-mogul father's throne in a savage comedy of wealth and need."],
  [5, "Fleabag", "2016–2019", "BBC / Amazon", "Prime Video", "Comedy", 8.7, "heart", "A grieving Londoner talks straight to camera as she wrecks her life and slowly, hilariously, lets people in."],
  [6, "Game of Thrones", "2011–2019", "HBO", "HBO Max", "Sci-Fi & Fantasy", 9.2, "sword", "Noble houses scheme for a cold iron throne while an older threat gathers beyond the Wall."],
  [7, "Veep", "2012–2019", "HBO", "HBO Max", "Comedy", 8.4, "flag", "A vain, profane vice president and her hapless staff fumble through Washington one fiasco at a time."],
  [8, "30 Rock", "2006–2013", "NBC", "Peacock", "Comedy", 8.2, "tv", "The head writer of a chaotic sketch show juggles her stars, her network boss and her own life at joke-a-second speed."],
  [9, "Curb Your Enthusiasm", "2000–2024", "HBO", "HBO Max", "Comedy", 8.8, "bubble", "Larry David plays himself, turning every tiny social rule into an all-out war."],
  [10, "Atlanta", "2016–2022", "FX", "Hulu", "Comedy", 8.6, "mic", "A broke Princeton dropout manages his cousin's rap career in a surreal, dreamlike portrait of Black life."],
  [11, "The Office (U.S.)", "2005–2013", "NBC", "Peacock", "Comedy", 9.0, "mug", "A mockumentary about a Scranton paper company and its needy, oblivious regional manager."],
  [12, "Arrested Development", "2003–2019", "Fox / Netflix", "Netflix", "Comedy", 8.7, "house", "The one sane son of a disgraced rich family tries to keep them all together. There's always money in the banana stand."],
  [13, "Girls", "2012–2017", "HBO", "HBO Max", "Comedy", 7.3, "bubble", "Four young women in Brooklyn stumble through jobs, sex and friendship with painful honesty."],
  [14, "Friday Night Lights", "2006–2011", "NBC", "Peacock", "Drama", 8.7, "football", "High school football in a small Texas town, and the coach and family who hold it together."],
  [15, "Six Feet Under", "2001–2005", "HBO", "HBO Max", "Drama", 8.7, "flower", "A family running a Los Angeles funeral home learns to live with death, and with each other."],
  [16, "The Office (U.K.)", "2001–2003", "BBC", "Rent / Buy", "Comedy", 8.5, "mug", "The original cringe mockumentary: a paper merchant in Slough and a boss who thinks he's a legend."],
  [17, "The Americans", "2013–2018", "FX", "Hulu", "Drama", 8.4, "flag", "Two Soviet spies pose as a suburban American couple in 1980s Washington, with real kids and real feelings."],
  [18, "I May Destroy You", "2020", "HBO / BBC", "HBO Max", "Drama", 7.9, "pen", "A London writer pieces together a night she can't remember and rebuilds her sense of self.", 1],
  [19, "Chernobyl", "2019", "HBO", "HBO Max", "Drama", 9.3, "atom", "The 1986 nuclear disaster and the scientists who fought the lies around it.", 1],
  [20, "The Crown", "2016–2023", "Netflix", "Netflix", "Drama", 8.6, "crown", "Elizabeth II's reign from her wedding into the 21st century, one crisis of duty after another."],
  [21, "The White Lotus", "2021–present", "HBO", "HBO Max", "Drama", 8.0, "palm", "Rich guests and put-upon staff at a luxury resort, with a body turning up by the end of each stay."],
  [22, "Lost", "2004–2010", "ABC", "Hulu", "Sci-Fi & Fantasy", 8.3, "plane", "Plane-crash survivors on a very strange island, each carrying a past that follows them there."],
  [23, "The Comeback", "2005–2026", "HBO", "HBO Max", "Comedy", 7.7, "clapper", "A faded sitcom actress lets cameras follow her attempted return, humiliation and all."],
  [24, "Deadwood", "2004–2006", "HBO", "HBO Max", "Drama", 8.6, "horseshoe", "A lawless 1870s mining camp becomes a town, told in gorgeous, filthy, Shakespearean dialogue."],
  [25, "The Leftovers", "2014–2017", "HBO", "HBO Max", "Drama", 8.3, "cloud", "Two percent of the world's people vanish at once, and everyone left behind has to keep living."],
  [26, "Black Mirror", "2011–present", "Channel 4 / Netflix", "Netflix", "Sci-Fi & Fantasy", 8.7, "eye", "A standalone anthology of near-future stories about technology and human weakness."],
  [27, "Better Call Saul", "2015–2022", "AMC", "Netflix", "Crime", 9.0, "scales", "A scrappy small-time lawyer slowly becomes Saul Goodman, the crook's attorney from Breaking Bad."],
  [28, "Band of Brothers", "2001", "HBO", "HBO Max", "Drama", 9.4, "parachute", "One U.S. paratrooper company from D-Day to the end of World War II in Europe.", 1],
  [29, "Key & Peele", "2012–2015", "Comedy Central", "Paramount+", "Comedy", 8.4, "bubble", "Sketch comedy with sharp takes on race, identity and pop culture. Home of many viral characters."],
  [30, "Severance", "2022–present", "Apple TV", "Apple TV", "Sci-Fi & Fantasy", 8.7, "door", "Office workers have their work memories surgically split from their home lives. What do they actually do there?"],
  [31, "Survivor", "2000–present", "CBS", "Paramount+", "Reality & Docs", 7.4, "flame", "Strangers stranded on an island vote each other out until one wins the million."],
  [32, "Andor", "2022–2025", "Disney+", "Disney+", "Sci-Fi & Fantasy", 8.5, "rocket", "A thief becomes a rebel in a grounded, adult spy drama about how resistance is built."],
  [33, "Enlightened", "2011–2013", "HBO", "HBO Max", "Comedy", 8.1, "sun", "After a breakdown, a corporate buyer returns to work determined to change herself, and the company."],
  [34, "Schitt's Creek", "2015–2020", "CBC / Pop", "Hulu", "Comedy", 8.5, "key", "A newly broke rich family moves into a motel in the tiny town they once bought as a joke."],
  [35, "True Detective (Season 1)", "2014", "HBO", "HBO Max", "Crime", 8.9, "spiral", "Two Louisiana detectives chase a ritual killer across seventeen years.", 1],
  [36, "The Pitt", "2025–present", "HBO Max", "HBO Max", "Drama", 8.9, "plus", "One 15-hour shift in a Pittsburgh emergency room per season, in real time."],
  [37, "Battlestar Galactica", "2005–2009", "Sci Fi", "Peacock", "Sci-Fi & Fantasy", 8.7, "planet", "The last humans flee across space from the machines they built, some of which look human."],
  [38, "Homeland", "2011–2020", "Showtime", "Paramount+", "Drama", 8.3, "flag", "A driven CIA officer suspects a rescued American POW has been turned."],
  [39, "Watchmen", "2019", "HBO", "HBO Max", "Sci-Fi & Fantasy", 7.8, "clock", "Masked police in Tulsa face white supremacists in a sequel that rewrites comic-book history.", 1],
  [40, "Adolescence", "2025", "Netflix", "Netflix", "Drama", 8.1, "phone", "A 13-year-old is arrested for murder, told in four single-take episodes.", 1],
  [41, "Louie", "2010–2015", "FX", "Rent / Buy", "Comedy", 8.5, "mic", "A stand-up comic's melancholy, experimental portrait of single fatherhood in New York."],
  [42, "Hacks", "2021–2026", "HBO Max", "HBO Max", "Comedy", 8.2, "mic", "A Las Vegas comedy legend and a canceled young writer form a prickly, brilliant partnership."],
  [43, "Peaky Blinders", "2013–2022", "BBC", "Netflix", "Crime", 8.8, "cap", "A Birmingham gang led by a scarred war veteran climbs toward power after World War I."],
  [44, "BoJack Horseman", "2014–2020", "Netflix", "Netflix", "Comedy", 8.8, "horseshoe", "A washed-up sitcom horse in Hollywood faces his depression. Funnier and sadder than it has any right to be."],
  [45, "Happy Valley", "2014–2023", "BBC", "Netflix", "Crime", 8.5, "star", "A tough Yorkshire police sergeant runs into the man who wrecked her family."],
  [46, "Broad City", "2014–2019", "Comedy Central", "Paramount+", "Comedy", 8.1, "bubble", "Two best friends wander New York in a loose, joyful hunt for money, weed and adventure."],
  [47, "Twin Peaks: The Return", "2017", "Showtime", "Paramount+", "Sci-Fi & Fantasy", 8.6, "mug", "David Lynch returns to the town 25 years later in 18 hours of dread, beauty and mystery.", 1],
  [48, "House of Cards", "2013–2018", "Netflix", "Netflix", "Drama", 8.6, "building", "A ruthless congressman and his wife claw their way toward the White House."],
  [49, "Normal People", "2020", "Hulu / BBC", "Hulu", "Drama", 8.4, "heart", "Two Irish teens fall in and out of love through school and university.", 1],
  [50, "Parks and Recreation", "2009–2015", "NBC", "Peacock", "Comedy", 8.6, "leaf", "An endlessly upbeat bureaucrat and her misfit coworkers try to improve a small Indiana town."],
  [51, "The Good Place", "2016–2020", "NBC", "Netflix", "Comedy", 8.2, "cloud", "A selfish woman wakes up in the afterlife's good place by mistake and tries to learn ethics fast."],
  [52, "Downton Abbey", "2010–2015", "ITV / PBS", "Peacock", "Drama", 8.7, "house", "An aristocratic family and their servants face war and a changing England."],
  [53, "Stranger Things", "2016–2025", "Netflix", "Netflix", "Sci-Fi & Fantasy", 8.6, "bulb", "Kids in 1980s Indiana hunt for a missing friend and find a government lab and a monstrous other world."],
  [54, "The Bureau", "2015–2020", "Canal+", "AMC+", "Drama", 8.6, "envelope", "French spies juggle secret identities, loyalties and lies in a quiet, meticulous espionage drama."],
  [55, "Insecure", "2016–2021", "HBO", "HBO Max", "Comedy", 8.0, "heart", "Two best friends navigate work, love and each other in South Los Angeles."],
  [56, "Nathan for You", "2013–2017", "Comedy Central", "Paramount+", "Comedy", 8.9, "briefcase", "A deadpan business consultant pitches struggling companies absurd plans, then actually carries them out."],
  [57, "I Think You Should Leave", "2019–present", "Netflix", "Netflix", "Comedy", 8.0, "bubble", "Sketches about people who double down on their worst moments, loudly."],
  [58, "Chappelle's Show", "2003–2006", "Comedy Central", "Paramount+", "Comedy", 8.8, "mic", "Dave Chappelle's era-defining sketch show on race and celebrity."],
  [59, "PEN15", "2019–2021", "Hulu", "Hulu", "Comedy", 7.9, "phone", "Two adult creators play their 13-year-old selves in middle school, circa 2000, among real teens."],
  [60, "Peep Show", "2003–2015", "Channel 4", "Rent / Buy", "Comedy", 8.7, "eye", "Two mismatched London flatmates, shot from their point of view with their awful inner thoughts."],
  [61, "RuPaul's Drag Race", "2009–present", "Logo / VH1 / MTV", "Paramount+", "Reality & Docs", 8.1, "crown", "Drag queens compete in sewing, acting, comedy and lip syncs for the crown."],
  [62, "Slow Horses", "2022–present", "Apple TV", "Apple TV", "Drama", 8.2, "horseshoe", "MI5's disgraced agents, exiled to a dingy office, keep stumbling onto real conspiracies."],
  [63, "The Thick of It", "2005–2012", "BBC", "Rent / Buy", "Comedy", 8.6, "bubble", "A British government department in permanent panic, ruled by a spectacularly sweary spin doctor."],
  [64, "Anthony Bourdain: Parts Unknown", "2013–2018", "CNN", "HBO Max", "Reality & Docs", 8.8, "globe", "Bourdain travels the world eating, drinking and listening to people."],
  [65, "Mare of Easttown", "2021", "HBO", "HBO Max", "Crime", 8.4, "star", "A worn-down detective in suburban Pennsylvania investigates a murder while her own life frays.", 1],
  [66, "The Rehearsal", "2022–present", "HBO", "HBO Max", "Reality & Docs", 8.4, "clapper", "Nathan Fielder helps people rehearse life's hard moments with elaborate sets and hired actors."],
  [67, "The Handmaid's Tale", "2017–2025", "Hulu", "Hulu", "Drama", 8.4, "flower", "In a theocratic America, fertile women are forced to bear children for the ruling class."],
  [68, "Ozark", "2017–2022", "Netflix", "Netflix", "Crime", 8.5, "dollar", "A financial planner moves his family to the Missouri Ozarks to launder money for a cartel."],
  [69, "Anthony Bourdain: No Reservations", "2005–2012", "Travel Channel", "Rent / Buy", "Reality & Docs", 8.6, "plate", "Bourdain's earlier globe-trotting food show, looser and wilder."],
  [70, "The Shield", "2002–2008", "FX", "Hulu", "Crime", 8.7, "star", "A corrupt LAPD strike team led by a cop who'll do anything to stay on top."],
  [71, "Beef (Season 1)", "2023", "Netflix", "Netflix", "Drama", 8.0, "flame", "A road-rage incident spirals into an obsessive feud between two unhappy strangers.", 1],
  [72, "Squid Game", "2021–2025", "Netflix", "Netflix", "Drama", 8.0, "target", "Hundreds of people in debt play deadly children's games for a huge cash prize."],
  [73, "Barry", "2018–2023", "HBO", "HBO Max", "Comedy", 8.4, "target", "A depressed hitman discovers acting class in Los Angeles and wants out of the killing business."],
  [74, "The Bear", "2022–2026", "FX", "Hulu", "Drama", 8.5, "plate", "A fine-dining chef takes over his late brother's chaotic Chicago sandwich shop."],
  [75, "Ted Lasso", "2020–present", "Apple TV", "Apple TV", "Comedy", 8.8, "ball", "An American football coach with no soccer experience takes over a struggling English club."],
  [76, "Somebody Somewhere", "2022–2024", "HBO", "HBO Max", "Comedy", 8.2, "mic", "A woman back home in Kansas after her sister's death finds her people through singing."],
  [77, "Modern Family", "2009–2020", "ABC", "Hulu", "Comedy", 8.5, "house", "Three related households in Los Angeles in a warm mockumentary sitcom."],
  [78, "It's Always Sunny in Philadelphia", "2005–present", "FX", "Hulu", "Comedy", 8.8, "glass", "Five terrible friends run a Philadelphia bar and make everything worse."],
  [79, "The Good Wife", "2009–2016", "CBS", "Paramount+", "Drama", 8.4, "scales", "After her politician husband's scandal, a woman returns to law and remakes her life."],
  [80, "How To With John Wilson", "2020–2023", "HBO", "HBO Max", "Reality & Docs", 8.6, "camera", "A shy New Yorker films the city while trying to explain everyday tasks, and finds something profound."],
  [81, "The Queen's Gambit", "2020", "Netflix", "Netflix", "Drama", 8.5, "pawn", "An orphaned chess prodigy fights addiction while rising to the top of the game in the 1960s.", 1],
  [82, "Better Things", "2016–2022", "FX", "Hulu", "Comedy", 7.9, "heart", "A working actress raises three daughters on her own in Los Angeles."],
  [83, "Justified", "2010–2015", "FX", "Hulu", "Crime", 8.6, "star", "A quick-draw U.S. marshal is sent back to the Kentucky hills he grew up in."],
  [84, "Planet Earth", "2006", "BBC / Discovery", "HBO Max", "Reality & Docs", 9.4, "globe", "The landmark nature series filmed across every habitat on Earth.", 1],
  [85, "The Great British Baking Show", "2010–present", "BBC / Channel 4", "Netflix", "Reality & Docs", 8.6, "cake", "Kind amateur bakers compete in a tent in the English countryside."],
  [86, "Shōgun", "2024–present", "FX", "Hulu", "Drama", 8.6, "sword", "An English navigator shipwrecked in feudal Japan is pulled into a warlord's fight for power."],
  [87, "Reservation Dogs", "2021–2023", "FX", "Hulu", "Comedy", 8.2, "sun", "Four Indigenous teens in rural Oklahoma scheme to get to California."],
  [88, "Dexter", "2006–2013", "Showtime", "Paramount+", "Crime", 8.6, "drop", "A Miami blood-spatter analyst who is secretly a serial killer of other killers."],
  [89, "Baby Reindeer", "2024", "Netflix", "Netflix", "Drama", 7.6, "envelope", "A struggling comic is stalked for years, in a raw semi-autobiographical story.", 1],
  [90, "Eastbound & Down", "2009–2013", "HBO", "HBO Max", "Comedy", 8.3, "ball", "A burnt-out, arrogant former pitcher returns to his hometown to teach gym."],
  [91, "Catastrophe", "2015–2019", "Channel 4 / Amazon", "Prime Video", "Comedy", 8.2, "heart", "An American and an Irishman marry after an accidental pregnancy and make it up as they go."],
  [92, "The Night Of", "2016", "HBO", "HBO Max", "Crime", 8.4, "key", "A Queens student wakes up next to a dead woman and is charged with murder.", 1],
  [93, "Station Eleven", "2021–2022", "HBO Max", "HBO Max", "Sci-Fi & Fantasy", 7.5, "plane", "After a pandemic ends civilization, a traveling troupe performs Shakespeare across the Great Lakes.", 1],
  [94, "The Diplomat", "2023–present", "Netflix", "Netflix", "Drama", 7.9, "flag", "A career diplomat is made U.S. ambassador to the U.K. in the middle of an international crisis."],
  [95, "House", "2004–2012", "Fox", "Peacock", "Drama", 8.7, "pill", "A brilliant, misanthropic doctor solves medical mysteries nobody else can."],
  [96, "Halt and Catch Fire", "2014–2017", "AMC", "AMC+", "Drama", 8.5, "tv", "Engineers and dreamers chase the personal computer and then the internet through the '80s and '90s."],
  [97, "Community", "2009–2015", "NBC", "Netflix", "Comedy", 8.5, "pen", "A disbarred lawyer forms a study group of misfits at a community college."],
  [98, "The OA", "2016–2019", "Netflix", "Netflix", "Sci-Fi & Fantasy", 7.8, "door", "A woman missing for seven years returns with her sight restored and a story of other dimensions."],
  [99, "Gilmore Girls", "2000–2007", "The WB", "Netflix", "Comedy", 8.2, "mug", "A fast-talking single mom and her daughter live on coffee in a small Connecticut town."],
  [100, "Scandal", "2012–2018", "ABC", "Hulu", "Drama", 7.7, "phone", "A Washington crisis fixer handles scandals for the powerful, including the president."]
];

export const EXTRA_SHOW_DATA: Record<number, [number, number, number, string, number?]> = {
  1: [5, 62, 49, "Crime drama · Thriller · Neo-western"],
  2: [5, 60, 59, "Crime drama · Police procedural"],
  3: [7, 92, 48, "Period drama · Workplace"],
  4: [4, 39, 62, "Satire · Family drama"],
  5: [2, 12, 26, "Dark comedy · Dramedy"],
  6: [8, 73, 57, "Epic fantasy · Political drama"],
  7: [7, 65, 28, "Political satire · Sitcom"],
  8: [7, 138, 22, "Workplace sitcom"],
  9: [12, 120, 29, "Improv comedy · Cringe comedy"],
  10: [4, 41, 29, "Surreal comedy · Drama"],
  11: [9, 201, 22, "Mockumentary sitcom"],
  12: [5, 84, 25, "Family sitcom · Farce"],
  13: [6, 62, 28, "Comedy-drama"],
  14: [5, 76, 43, "Sports drama · Family drama"],
  15: [5, 63, 55, "Family drama · Dark comedy"],
  16: [2, 14, 30, "Mockumentary sitcom · Cringe comedy"],
  17: [6, 75, 48, "Spy thriller · Period drama"],
  18: [1, 12, 30, "Drama · Dark comedy"],
  19: [1, 5, 65, "Historical drama · Disaster"],
  20: [6, 60, 55, "Historical drama · Biographical"],
  21: [3, 21, 60, "Satire · Mystery · Anthology"],
  22: [6, 121, 43, "Mystery · Sci-fi · Adventure"],
  23: [3, 29, 30, "Satire · Showbiz comedy", 1],
  24: [3, 36, 55, "Western · Period drama"],
  25: [3, 28, 57, "Mystery · Supernatural drama"],
  26: [7, 33, 60, "Sci-fi anthology · Techno-thriller"],
  27: [6, 63, 48, "Legal drama · Crime"],
  28: [1, 10, 60, "War drama · Historical"],
  29: [5, 53, 22, "Sketch comedy"],
  30: [2, 19, 50, "Sci-fi thriller · Workplace mystery"],
  31: [50, 700, 43, "Competition reality", 1],
  32: [2, 24, 48, "Sci-fi · Spy thriller"],
  33: [2, 18, 29, "Comedy-drama · Satire"],
  34: [6, 80, 22, "Sitcom · Fish out of water"],
  35: [1, 8, 58, "Crime · Southern gothic"],
  36: [2, 30, 50, "Medical drama · Real-time", 1],
  37: [4, 75, 43, "Space opera · Military sci-fi"],
  38: [8, 96, 52, "Spy thriller · Political drama"],
  39: [1, 9, 58, "Superhero · Mystery · Alt-history"],
  40: [1, 4, 60, "Crime drama · One-take"],
  41: [5, 61, 23, "Comedy-drama · Stand-up"],
  42: [5, 47, 30, "Comedy-drama · Showbiz", 1],
  43: [6, 36, 58, "Gangster · Period drama"],
  44: [6, 77, 25, "Adult animation · Dark comedy"],
  45: [3, 18, 58, "Crime drama · Thriller"],
  46: [5, 50, 22, "Buddy comedy"],
  47: [1, 18, 58, "Surreal mystery · Horror"],
  48: [6, 73, 51, "Political thriller"],
  49: [1, 12, 30, "Romance · Coming-of-age"],
  50: [7, 125, 22, "Mockumentary sitcom"],
  51: [4, 53, 23, "Philosophical comedy · Fantasy"],
  52: [6, 52, 58, "Period drama · Ensemble"],
  53: [5, 42, 70, "Sci-fi horror · Coming-of-age", 1],
  54: [5, 50, 52, "Spy thriller"],
  55: [5, 44, 30, "Comedy-drama · Friendship"],
  56: [4, 32, 22, "Docu-comedy · Deadpan"],
  57: [3, 18, 17, "Sketch comedy · Absurdist"],
  58: [3, 28, 22, "Sketch comedy"],
  59: [2, 25, 27, "Coming-of-age comedy · Cringe"],
  60: [9, 54, 25, "Sitcom · Cringe comedy"],
  61: [18, 270, 60, "Competition reality", 1],
  62: [5, 30, 45, "Spy thriller · Dark comedy", 1],
  63: [4, 23, 29, "Political satire"],
  64: [12, 104, 44, "Travel & food docuseries"],
  65: [1, 7, 58, "Crime mystery · Small-town"],
  66: [2, 12, 45, "Docu-comedy · Meta"],
  67: [6, 66, 52, "Dystopian drama"],
  68: [4, 44, 60, "Crime thriller · Family drama"],
  69: [9, 142, 43, "Travel & food docuseries"],
  70: [7, 88, 45, "Police drama · Crime"],
  71: [1, 10, 35, "Dark comedy · Thriller"],
  72: [3, 22, 55, "Survival thriller · Dystopian"],
  73: [4, 32, 30, "Dark comedy · Crime"],
  74: [5, 48, 32, "Comedy-drama · Kitchen", 1],
  75: [3, 34, 45, "Sports comedy · Feel-good", 1],
  76: [3, 21, 30, "Comedy-drama · Music"],
  77: [11, 250, 22, "Mockumentary family sitcom"],
  78: [17, 180, 22, "Dark sitcom", 1],
  79: [7, 156, 43, "Legal drama · Political"],
  80: [3, 18, 27, "Docu-comedy · Essay"],
  81: [1, 7, 57, "Period drama · Sports"],
  82: [5, 52, 26, "Comedy-drama · Family"],
  83: [6, 78, 45, "Neo-western · Crime"],
  84: [1, 11, 50, "Nature documentary"],
  85: [16, 160, 60, "Competition reality · Cooking", 1],
  86: [1, 10, 60, "Historical epic · Political drama"],
  87: [3, 28, 29, "Comedy-drama · Coming-of-age"],
  88: [8, 96, 53, "Crime thriller · Psychological"],
  89: [1, 7, 34, "Psychological drama · True story"],
  90: [4, 29, 29, "Sports comedy · Cringe"],
  91: [4, 24, 25, "Romantic comedy"],
  92: [1, 8, 70, "Crime drama · Legal"],
  93: [1, 10, 55, "Post-apocalyptic drama"],
  94: [3, 22, 50, "Political thriller", 1],
  95: [8, 177, 44, "Medical drama · Mystery"],
  96: [4, 40, 45, "Period drama · Tech"],
  97: [6, 110, 22, "Meta sitcom"],
  98: [2, 16, 55, "Sci-fi mystery · Supernatural"],
  99: [7, 153, 43, "Family comedy-drama"],
  100: [7, 124, 43, "Political thriller · Soap"]
};

// [rank, title, year, director, minutes, streaming, genre, imdb, icon, sub-genres, language, blurb]
export const RAW_FILMS: [number, string, number, string, number, string, string, number, string, string, string, string][] = [
  [1, "Parasite", 2019, "Bong Joon Ho", 132, "HBO Max", "Thriller", 8.5, "house", "Dark comedy · Class thriller", "Korean", "A poor family cons its way into a rich household, and the arrangement curdles into something violent."],
  [2, "Mulholland Drive", 2001, "David Lynch", 147, "Criterion Channel", "Thriller", 7.9, "spiral", "Neo-noir · Surreal mystery", "", "An amnesiac and an aspiring actress drift through Hollywood's dream factory until it becomes a nightmare."],
  [3, "There Will Be Blood", 2007, "Paul Thomas Anderson", 158, "Rent / Buy", "Drama", 8.2, "drop", "Period epic · Character study", "", "A ruthless oilman builds an empire in early-1900s California and hollows himself out doing it."],
  [4, "In the Mood for Love", 2000, "Wong Kar-wai", 98, "Criterion Channel", "Romance", 8.1, "clock", "Melodrama", "Cantonese", "In 1962 Hong Kong, two neighbors learn their spouses are having an affair and circle their own unspoken love."],
  [5, "Moonlight", 2016, "Barry Jenkins", 111, "Rent / Buy", "Drama", 7.4, "moon", "Coming-of-age", "", "One young Black man in Miami, told in three chapters from boyhood to adulthood."],
  [6, "No Country for Old Men", 2007, "Joel & Ethan Coen", 122, "Rent / Buy", "Thriller", 8.2, "dollar", "Neo-western · Crime", "", "A hunter finds drug money in the Texas desert, and an unstoppable killer comes looking for it."],
  [7, "Eternal Sunshine of the Spotless Mind", 2004, "Michel Gondry", 108, "Rent / Buy", "Romance", 8.3, "heart", "Sci-fi romance", "", "After a breakup, a man has his ex erased from his memory and fights to keep her while it happens."],
  [8, "Get Out", 2017, "Jordan Peele", 104, "Peacock", "Horror", 7.8, "mug", "Social thriller", "", "A Black photographer visits his white girlfriend's family for the weekend. Their welcome is far too warm."],
  [9, "Spirited Away", 2001, "Hayao Miyazaki", 125, "HBO Max", "Animation", 8.6, "door", "Fantasy · Coming-of-age", "Japanese", "A sulky ten-year-old is trapped in a spirit-world bathhouse and must work to save her parents."],
  [10, "The Social Network", 2010, "David Fincher", 120, "Rent / Buy", "Drama", 7.8, "laptop", "Biographical · Tech", "", "The founding of Facebook, told through the lawsuits that followed it."],
  [11, "Mad Max: Fury Road", 2015, "George Miller", 120, "HBO Max", "Action & War", 8.1, "flame", "Post-apocalyptic · Chase", "", "A road warrior and a rebel commander flee a desert tyrant in one long, magnificent chase."],
  [12, "The Zone of Interest", 2023, "Jonathan Glazer", 105, "HBO Max", "Drama", 7.4, "flower", "Historical · Holocaust", "German", "A Nazi commandant's family builds an idyllic home next to Auschwitz, and life goes on."],
  [13, "Children of Men", 2006, "Alfonso Cuarón", 109, "Peacock", "Sci-Fi & Fantasy", 7.9, "cloud", "Dystopian thriller", "", "With no child born in 18 years, a burnt-out bureaucrat escorts a pregnant woman to safety."],
  [14, "Inglourious Basterds", 2009, "Quentin Tarantino", 153, "Peacock", "Action & War", 8.4, "clapper", "Alt-history · Revenge", "", "In occupied France, Jewish-American soldiers and a cinema owner plot to kill the Nazi high command."],
  [15, "City of God", 2002, "Fernando Meirelles & Kátia Lund", 130, "Rent / Buy", "Crime", 8.6, "camera", "Gangster · Coming-of-age", "Portuguese", "Two boys grow up in a Rio favela, one as a photographer and one as a gang lord."],
  [16, "Crouching Tiger, Hidden Dragon", 2000, "Ang Lee", 120, "Rent / Buy", "Action & War", 7.9, "sword", "Wuxia · Romance", "Mandarin", "Warriors in Qing-dynasty China chase a stolen sword across rooftops, forests and treetops."],
  [17, "Brokeback Mountain", 2005, "Ang Lee", 134, "Rent / Buy", "Romance", 7.7, "mountain", "Western romance", "", "Two Wyoming ranch hands fall in love in 1963 and spend decades unable to say it aloud."],
  [18, "Y Tu Mamá También", 2001, "Alfonso Cuarón", 106, "Rent / Buy", "Drama", 7.6, "palm", "Road movie · Coming-of-age", "Spanish", "Two teenage friends take a road trip across Mexico with an older woman who changes them both."],
  [19, "Zodiac", 2007, "David Fincher", 157, "Paramount+", "Thriller", 7.7, "target", "True crime · Procedural", "", "A cartoonist, a reporter and a detective lose years of their lives to the Zodiac killer case."],
  [20, "The Wolf of Wall Street", 2013, "Martin Scorsese", 180, "Paramount+", "Comedy", 8.2, "dollar", "Black comedy · Crime", "", "The rise and very loud fall of a Long Island stockbroker who got rich on fraud."],
  [21, "The Royal Tenenbaums", 2001, "Wes Anderson", 110, "Disney+", "Comedy", 7.6, "tie", "Family dramedy", "", "A family of former child prodigies reassembles when their con-man father says he's dying."],
  [22, "The Grand Budapest Hotel", 2014, "Wes Anderson", 99, "Disney+", "Comedy", 8.1, "cake", "Caper · Period comedy", "", "A legendary concierge and his lobby boy get caught up in a stolen-painting caper in 1930s Europe."],
  [23, "Boyhood", 2014, "Richard Linklater", 165, "Rent / Buy", "Drama", 7.9, "ball", "Coming-of-age", "", "Filmed over 12 years with the same actors, a boy grows from six to eighteen on screen."],
  [24, "Her", 2013, "Spike Jonze", 126, "Rent / Buy", "Romance", 8.0, "bubble", "Sci-fi romance", "", "A lonely writer falls in love with his computer's operating system."],
  [25, "Phantom Thread", 2017, "Paul Thomas Anderson", 130, "Rent / Buy", "Drama", 7.4, "pen", "Period romance", "", "A controlling 1950s London couturier meets a woman who won't be controlled."],
  [26, "Anatomy of a Fall", 2023, "Justine Triet", 151, "Hulu", "Thriller", 7.7, "scales", "Courtroom drama", "French", "A writer is tried for her husband's death, and their marriage is dissected in court."],
  [27, "Adaptation.", 2002, "Spike Jonze", 115, "Rent / Buy", "Comedy", 7.6, "flower", "Meta comedy", "", "A blocked screenwriter struggles to adapt a book about orchids and writes himself into the script."],
  [28, "The Dark Knight", 2008, "Christopher Nolan", 152, "HBO Max", "Action & War", 9.0, "building", "Superhero · Crime", "", "Batman faces the Joker, an agent of chaos out to prove anyone can break."],
  [29, "Arrival", 2016, "Denis Villeneuve", 116, "Paramount+", "Sci-Fi & Fantasy", 7.9, "planet", "First contact · Drama", "", "A linguist is recruited to talk to aliens, and learning their language changes how she experiences time."],
  [30, "Lost in Translation", 2003, "Sofia Coppola", 102, "Rent / Buy", "Drama", 7.7, "mic", "Romantic dramedy", "", "A fading movie star and a young wife form an unlikely bond in a Tokyo hotel."],
  [31, "The Departed", 2006, "Martin Scorsese", 151, "Rent / Buy", "Crime", 8.5, "phone", "Crime thriller", "", "An undercover cop and a mob mole inside the Boston police race to expose each other."],
  [32, "Bridesmaids", 2011, "Paul Feig", 125, "Peacock", "Comedy", 6.8, "cake", "Buddy comedy", "", "A broke maid of honor's life unravels while her best friend's wedding plans escalate."],
  [33, "A Separation", 2011, "Asghar Farhadi", 123, "Rent / Buy", "Drama", 8.3, "key", "Family drama · Moral thriller", "Persian", "An Iranian couple's separation sets off a chain of accusations with no clean answers."],
  [34, "WALL·E", 2008, "Andrew Stanton", 98, "Disney+", "Animation", 8.4, "leaf", "Sci-fi · Romance", "", "A lonely trash-compacting robot on an abandoned Earth falls for a sleek probe."],
  [35, "A Prophet", 2009, "Jacques Audiard", 155, "Rent / Buy", "Crime", 7.8, "key", "Prison drama", "French", "A young Arab man enters a French prison illiterate and leaves it as a crime boss."],
  [36, "A Serious Man", 2009, "Joel & Ethan Coen", 106, "Rent / Buy", "Comedy", 7.0, "cloud", "Black comedy", "", "A Midwestern physics professor's life falls apart in 1967, and no one can tell him why."],
  [37, "Call Me by Your Name", 2017, "Luca Guadagnino", 132, "Rent / Buy", "Romance", 7.8, "sun", "Coming-of-age romance", "", "A 17-year-old falls for his father's graduate assistant during one Italian summer."],
  [38, "Portrait of a Lady on Fire", 2019, "Céline Sciamma", 122, "Hulu", "Romance", 8.1, "flame", "Period romance", "French", "A painter is hired to secretly paint a reluctant bride-to-be in 18th-century Brittany."],
  [39, "Lady Bird", 2017, "Greta Gerwig", 94, "Rent / Buy", "Comedy", 7.4, "pen", "Coming-of-age dramedy", "", "A Sacramento senior clashes with her mother while dreaming of college on the East Coast."],
  [40, "Yi Yi", 2000, "Edward Yang", 173, "Criterion Channel", "Drama", 8.1, "camera", "Family drama", "Mandarin", "A Taipei family's year of weddings, births and heartbreaks, seen from young and old."],
  [41, "Amélie", 2001, "Jean-Pierre Jeunet", 122, "Rent / Buy", "Romance", 8.3, "heart", "Whimsical comedy", "French", "A shy Parisian waitress decides to quietly fix the lives of everyone around her."],
  [42, "The Master", 2012, "Paul Thomas Anderson", 138, "Rent / Buy", "Drama", 7.1, "glass", "Character study", "", "A damaged Navy veteran falls under the spell of a charismatic cult leader in 1950."],
  [43, "Oldboy", 2003, "Park Chan-wook", 120, "Rent / Buy", "Thriller", 8.3, "door", "Revenge thriller", "Korean", "A man locked in a hotel room for 15 years is released and given five days to find out why."],
  [44, "Once Upon a Time... in Hollywood", 2019, "Quentin Tarantino", 161, "Rent / Buy", "Comedy", 7.6, "clapper", "Showbiz · Alt-history", "", "A fading TV actor and his stunt double drift through 1969 Los Angeles as the Manson family circles."],
  [45, "Moneyball", 2011, "Bennett Miller", 133, "Rent / Buy", "Drama", 7.6, "ball", "Sports · Biographical", "", "The Oakland A's general manager uses statistics to build a winning team on a shoestring."],
  [46, "Roma", 2018, "Alfonso Cuarón", 135, "Netflix", "Drama", 7.7, "plane", "Family drama · Period", "Spanish", "A live-in maid holds a Mexico City family together through a turbulent 1971."],
  [47, "Almost Famous", 2000, "Cameron Crowe", 122, "Paramount+", "Comedy", 7.9, "mic", "Music · Coming-of-age", "", "A teenage music journalist tours with a rising 1970s rock band for Rolling Stone."],
  [48, "The Lives of Others", 2006, "Florian Henckel von Donnersmarck", 137, "Rent / Buy", "Thriller", 8.4, "eye", "Surveillance · Period drama", "German", "A Stasi officer spying on an East Berlin playwright begins to protect him."],
  [49, "Before Sunset", 2004, "Richard Linklater", 80, "Rent / Buy", "Romance", 8.1, "sun", "Walk-and-talk romance", "", "Nine years after one night in Vienna, two former strangers reunite for an afternoon in Paris."],
  [50, "Up", 2009, "Pete Docter", 96, "Disney+", "Animation", 8.3, "house", "Adventure · Family", "", "A grumpy widower ties balloons to his house and flies to South America with a stowaway scout."],
  [51, "12 Years a Slave", 2013, "Steve McQueen", 134, "Rent / Buy", "Drama", 8.1, "key", "Historical · Biographical", "", "A free Black man is kidnapped and sold into slavery, and fights for twelve years to survive."],
  [52, "The Favourite", 2018, "Yorgos Lanthimos", 119, "Rent / Buy", "Comedy", 7.5, "crown", "Period satire", "", "Two cousins scheme for the favor of Britain's Queen Anne in a vicious court comedy."],
  [53, "Borat", 2006, "Larry Charles", 84, "Rent / Buy", "Comedy", 7.3, "flag", "Mockumentary", "", "A Kazakh TV reporter tours America on a mission that exposes the people he meets."],
  [54, "Pan's Labyrinth", 2006, "Guillermo del Toro", 118, "Rent / Buy", "Sci-Fi & Fantasy", 8.2, "spiral", "Dark fairy tale · War", "Spanish", "In 1944 Spain, a girl escapes her brutal stepfather into a dark fairy-tale labyrinth."],
  [55, "Inception", 2010, "Christopher Nolan", 148, "Rent / Buy", "Sci-Fi & Fantasy", 8.8, "clock", "Heist · Sci-fi", "", "A thief who steals secrets through dreams is hired to plant an idea instead."],
  [56, "Punch-Drunk Love", 2002, "Paul Thomas Anderson", 95, "Rent / Buy", "Romance", 7.3, "phone", "Romantic comedy", "", "A lonely, rage-prone novelty salesman finds love while being extorted by a phone-sex line."],
  [57, "Best in Show", 2000, "Christopher Guest", 90, "HBO Max", "Comedy", 7.4, "star", "Mockumentary", "", "Dog owners and their prize pets descend on a Philadelphia dog show."],
  [58, "Uncut Gems", 2019, "Josh & Benny Safdie", 135, "Rent / Buy", "Thriller", 7.4, "gem", "Crime thriller", "", "A gambling-addicted jeweler bets everything on a rare opal, over and over."],
  [59, "Toni Erdmann", 2016, "Maren Ade", 162, "Rent / Buy", "Comedy", 7.3, "briefcase", "Family comedy-drama", "German", "A prankster father crashes his corporate-consultant daughter's life in Bucharest."],
  [60, "Whiplash", 2014, "Damien Chazelle", 106, "Rent / Buy", "Drama", 8.5, "drum", "Music drama", "", "A young jazz drummer and his abusive teacher push each other toward something like greatness."],
  [61, "Kill Bill: Vol. 1", 2003, "Quentin Tarantino", 111, "Rent / Buy", "Action & War", 8.2, "sword", "Martial arts · Revenge", "", "An assassin wakes from a coma and hunts the squad that tried to kill her on her wedding day."],
  [62, "Memento", 2000, "Christopher Nolan", 113, "Rent / Buy", "Thriller", 8.4, "camera", "Neo-noir · Mystery", "", "A man with no short-term memory hunts his wife's killer through tattoos and Polaroids."],
  [63, "Little Miss Sunshine", 2006, "Jonathan Dayton & Valerie Faris", 101, "Hulu", "Comedy", 7.8, "sun", "Road comedy · Family", "", "A dysfunctional family road-trips in a VW bus to get their daughter to a kids' pageant."],
  [64, "Gone Girl", 2014, "David Fincher", 149, "Rent / Buy", "Thriller", 8.1, "envelope", "Psychological thriller", "", "A woman vanishes on her fifth anniversary, and her husband becomes the prime suspect."],
  [65, "Oppenheimer", 2023, "Christopher Nolan", 180, "Peacock", "Drama", 8.3, "atom", "Biographical · Historical", "", "The physicist who led the atomic bomb project, before and after Trinity."],
  [66, "Spotlight", 2015, "Tom McCarthy", 129, "Rent / Buy", "Drama", 8.1, "bulb", "Journalism drama", "", "Boston Globe reporters uncover the Catholic Church's cover-up of child abuse."],
  [67, "TÁR", 2022, "Todd Field", 158, "Peacock", "Drama", 7.4, "pen", "Psychological drama · Music", "", "A world-famous conductor's power and reputation start to collapse around her."],
  [68, "The Hurt Locker", 2008, "Kathryn Bigelow", 131, "Rent / Buy", "Action & War", 7.5, "clock", "War thriller", "", "A reckless bomb disposal expert in Iraq thrives on the danger that terrifies his team."],
  [69, "Under the Skin", 2013, "Jonathan Glazer", 108, "Rent / Buy", "Sci-Fi & Fantasy", 6.3, "eye", "Sci-fi horror", "", "An alien in human form drives around Scotland luring men to their doom."],
  [70, "Let the Right One In", 2008, "Tomas Alfredson", 115, "Rent / Buy", "Horror", 7.8, "drop", "Vampire · Coming-of-age", "Swedish", "A bullied 12-year-old in 1980s Sweden befriends the strange girl next door, who is a vampire."],
  [71, "Ocean's Eleven", 2001, "Steven Soderbergh", 116, "HBO Max", "Crime", 7.7, "dollar", "Heist", "", "A charming ex-con assembles a crew to rob three Las Vegas casinos in one night."],
  [72, "Carol", 2015, "Todd Haynes", 118, "Rent / Buy", "Romance", 7.2, "heart", "Period romance", "", "A young shop girl and an elegant older woman fall in love in 1950s New York."],
  [73, "Ratatouille", 2007, "Brad Bird", 111, "Disney+", "Animation", 8.1, "plate", "Comedy · Food", "", "A rat with a great palate secretly cooks in a famous Paris kitchen."],
  [74, "The Florida Project", 2017, "Sean Baker", 111, "Rent / Buy", "Drama", 7.5, "palm", "Slice of life", "", "A six-year-old spends a summer running wild at a budget motel near Disney World."],
  [75, "Amour", 2012, "Michael Haneke", 127, "Rent / Buy", "Drama", 7.9, "flower", "Family drama", "French", "An elderly Parisian couple face the wife's decline after a stroke."],
  [76, "O Brother, Where Art Thou?", 2000, "Joel & Ethan Coen", 107, "Rent / Buy", "Comedy", 7.7, "mic", "Musical comedy · Odyssey", "", "Three escaped convicts cross 1930s Mississippi in a loose retelling of the Odyssey."],
  [77, "Everything Everywhere All at Once", 2022, "Daniel Kwan & Daniel Scheinert", 139, "Rent / Buy", "Sci-Fi & Fantasy", 7.8, "eye", "Multiverse · Family", "", "A laundromat owner being audited discovers she must save the multiverse."],
  [78, "Aftersun", 2022, "Charlotte Wells", 102, "Rent / Buy", "Drama", 7.6, "camera", "Memory drama", "", "A woman remembers a holiday in Turkey with her young father, who was hiding his sadness."],
  [79, "The Tree of Life", 2011, "Terrence Malick", 139, "Rent / Buy", "Drama", 6.8, "globe", "Cosmic family drama", "", "A Texas family in the 1950s, set against the creation of the universe."],
  [80, "Volver", 2006, "Pedro Almodóvar", 121, "Rent / Buy", "Drama", 7.6, "plate", "Melodrama · Comedy", "Spanish", "Three generations of women in Madrid and La Mancha deal with a death and a secret."],
  [81, "Black Swan", 2010, "Darren Aronofsky", 108, "Rent / Buy", "Thriller", 8.0, "star", "Psychological horror · Ballet", "", "A ballerina's pursuit of the perfect Swan Queen pulls her into madness."],
  [82, "The Act of Killing", 2012, "Joshua Oppenheimer", 115, "Rent / Buy", "Documentary", 8.2, "camera", "Political documentary", "Indonesian", "Former Indonesian death-squad leaders reenact their killings for the camera, with pride."],
  [83, "Inside Llewyn Davis", 2013, "Joel & Ethan Coen", 104, "Rent / Buy", "Drama", 7.4, "mic", "Folk music · Character study", "", "A talented, self-sabotaging folk singer couch-surfs through Greenwich Village in 1961."],
  [84, "Melancholia", 2011, "Lars von Trier", 135, "Rent / Buy", "Drama", 7.1, "planet", "Apocalyptic drama", "", "A depressed bride finds strange calm as a rogue planet heads toward Earth."],
  [85, "Anchorman", 2004, "Adam McKay", 94, "Paramount+", "Comedy", 7.2, "tv", "Workplace comedy", "", "A 1970s San Diego news anchor feels threatened by a new female co-anchor."],
  [86, "Past Lives", 2023, "Celine Song", 105, "Rent / Buy", "Romance", 7.8, "plane", "Romantic drama", "English, Korean", "Two childhood friends from Seoul reconnect decades later in New York."],
  [87, "The Lord of the Rings: The Fellowship of the Ring", 2001, "Peter Jackson", 178, "HBO Max", "Sci-Fi & Fantasy", 8.9, "ring", "Epic fantasy · Adventure", "", "A hobbit sets out with eight companions to destroy an all-powerful ring."],
  [88, "The Gleaners and I", 2000, "Agnès Varda", 82, "Criterion Channel", "Documentary", 7.6, "leaf", "Essay documentary", "French", "Agnès Varda films people who gather what others throw away, and turns the camera on herself."],
  [89, "Interstellar", 2014, "Christopher Nolan", 169, "Paramount+", "Sci-Fi & Fantasy", 8.7, "rocket", "Space epic", "", "Astronauts travel through a wormhole to find humanity a new home as Earth dies."],
  [90, "Frances Ha", 2012, "Noah Baumbach", 86, "Rent / Buy", "Comedy", 7.4, "building", "Friendship comedy", "", "A 27-year-old dancer bounces around New York trying to grow up."],
  [91, "Fish Tank", 2009, "Andrea Arnold", 123, "Criterion Channel", "Drama", 7.3, "horseshoe", "Coming-of-age", "", "An angry 15-year-old on an Essex housing estate has her world upended when her mother brings home a new boyfriend."],
  [92, "Gladiator", 2000, "Ridley Scott", 155, "Paramount+", "Action & War", 8.5, "sword", "Historical epic", "", "A betrayed Roman general is sold into slavery and fights his way back as a gladiator."],
  [93, "Michael Clayton", 2007, "Tony Gilroy", 119, "Rent / Buy", "Thriller", 7.2, "briefcase", "Legal thriller", "", "A law firm's fixer faces his conscience during a massive chemical-company lawsuit."],
  [94, "Minority Report", 2002, "Steven Spielberg", 145, "Rent / Buy", "Sci-Fi & Fantasy", 7.6, "eye", "Sci-fi thriller", "", "In 2054, a cop who arrests murderers before they kill is accused of a future murder."],
  [95, "The Worst Person in the World", 2021, "Joachim Trier", 128, "Hulu", "Romance", 7.7, "clock", "Romantic dramedy", "Norwegian", "A young Oslo woman spends four years trying to sort out her love life and career."],
  [96, "Black Panther", 2018, "Ryan Coogler", 134, "Disney+", "Action & War", 7.3, "crown", "Superhero", "", "The new king of Wakanda faces a challenger who questions his country's isolation."],
  [97, "Gravity", 2013, "Alfonso Cuarón", 91, "HBO Max", "Sci-Fi & Fantasy", 7.7, "globe", "Space survival", "", "Two astronauts are stranded after debris destroys their shuttle."],
  [98, "Grizzly Man", 2005, "Werner Herzog", 103, "Rent / Buy", "Documentary", 7.8, "mountain", "Nature documentary", "", "Werner Herzog's portrait of a man who lived among Alaska's grizzly bears until they killed him."],
  [99, "Memories of Murder", 2003, "Bong Joon Ho", 132, "Rent / Buy", "Crime", 8.1, "star", "Police procedural", "Korean", "Two detectives in 1980s rural Korea hunt the country's first known serial killer."],
  [100, "Superbad", 2007, "Greg Mottola", 113, "Rent / Buy", "Comedy", 7.6, "bubble", "Teen comedy", "", "Two high school seniors try to score alcohol for a party before graduation."]
];

export const SHOWS: ChannelMediaItem[] = RAW_SHOWS.map((r) => {
  const rank = r[0];
  const x = EXTRA_SHOW_DATA[rank] || [1, 10, 45, "Drama", 0];
  const seasons = x[0];
  const eps = x[1];
  const mins = x[2];
  const sub = x[3];
  const approx = !!x[4];
  const hours = Math.round((eps * mins) / 60);

  return {
    kind: "tv",
    id: "s" + rank,
    rank,
    title: r[1],
    years: r[2],
    network: r[3],
    where: r[4],
    genre: r[5],
    imdb: r[6],
    icon: r[7],
    blurb: r[8],
    limited: !!r[9],
    start: parseInt(r[2], 10),
    seasons,
    eps,
    mins,
    sub,
    approx,
    hours,
  };
});

export const FILMS: ChannelMediaItem[] = RAW_FILMS.map((r) => {
  const rank = r[0];
  const mins = r[4];
  return {
    kind: "film",
    id: "f" + rank,
    rank,
    title: r[1],
    year: r[2],
    start: r[2],
    director: r[3],
    mins,
    where: r[5],
    genre: r[6],
    imdb: r[7],
    icon: r[8],
    sub: r[9],
    lang: r[10] || "English",
    blurb: r[11],
    hours: mins / 60,
  };
});

export const ALL_ITEMS: Record<string, ChannelMediaItem> = Object.fromEntries(
  SHOWS.concat(FILMS).map((i) => [i.id, i])
);

export const MOTIF_ICONS: Record<string, string> = {
  flask: '<path d="M24 6h16"/><path d="M27 6v18L11 50a4 4 0 0 0 3.5 6h35a4 4 0 0 0 3.5-6L37 24V6" fill="A"/><path d="M17 42h30" /><circle cx="28" cy="48" r="3" fill="B"/><circle cx="37" cy="46" r="2" fill="B"/>',
  star: '<path d="M32 4l7.6 17.4L58 23l-14 12.2 4.2 18.8L32 44l-16.2 10 4.2-18.8L6 23l18.4-1.6Z" fill="A"/><circle cx="32" cy="30" r="6" fill="B"/>',
  glass: '<path d="M8 10h48L32 36Z" fill="A"/><path d="M32 36v18M20 58h24"/><circle cx="41" cy="17" r="4" fill="B"/><path d="M41 17 52 4"/>',
  tie: '<path d="M24 6h16l-3 8H27Z" fill="B"/><path d="M27 14h10l6 32-11 12-11-12Z" fill="A"/><path d="M29 26l8 6M28 36l9 6"/>',
  heart: '<path d="M32 56S6 40 6 22a12 12 0 0 1 26-4 12 12 0 0 1 26 4c0 18-26 34-26 34Z" fill="A"/><path d="M16 20a6 6 0 0 1 6-5" />',
  sword: '<path d="M46 6h12v12L26 50l-12-12Z" fill="A"/><path d="M12 32l20 20" /><path d="M10 44l10 10-6 6-10-10Z" fill="B"/>',
  flag: '<path d="M14 4v56"/><path d="M14 8h38l-8 11 8 11H14Z" fill="A"/><circle cx="28" cy="19" r="5" fill="B"/>',
  tv: '<rect x="6" y="18" width="52" height="36" rx="5" fill="A"/><rect x="12" y="24" width="32" height="24" rx="2" fill="B"/><path d="M22 6l10 12 10-12"/><circle cx="51" cy="29" r="2.5" fill="#111"/><circle cx="51" cy="39" r="2.5" fill="#111"/>',
  bubble: '<path d="M6 10h52v32H28L14 56V42H6Z" fill="A"/><circle cx="20" cy="26" r="3" fill="#111"/><circle cx="32" cy="26" r="3" fill="#111"/><circle cx="44" cy="26" r="3" fill="#111"/>',
  mic: '<rect x="22" y="4" width="20" height="32" rx="10" fill="A"/><path d="M22 18h20M22 24h20"/><path d="M14 28a18 18 0 0 0 36 0M32 46v10M22 58h20"/>',
  mug: '<path d="M10 20h34v28a8 8 0 0 1-8 8H18a8 8 0 0 1-8-8Z" fill="A"/><path d="M44 26h5a7 7 0 0 1 0 14h-5"/><path d="M20 6c-3 4 3 6 0 10M30 6c-3 4 3 6 0 10"/><rect x="10" y="20" width="34" height="6" fill="B"/>',
  house: '<path d="M6 30 32 8l26 22"/><path d="M12 26v30h40V26L32 10Z" fill="A"/><rect x="26" y="38" width="12" height="18" fill="B"/><rect x="16" y="32" width="7" height="7" fill="B"/><rect x="41" y="32" width="7" height="7" fill="B"/>',
  football: '<ellipse cx="32" cy="32" rx="27" ry="15" transform="rotate(-35 32 32)" fill="A"/><path d="M22 42 42 22M26 30l4 4M30 26l4 4M34 22l4 4"/>',
  flower: '<circle cx="32" cy="16" r="9" fill="A"/><circle cx="46" cy="28" r="9" fill="A"/><circle cx="18" cy="28" r="9" fill="A"/><circle cx="40" cy="42" r="9" fill="A"/><circle cx="24" cy="42" r="9" fill="A"/><circle cx="32" cy="31" r="7" fill="B"/><path d="M32 51v10"/>',
  pen: '<path d="M44 6l14 14-30 30-16 4 4-16Z" fill="A"/><path d="M38 12l14 14"/><path d="M16 38l10 10" /><path d="M12 54l4-16 12 12Z" fill="B"/>',
  atom: '<ellipse cx="32" cy="32" rx="27" ry="10"/><ellipse cx="32" cy="32" rx="27" ry="10" transform="rotate(60 32 32)"/><ellipse cx="32" cy="32" rx="27" ry="10" transform="rotate(-60 32 32)"/><circle cx="32" cy="32" r="7" fill="A"/>',
  crown: '<path d="M8 46 6 16l14 12 12-20 12 20 14-12-2 30Z" fill="A"/><rect x="8" y="46" width="48" height="10" fill="B"/><circle cx="32" cy="34" r="4" fill="B"/>',
  palm: '<path d="M30 58c2-14 2-26-2-36"/><path d="M28 22C20 10 8 12 4 18c8-2 16 0 24 4Z" fill="A"/><path d="M28 22c6-12 20-14 28-8-8 0-18 2-28 8Z" fill="A"/><path d="M28 22c-2-10 6-18 14-18-6 4-10 10-14 18Z" fill="A"/><path d="M6 58h48" /><circle cx="46" cy="44" r="7" fill="B"/>',
  plane: '<path d="M58 8 28 30l-14-4-6 5 14 8 4 4 8 14 5-6-4-14L58 8Z" fill="A"/><path d="M58 8 36 36" /><path d="M8 58l10-10" />',
  clapper: '<rect x="6" y="24" width="52" height="32" rx="2" fill="A"/><path d="M6 12l50-6 2 12-52 6Z" fill="B"/><path d="M18 11l6 11M32 9l6 11M46 7l6 11"/><path d="M14 36h36M14 44h24"/>',
  horseshoe: '<path d="M14 58V30a18 18 0 0 1 36 0v28h-10V30a8 8 0 0 0-16 0v28Z" fill="A"/><circle cx="19" cy="34" r="1.8" fill="#111"/><circle cx="45" cy="34" r="1.8" fill="#111"/><circle cx="19" cy="46" r="1.8" fill="#111"/><circle cx="45" cy="46" r="1.8" fill="#111"/><circle cx="32" cy="17" r="1.8" fill="#111"/>',
  cloud: '<path d="M16 48a10 10 0 0 1 0-20 14 14 0 0 1 27-4 11 11 0 0 1 5 24Z" fill="A"/><path d="M22 54l-2 6M32 54l-2 6M42 54l-2 6"/>',
  eye: '<path d="M4 32s10-18 28-18 28 18 28 18-10 18-28 18S4 32 4 32Z" fill="A"/><circle cx="32" cy="32" r="10" fill="B"/><circle cx="32" cy="32" r="4" fill="#111"/>',
  scales: '<path d="M32 8v46M18 56h28M10 16h44"/><path d="M10 16 4 34h12Z"/><path d="M4 34a6 5 0 0 0 12 0Z" fill="A"/><path d="M54 16l-6 18h12Z"/><path d="M48 34a6 5 0 0 0 12 0Z" fill="A"/><circle cx="32" cy="10" r="4" fill="B"/>',
  parachute: '<path d="M6 28a26 22 0 0 1 52 0Z" fill="A"/><path d="M19 28a13 20 0 0 1 26 0" /><path d="M6 28l24 22M58 28 34 50M24 28l6 22M40 28l-6 22"/><rect x="27" y="48" width="10" height="12" rx="2" fill="B"/>',
  door: '<rect x="14" y="4" width="36" height="54" fill="A"/><rect x="20" y="10" width="24" height="18" fill="B"/><rect x="20" y="32" width="24" height="20" fill="B"/><circle cx="42" cy="30" r="2.5" fill="#111"/><path d="M6 58h52"/>',
  flame: '<path d="M32 4c4 12 18 18 18 34a18 18 0 0 1-36 0c0-8 4-14 8-18 0 8 4 12 6 12-2-10 0-20 4-28Z" fill="A"/><path d="M32 34c3 5 8 7 8 13a8 8 0 0 1-16 0c0-6 5-8 8-13Z" fill="B"/>',
  rocket: '<path d="M32 4c10 8 14 20 12 36H20C18 24 22 12 32 4Z" fill="A"/><circle cx="32" cy="22" r="5" fill="B"/><path d="M20 30l-9 12 10 0Z" fill="B"/><path d="M44 30l9 12-10 0Z" fill="B"/><path d="M26 44l6 14 6-14Z" fill="B"/>',
  sun: '<circle cx="32" cy="32" r="13" fill="A"/><path d="M32 4v8M32 52v8M4 32h8M52 32h8M12 12l6 6M46 46l6 6M52 12l-6 6M12 52l6-6"/>',
  key: '<circle cx="18" cy="32" r="12" fill="A"/><circle cx="18" cy="32" r="4" fill="B"/><path d="M30 28h28v8h-6v8h-8v-8H30Z" fill="A"/>',
  spiral: '<path d="M32 32m-3 0a3 3 0 1 1 6 0a7 7 0 1 1-14 0a11 11 0 1 1 22 0a15 15 0 1 1-30 0a19 19 0 1 1 38 0a23 23 0 1 1-46 0"/><circle cx="32" cy="32" r="3" fill="A"/>',
  plus: '<path d="M24 6h16v18h18v16H40v18H24V40H6V24h18Z" fill="A"/><circle cx="32" cy="32" r="5" fill="B"/>',
  planet: '<circle cx="32" cy="32" r="16" fill="A"/><path d="M20 26c6 2 16 2 24-2" /><ellipse cx="32" cy="34" rx="29" ry="8" transform="rotate(-18 32 32)"/><circle cx="54" cy="12" r="3" fill="B"/><circle cx="10" cy="52" r="2" fill="B"/>',
  clock: '<circle cx="32" cy="32" r="26" fill="A"/><circle cx="32" cy="32" r="20" fill="B"/><path d="M32 18v14l9 5"/><path d="M32 6v4M32 54v4M6 32h4M54 32h4"/>',
  phone: '<rect x="16" y="4" width="32" height="56" rx="6" fill="A"/><rect x="21" y="11" width="22" height="36" rx="2" fill="B"/><path d="M28 53h8"/>',
  cap: '<path d="M8 38c0-16 12-26 26-26 14 0 22 10 22 22v4Z" fill="A"/><path d="M4 40c10-4 40-4 54-2v8c-18-3-40-3-54 0Z" fill="B"/><path d="M30 12c-2 8-2 18 0 26"/>',
  leaf: '<path d="M8 56C8 26 26 8 56 8c0 30-18 48-48 48Z" fill="A"/><path d="M8 56 44 20M24 40h12M32 32v-10"/>',
  bulb: '<path d="M32 6a16 16 0 0 0-10 28c3 3 4 6 4 10h12c0-4 1-7 4-10A16 16 0 0 0 32 6Z" fill="A"/><rect x="25" y="44" width="14" height="10" fill="B"/><path d="M25 49h14M28 58h8"/><path d="M26 22a6 6 0 0 1 6-6"/>',
  envelope: '<rect x="6" y="14" width="52" height="36" rx="2" fill="A"/><path d="M6 14l26 22 26-22"/><circle cx="46" cy="40" r="6" fill="B"/>',
  globe: '<circle cx="32" cy="32" r="26" fill="A"/><path d="M6 32h52M32 6c-10 8-10 44 0 52M32 6c10 8 10 44 0 52"/><path d="M14 18c8 4 28 4 36 0M14 46c8-4 28-4 36 0"/>',
  dollar: '<circle cx="32" cy="32" r="26" fill="A"/><circle cx="32" cy="32" r="19" fill="B"/><path d="M39 23c-2-3-5-4-8-4-4 0-7 2-7 6 0 8 16 5 16 13 0 4-3 6-8 6-3 0-7-1-9-4M32 14v36"/>',
  plate: '<circle cx="34" cy="32" r="22" fill="A"/><circle cx="34" cy="32" r="13" fill="B"/><path d="M6 8v18a4 4 0 0 0 4 4v26M6 8v10M10 8v10M14 8v10"/>',
  target: '<circle cx="32" cy="32" r="26" fill="A"/><circle cx="32" cy="32" r="17" fill="B"/><circle cx="32" cy="32" r="8" fill="A"/><path d="M32 32 58 6M50 6h8v8"/>',
  ball: '<circle cx="32" cy="32" r="26" fill="A"/><path d="M32 20l10 8-4 12H26l-4-12Z" fill="#111"/><path d="M32 20V8M42 28l12-4M38 40l7 10M26 40l-7 10M22 28l-12-4"/>',
  camera: '<rect x="4" y="22" width="42" height="30" rx="3" fill="A"/><path d="M46 30l14-8v28l-14-8Z" fill="B"/><circle cx="16" cy="13" r="8" fill="B"/><circle cx="34" cy="13" r="8" fill="B"/><circle cx="18" cy="37" r="5"/>',
  pawn: '<circle cx="32" cy="15" r="9" fill="A"/><path d="M24 26h16l-2 6h-12Z" fill="A"/><path d="M26 32h12l4 18H22Z" fill="A"/><rect x="12" y="50" width="40" height="8" rx="2" fill="B"/>',
  cake: '<rect x="10" y="30" width="44" height="26" rx="2" fill="A"/><path d="M10 38c7 6 15-6 22 0s15 6 22 0"/><rect x="29" y="16" width="6" height="14" fill="B"/><path d="M32 4c-4 5 0 9 0 9s4-4 0-9Z" fill="B"/><path d="M6 56h52"/>',
  drop: '<path d="M32 4C24 18 14 28 14 40a18 18 0 0 0 36 0C50 28 40 18 32 4Z" fill="A"/><path d="M22 40a10 10 0 0 0 8 10"/>',
  pill: '<path d="M14 42 42 14a10 10 0 0 1 14 14L28 56A10 10 0 0 1 14 42Z" fill="A"/><path d="M21 49 49 21 42 14 14 42Z" fill="B" /><path d="M28 28l14 14"/>',
  building: '<rect x="10" y="10" width="26" height="48" fill="A"/><rect x="36" y="24" width="18" height="34" fill="B"/><path d="M16 18h4M26 18h4M16 28h4M26 28h4M16 38h4M26 38h4M42 32h6M42 42h6M4 58h56"/>',
  briefcase: '<rect x="6" y="20" width="52" height="34" rx="3" fill="A"/><path d="M24 20v-8h16v8M6 34h52"/><rect x="27" y="30" width="10" height="9" fill="B"/>',
  moon: '<path d="M40 6a26 26 0 1 0 18 40A21 21 0 0 1 40 6Z" fill="A"/><circle cx="22" cy="30" r="3" fill="B"/><circle cx="30" cy="44" r="4" fill="B"/><path d="M52 10l2 4 4 2-4 2-2 4-2-4-4-2 4-2Z" fill="B"/>',
  laptop: '<rect x="12" y="10" width="40" height="30" rx="2" fill="A"/><rect x="17" y="15" width="30" height="20" fill="B"/><path d="M4 46h56l-4 10H8Z" fill="A"/><path d="M26 51h12"/>',
  mountain: '<path d="M2 56 22 18l10 16 8-12 22 34Z" fill="A"/><path d="M22 18l-7 13 7-3 5 4Z" fill="B"/><circle cx="50" cy="12" r="6" fill="B"/>',
  gem: '<path d="M18 10h28l12 14-26 32L6 24Z" fill="A"/><path d="M6 24h52M18 10l6 14 8 32 8-32 6-14M24 24l8-14 8 14"/>',
  drum: '<path d="M8 24v20c0 5 11 9 24 9s24-4 24-9V24" fill="A"/><ellipse cx="32" cy="24" rx="24" ry="8" fill="B"/><path d="M10 30l10 20M24 32l8 20M40 32l-8 20M54 30l-10 20"/><path d="M42 4 30 18M56 8 40 20"/>',
  ring: '<circle cx="32" cy="38" r="19" stroke-width="12"/><circle cx="32" cy="38" r="19" stroke="A" stroke-width="5"/><path d="M24 12l8-8 8 8-8 7Z" fill="B"/>'
};

export const COLOR_PALETTE = [
  "#F6D32D",
  "#3CC4DE",
  "#3DBE6A",
  "#E4509E",
  "#EF4A3A",
  "#3F6BF0",
  "#FFFFFF"
];

export const COLOR_PAIRS: Record<string, string> = {
  "#F6D32D": "#E4509E",
  "#3CC4DE": "#F6D32D",
  "#3DBE6A": "#FFFFFF",
  "#E4509E": "#F6D32D",
  "#EF4A3A": "#FFFFFF",
  "#3F6BF0": "#F6D32D",
  "#FFFFFF": "#3CC4DE"
};

export interface LanguagePreset {
  name: string;
  flag: string;
  code: string;
}

export const POPULAR_LANGUAGES: LanguagePreset[] = [
  { name: "Korean", flag: "🇰🇷", code: "ko" },
  { name: "Japanese", flag: "🇯🇵", code: "ja" },
  { name: "Telugu", flag: "🇮🇳", code: "te" },
  { name: "Hindi", flag: "🇮🇳", code: "hi" },
  { name: "English", flag: "🇺🇸", code: "en" },
  { name: "Spanish", flag: "🇪🇸", code: "es" },
  { name: "French", flag: "🇫🇷", code: "fr" },
  { name: "German", flag: "🇩🇪", code: "de" },
  { name: "Mandarin", flag: "🇨🇳", code: "zh" },
  { name: "Tamil", flag: "🇮🇳", code: "ta" },
  { name: "Malayalam", flag: "🇮🇳", code: "ml" },
  { name: "Italian", flag: "🇮🇹", code: "it" },
  { name: "Turkish", flag: "🇹🇷", code: "tr" },
  { name: "Thai", flag: "🇹🇭", code: "th" },
  { name: "Arabic", flag: "🇦🇪", code: "ar" },
  { name: "Portuguese", flag: "🇧🇷", code: "pt" },
  { name: "Other", flag: "🌍", code: "other" },
];

export function getLanguageFlag(langName?: string): string {
  if (!langName) return "🌐";
  const found = POPULAR_LANGUAGES.find(
    (l) =>
      l.name.toLowerCase() === langName.toLowerCase() ||
      langName.toLowerCase().includes(l.name.toLowerCase())
  );
  return found ? found.flag : "🌐";
}

export function customItemToChannelItem(
  item: import("./types").CustomMediaItem,
  index = 0
): ChannelMediaItem {
  const isMovie = item.kind === "film";
  const totalMins =
    item.runtimeMins || (isMovie ? 120 : (item.totalEpisodes || item.episode || 1) * 45);
  const hours = totalMins / 60;
  return {
    kind: "tracker",
    id: item.id,
    rank: index + 1,
    title: item.title,
    years: isMovie ? undefined : item.year ? String(item.year) : "Ongoing",
    year: item.year,
    start: item.year || new Date().getFullYear(),
    network: isMovie ? undefined : item.where,
    where: item.where || "Streaming",
    genre: item.genre || (item.kind === "anime" ? "Anime" : "Entertainment"),
    imdb: item.rating ? item.rating * 2 : 0,
    icon:
      item.icon || (item.kind === "anime" ? "sword" : isMovie ? "clapper" : "tv"),
    blurb:
      item.notes ||
      (isMovie
        ? `Logged in ${item.lang}${item.year ? ` · ${item.year}` : ""}.`
        : `Logged in ${item.lang}${
            item.episode ? ` · currently on Episode ${item.episode}` : ""
          }.`),
    sub: item.kind.toUpperCase(),
    hours,
    mins: item.runtimeMins || (isMovie ? 120 : 45),
    lang: item.lang,
    langFlag: item.langFlag || getLanguageFlag(item.lang),
    custom: true,
    customKind: item.kind,
    season: isMovie ? undefined : item.season,
    episode: isMovie ? undefined : item.episode,
    totalEpisodes: isMovie ? undefined : item.totalEpisodes,
  };
}

export function artFor(item: ChannelMediaItem): ArtMeta {
  const isFilm = item.kind === "film" || item.customKind === "film";
  const isTracker = item.kind === "tracker";
  const bg =
    (item as any).color ||
    COLOR_PALETTE[
      (item.rank * 3 + (isFilm ? 2 : isTracker ? 4 : 0)) % 7
    ];
  const a = COLOR_PAIRS[bg] || "#E4509E";
  let b = bg === "#FFFFFF" ? "#F6D32D" : "#FFFFFF";
  if (a === b) b = "#3CC4DE";
  const pat = "p" + ((item.rank + (isFilm ? 2 : isTracker ? 3 : 0)) % 5);
  const iconMarkup = MOTIF_ICONS[item.icon] || MOTIF_ICONS.tv;
  const svg = `<svg class="ic" viewBox="0 0 64 64" aria-hidden="true"><g fill="none" stroke="#111" stroke-width="3.2" stroke-linejoin="round" stroke-linecap="round">${iconMarkup
    .replace(/(fill|stroke)="A"/g, `$1="${a}"`)
    .replace(/fill="B"/g, `fill="${b}"`)}</g></svg>`;

  const stripHtml = isFilm
    ? `<span class="ch100-strip strip" aria-hidden="true">${"<i></i>".repeat(12)}</span>`
    : "";

  return { bg, pat, svg, stripHtml };
}

export const fmtH = (h: number): string => {
  const rounded = Math.round(h);
  if (rounded === 0) return "0 h";
  if (rounded < 1 && h > 0) return "<1 h";
  return rounded >= 100
    ? `${rounded.toLocaleString()} h`
    : `${rounded} h`;
};

export const fmtM = (m: number): string =>
  `${Math.floor(m / 60)}h ${String(m % 60).padStart(2, "0")}m`;

export const bingeDays = (h: number): number => Math.max(1, Math.ceil(h / 2));

export const CATALOGS: Record<MediaKind, CatalogConfig> = {
  tv: {
    items: SHOWS,
    noun: "shows",
    one: "show",
    eyebrow: "The New York Times list · 2026",
    h1: 'The 100 best TV shows of <span class="hl">this century</span>',
    lede: "Mark what you've seen, what you're watching and what's next. Rate the ones you finished, see how long each show takes, and find where it streams.",
    set: "Test card · 100 channels",
    rankPre: "CH",
    icon: "📺",
    search: "Search title, network, streamer, genre…",
    band: (i) => (i.hours < 10 ? "short" : i.hours < 50 ? "medium" : "long"),
    bands: [
      ["short", "Under 10 h"],
      ["medium", "10–50 h"],
      ["long", "50 h or more"],
    ],
  },
  film: {
    items: FILMS,
    noun: "movies",
    one: "movie",
    eyebrow: "The New York Times list · 2025",
    h1: 'The 100 best movies of <span class="hl">this century</span>',
    lede: "Chosen by more than 500 filmmakers and actors. Track what you've seen, rate it, and pick tonight's movie by runtime, language or where it streams.",
    set: "Reel check · 100 films",
    rankPre: "No.",
    icon: "🎬",
    search: "Search title, director, language, genre…",
    band: (i) => (i.mins < 110 ? "short" : i.mins < 140 ? "medium" : "long"),
    bands: [
      ["short", "Under 1h 50m"],
      ["medium", "1h 50m – 2h 20m"],
      ["long", "2h 20m or more"],
    ],
  },
  tracker: {
    items: [],
    noun: "titles",
    one: "title",
    eyebrow: "Personal Watch Diary · Any Language · Any Medium",
    h1: 'What I\'m watching <span class="hl">right now</span>',
    lede: "Your personal multi-language entertainment canon. Track what you're binging in Korean, Japanese, Telugu, Hindi, Spanish or English, update episode progress, and rate.",
    set: "Live Radar · Personal Watch Log",
    rankPre: "LOG",
    icon: "⚡",
    search: "Search custom title, language, platform, notes…",
    band: (i) => (i.hours < 5 ? "short" : i.hours < 25 ? "medium" : "long"),
    bands: [
      ["short", "Quick watch (< 5 h)"],
      ["medium", "Medium (5–25 h)"],
      ["long", "Epic binge (> 25 h)"],
    ],
  },
};

const cleanTitle = (t: string) => t.replace(/\s*\(.*?\)/, "");

export const jwUrl = (item: ChannelMediaItem): string =>
  "https://www.justwatch.com/us/search?q=" +
  encodeURIComponent(cleanTitle(item.title));

export const imdbUrl = (item: ChannelMediaItem): string =>
  "https://www.imdb.com/find/?s=tt&q=" +
  encodeURIComponent(
    cleanTitle(item.title) + (item.kind === "film" ? ` ${item.year}` : "")
  );
