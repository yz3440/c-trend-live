import type { Camera, Source } from "./types";
import { proxyStreamUrl } from "../player/hls";

const SOURCE_ID = "earthcam";

type Category = "city" | "beach" | "nature" | "landmark" | "wildlife" | "transit";

interface Seed {
  id: string;
  label: string;
  city: string;
  country: string;
  category: Category;
}

/**
 * Curated EarthCam stream list. Each `id` is the .flv-suffixed identifier
 * that EarthCam's embed.php accepts as `?vid=`. IDs were verified against
 * real EarthCam page HTML / playlist API responses — do not edit blindly.
 */
const SEEDS: Seed[] = [
  // Anguilla
  { id: "14178.flv",            label: "Barnes Bay",                    city: "Meads Bay",            country: "Anguilla",               category: "beach"    },
  { id: "47194.flv",            label: "Aleta Pool",                    city: "Meads Bay",            country: "Anguilla",               category: "beach"    },
  { id: "48998.flv",            label: "Meads Bay",                     city: "Meads Bay",            country: "Anguilla",               category: "beach"    },
  // Aruba
  { id: "16823.flv",            label: "Amsterdam Manor Beach",         city: "Oranjestad",           country: "Aruba",                  category: "beach"    },
  { id: "20095.flv",            label: "Casa del Mar Resort",           city: "Oranjestad",           country: "Aruba",                  category: "beach"    },
  { id: "6723.flv",             label: "Druif Beach",                   city: "Oranjestad",           country: "Aruba",                  category: "beach"    },
  // Botswana
  { id: "36588.flv",            label: "Camp Kuzuma",                   city: "Chobe",                country: "Botswana",               category: "wildlife" },
  // British Virgin Islands
  { id: "31176.flv",            label: "Scrub Island",                  city: "Tortola",              country: "British Virgin Islands", category: "beach"    },
  // Canada
  { id: "9298.flv",             label: "CN Tower West",                 city: "Toronto",              country: "Canada",                 category: "landmark" },
  { id: "9299.flv",             label: "CN Tower East",                 city: "Toronto",              country: "Canada",                 category: "landmark" },
  { id: "18701.flv",            label: "CN Tower View",                 city: "Toronto",              country: "Canada",                 category: "landmark" },
  { id: "15527.flv",            label: "Niagara Falls",                 city: "Niagara Falls",        country: "Canada",                 category: "nature"   },
  // Costa Rica
  { id: "14789.flv",            label: "Arenal Volcano",                city: "La Fortuna",           country: "Costa Rica",             category: "nature"   },
  // Georgia
  { id: "17101.flv",            label: "Freedom Square",                city: "Tbilisi",              country: "Georgia",                category: "city"     },
  { id: "22237.flv",            label: "Mtkvari River",                 city: "Tbilisi",              country: "Georgia",                category: "city"     },
  // Indonesia
  { id: "4337.flv",             label: "Elephant Safari Trail",         city: "Bali",                 country: "Indonesia",              category: "wildlife" },
  { id: "4338.flv",             label: "Elephant Bathing Pool",         city: "Bali",                 country: "Indonesia",              category: "wildlife" },
  // Ireland
  { id: "24322.flv",            label: "Temple Bar",                    city: "Dublin",               country: "Ireland",                category: "city"     },
  // New Zealand
  { id: "9189.flv",             label: "Queenstown",                    city: "Queenstown",           country: "New Zealand",            category: "nature"   },
  // Sint Maarten
  { id: "33216.flv",            label: "Little Bay Beach",              city: "Philipsburg",          country: "Sint Maarten",           category: "beach"    },
  // Spain
  { id: "21204.flv",            label: "Tamariu Beach",                 city: "Tamariu",              country: "Spain",                  category: "beach"    },
  // US Virgin Islands
  { id: "6528.flv",             label: "Frenchman's Cove",              city: "St. Thomas",           country: "US Virgin Islands",      category: "beach"    },
  { id: "24338.flv",            label: "Mountain Top Overlook",         city: "St. Thomas",           country: "US Virgin Islands",      category: "nature"   },
  // USA
  { id: "27737.flv",            label: "Asheville Skyline",             city: "Asheville",            country: "USA",                    category: "city"     },
  { id: "13323.flv",            label: "Atlantic Highlands",            city: "Atlantic Highlands",   country: "USA",                    category: "beach"    },
  { id: "6998.flv",             label: "Fort McHenry",                  city: "Baltimore",            country: "USA",                    category: "landmark" },
  { id: "nabtrcam1.flv",        label: "Blacktip Reef Shark",           city: "Baltimore",            country: "USA",                    category: "wildlife" },
  { id: "napcrcam1.flv",        label: "Tropical Fish Reef",            city: "Baltimore",            country: "USA",                    category: "wildlife" },
  { id: "najfcam1.flv",         label: "Jellyfish",                     city: "Baltimore",            country: "USA",                    category: "wildlife" },
  { id: "32167.flv",            label: "Osprey Nest",                   city: "Bar Harbor",           country: "USA",                    category: "wildlife" },
  { id: "17568.flv",            label: "Adirondacks Lake",              city: "Blue Mountain Lake",   country: "USA",                    category: "nature"   },
  { id: "18985.flv",            label: "Blue Mountain Lake Pond",       city: "Blue Mountain Lake",   country: "USA",                    category: "nature"   },
  { id: "9593.flv",             label: "Bristol Motor Speedway",        city: "Bristol",              country: "USA",                    category: "landmark" },
  { id: "19459.flv",            label: "Cincinnati Skyline",            city: "Cincinnati",           country: "USA",                    category: "city"     },
  { id: "8939.flv",             label: "Cleveland Skyline",             city: "Cleveland",            country: "USA",                    category: "city"     },
  { id: "24715.flv",            label: "Red Wolf",                      city: "Columbia",             country: "USA",                    category: "wildlife" },
  { id: "24985.flv",            label: "Red Wolf Den",                  city: "Columbia",             country: "USA",                    category: "wildlife" },
  { id: "27172.flv",            label: "Reunion Tower",                 city: "Dallas",               country: "USA",                    category: "landmark" },
  { id: "30902.flv",            label: "Zion Summit",                   city: "Duck Creek Village",   country: "USA",                    category: "nature"   },
  { id: "30903.flv",            label: "Strawberry Point",              city: "Duck Creek Village",   country: "USA",                    category: "nature"   },
  { id: "31746.flv",            label: "Englewood Beach",               city: "Englewood",            country: "USA",                    category: "beach"    },
  { id: "8891.flv",             label: "Fort Lauderdale Marina",        city: "Fort Lauderdale",      country: "USA",                    category: "transit"  },
  { id: "25086.flv",            label: "Everglades",                    city: "Fort Lauderdale",      country: "USA",                    category: "nature"   },
  { id: "40555.flv",            label: "Port of Galveston Terminal 10", city: "Galveston",            country: "USA",                    category: "transit"  },
  { id: "40556.flv",            label: "Port of Galveston Terminal 28", city: "Galveston",            country: "USA",                    category: "transit"  },
  { id: "40557.flv",            label: "Port of Galveston Terminal 25", city: "Galveston",            country: "USA",                    category: "transit"  },
  { id: "13706.flv",            label: "Michigan Snowman",              city: "Gaylord",              country: "USA",                    category: "wildlife" },
  { id: "20691.flv",            label: "Pensacola Watersports",         city: "Gulf Breeze",          country: "USA",                    category: "beach"    },
  { id: "27160.flv",            label: "Waikiki Beach",                 city: "Honolulu",             country: "USA",                    category: "beach"    },
  { id: "15659.flv",            label: "Uptown Skyline",                city: "Houston",              country: "USA",                    category: "city"     },
  { id: "15426.flv",            label: "African Penguin",               city: "Idaho Falls",          country: "USA",                    category: "wildlife" },
  { id: "47723.flv",            label: "Idyllwild",                     city: "Idyllwild",            country: "USA",                    category: "nature"   },
  { id: "14619.flv",            label: "Lake George",                   city: "Lake George",          country: "USA",                    category: "nature"   },
  { id: "15342.flv",            label: "Edgewood Tahoe Resort",         city: "Lake Tahoe",           country: "USA",                    category: "nature"   },
  { id: "20586.flv",            label: "Osprey Nest Lamoine",           city: "Lamoine",              country: "USA",                    category: "wildlife" },
  { id: "45190.flv",            label: "Lantana Beach",                 city: "Lantana",              country: "USA",                    category: "beach"    },
  { id: "3916.flv",             label: "Bellagio Conservatory",         city: "Las Vegas",            country: "USA",                    category: "landmark" },
  { id: "16812.flv",            label: "Fremont Street",                city: "Las Vegas",            country: "USA",                    category: "city"     },
  { id: "16813.flv",            label: "Las Vegas Karaoke",             city: "Las Vegas",            country: "USA",                    category: "city"     },
  { id: "21001.flv",            label: "Elvis Wedding Chapel",          city: "Las Vegas",            country: "USA",                    category: "landmark" },
  { id: "36330.flv",            label: "South Las Vegas Strip",         city: "Las Vegas",            country: "USA",                    category: "city"     },
  { id: "42116.flv",            label: "Welcome to Fabulous Las Vegas", city: "Las Vegas",            country: "USA",                    category: "landmark" },
  { id: "9313.flv",             label: "Anglins Pier",                  city: "Lauderdale-By-The-Sea", country: "USA",                   category: "beach"    },
  { id: "9314.flv",             label: "Anglins Square",                city: "Lauderdale-By-The-Sea", country: "USA",                   category: "city"     },
  { id: "19639.flv",            label: "Sand Cay Beach",                city: "Longboat Key",         country: "USA",                    category: "beach"    },
  { id: "14443.flv",            label: "Zoo Miami Meerkat",             city: "Miami",                country: "USA",                    category: "wildlife" },
  { id: "29969.flv",            label: "News Cafe Ocean Drive",         city: "Miami",                country: "USA",                    category: "city"     },
  { id: "13525.flv",            label: "Montauk",                       city: "Montauk",              country: "USA",                    category: "beach"    },
  { id: "14327.flv",            label: "Osprey Nest Lake Norman",       city: "Mooresville",          country: "USA",                    category: "wildlife" },
  { id: "17016.flv",            label: "Myrtle Beach North View",       city: "Myrtle Beach",         country: "USA",                    category: "beach"    },
  { id: "17017.flv",            label: "Myrtle Beach Volleyball",       city: "Myrtle Beach",         country: "USA",                    category: "beach"    },
  { id: "32669.flv",            label: "Downtown Mystic",               city: "Mystic",               country: "USA",                    category: "city"     },
  { id: "8763.flv",             label: "Naples Pier Sunset",            city: "Naples",               country: "USA",                    category: "beach"    },
  { id: "24935.flv",            label: "Lower Broadway",                city: "Nashville",            country: "USA",                    category: "city"     },
  { id: "4280.flv",             label: "Bourbon Street",                city: "New Orleans",          country: "USA",                    category: "city"     },
  { id: "4282.flv",             label: "Cats Meow Balcony",             city: "New Orleans",          country: "USA",                    category: "city"     },
  { id: "1415.flv",             label: "Times Square South 4K",         city: "New York City",        country: "USA",                    category: "city"     },
  { id: "4089.flv",             label: "Statue of Liberty Crown",       city: "New York City",        country: "USA",                    category: "landmark" },
  { id: "485.flv",              label: "Times Square North HD",         city: "New York City",        country: "USA",                    category: "city"     },
  { id: "4717.flv",             label: "Times Square FanCam",           city: "New York City",        country: "USA",                    category: "city"     },
  { id: "4017timessquare.flv",  label: "Times Square Two HD",           city: "New York City",        country: "USA",                    category: "city"     },
  { id: "5092.flv",             label: "East River Skyline",            city: "New York City",        country: "USA",                    category: "city"     },
  { id: "8592.flv",             label: "9/11 Memorial",                 city: "New York City",        country: "USA",                    category: "landmark" },
  { id: "9974.flv",             label: "Times Square Street",           city: "New York City",        country: "USA",                    category: "city"     },
  { id: "13777.flv",            label: "New York Harbor",               city: "New York City",        country: "USA",                    category: "city"     },
  { id: "13903.flv",            label: "Midtown 4K",                    city: "New York City",        country: "USA",                    category: "city"     },
  { id: "15559.flv",            label: "Times Square Robo 3",           city: "New York City",        country: "USA",                    category: "city"     },
  { id: "20489.flv",            label: "Empire State Building",         city: "New York City",        country: "USA",                    category: "landmark" },
  { id: "21380.flv",            label: "Coney Island",                  city: "New York City",        country: "USA",                    category: "beach"    },
  { id: "hdtimes10.flv",        label: "Times Square 4K",               city: "New York City",        country: "USA",                    category: "city"     },
  { id: "libertyHD1.flv",       label: "Statue of Liberty Harbor",      city: "New York City",        country: "USA",                    category: "landmark" },
  { id: "statueoflibertyHD.flv",label: "Statue of Liberty",             city: "New York City",        country: "USA",                    category: "landmark" },
  { id: "9602.flv",             label: "Newport Coast",                 city: "Newport Coast",        country: "USA",                    category: "beach"    },
  { id: "13012.flv",            label: "Sandy Cove Chesapeake",         city: "North East",           country: "USA",                    category: "nature"   },
  { id: "4918.flv",             label: "Paterson Falls",                city: "Paterson",             country: "USA",                    category: "nature"   },
  { id: "31727.flv",            label: "Falcon Nest UC Davis",          city: "Sacramento",           country: "USA",                    category: "wildlife" },
  { id: "31728.flv",            label: "Falcon UC Davis",               city: "Sacramento",           country: "USA",                    category: "wildlife" },
  { id: "8368.flv",             label: "Minnesota State Fair",          city: "Saint Paul",            country: "USA",                   category: "landmark" },
  { id: "20223.flv",            label: "Saint Paul Skyline",            city: "Saint Paul",            country: "USA",                   category: "city"     },
  { id: "6975.flv",             label: "Seaside Heights Boardwalk",     city: "Seaside Heights",      country: "USA",                    category: "beach"    },
  { id: "15195.flv",            label: "Sedona Red Rocks",              city: "Sedona",               country: "USA",                    category: "nature"   },
  { id: "10669.flv",            label: "Silver Beach Lake Michigan",    city: "St. Joseph",           country: "USA",                    category: "beach"    },
  { id: "meprd_garch.flv",      label: "Gateway Arch",                  city: "St. Louis",            country: "USA",                    category: "landmark" },
  { id: "24963.flv",            label: "Stony Brook Village Lawn",      city: "Stony Brook",          country: "USA",                    category: "city"     },
  { id: "13650.flv",            label: "Blackberry Mountain",           city: "Walland",              country: "USA",                    category: "nature"   },
  { id: "44900.flv",            label: "Kennedy Center",                city: "Washington",           country: "USA",                    category: "landmark" },
  { id: "22251.flv",            label: "Lincoln Harbor",                city: "Weehawken",            country: "USA",                    category: "city"     },
  { id: "14014.flv",            label: "Manatee Lagoon",                city: "West Palm Beach",      country: "USA",                    category: "wildlife" },
  { id: "23997.flv",            label: "Underwater Manatee",            city: "West Palm Beach",      country: "USA",                    category: "wildlife" },
];

/**
 * IANA timezone lookup keyed by `${city}|${country}` (with `${country}` as a
 * fallback). Hand-curated to match the SEEDS list above. Adding a new seed in
 * a city not listed here means local-time display will silently fall back to
 * UTC — keep them in sync.
 */
const TIMEZONES: Record<string, string> = {
  // Country-level fallbacks
  "Anguilla":                    "America/Anguilla",
  "Aruba":                       "America/Aruba",
  "Botswana":                    "Africa/Gaborone",
  "British Virgin Islands":      "America/Tortola",
  "Costa Rica":                  "America/Costa_Rica",
  "Georgia":                     "Asia/Tbilisi",
  "Indonesia":                   "Asia/Makassar",     // Bali
  "Ireland":                     "Europe/Dublin",
  "New Zealand":                 "Pacific/Auckland",
  "Sint Maarten":                "America/Lower_Princes",
  "Spain":                       "Europe/Madrid",
  "US Virgin Islands":           "America/St_Thomas",
  "Canada":                      "America/Toronto",   // all current Canadian seeds are Eastern
  // City-specific (US — many time zones)
  "Asheville|USA":               "America/New_York",
  "Atlantic Highlands|USA":      "America/New_York",
  "Baltimore|USA":                "America/New_York",
  "Bar Harbor|USA":              "America/New_York",
  "Blue Mountain Lake|USA":      "America/New_York",
  "Bristol|USA":                 "America/New_York",  // Bristol Motor Speedway, TN — Eastern
  "Cincinnati|USA":              "America/New_York",
  "Cleveland|USA":               "America/New_York",
  "Columbia|USA":                "America/New_York",  // Columbia, SC (red wolf)
  "Dallas|USA":                  "America/Chicago",
  "Duck Creek Village|USA":      "America/Denver",    // Utah
  "Englewood|USA":               "America/New_York",  // Englewood Beach, FL
  "Fort Lauderdale|USA":         "America/New_York",
  "Galveston|USA":               "America/Chicago",
  "Gaylord|USA":                 "America/New_York",  // Michigan, Eastern
  "Gulf Breeze|USA":             "America/Chicago",   // FL panhandle (Pensacola area)
  "Honolulu|USA":                "Pacific/Honolulu",
  "Houston|USA":                 "America/Chicago",
  "Idaho Falls|USA":             "America/Boise",
  "Idyllwild|USA":               "America/Los_Angeles",
  "Lake George|USA":             "America/New_York",
  "Lake Tahoe|USA":              "America/Los_Angeles",
  "Lamoine|USA":                 "America/New_York",
  "Lantana|USA":                 "America/New_York",
  "Las Vegas|USA":               "America/Los_Angeles",
  "Lauderdale-By-The-Sea|USA":   "America/New_York",
  "Longboat Key|USA":            "America/New_York",
  "Miami|USA":                   "America/New_York",
  "Montauk|USA":                 "America/New_York",
  "Mooresville|USA":             "America/New_York",
  "Myrtle Beach|USA":            "America/New_York",
  "Mystic|USA":                  "America/New_York",
  "Naples|USA":                  "America/New_York",
  "Nashville|USA":               "America/Chicago",
  "New Orleans|USA":             "America/Chicago",
  "New York City|USA":           "America/New_York",
  "Newport Coast|USA":           "America/Los_Angeles",
  "North East|USA":              "America/New_York",
  "Paterson|USA":                "America/New_York",
  "Sacramento|USA":              "America/Los_Angeles",
  "Saint Paul|USA":              "America/Chicago",
  "Seaside Heights|USA":         "America/New_York",
  "Sedona|USA":                  "America/Phoenix",   // Arizona, no DST
  "St. Joseph|USA":              "America/Detroit",   // MI, Eastern
  "St. Louis|USA":               "America/Chicago",
  "Stony Brook|USA":             "America/New_York",
  "Walland|USA":                 "America/New_York",  // TN — Eastern
  "Washington|USA":              "America/New_York",
  "Weehawken|USA":               "America/New_York",
  "West Palm Beach|USA":         "America/New_York",
};

function lookupTimezone(city: string, country: string): string | undefined {
  return TIMEZONES[`${city}|${country}`] ?? TIMEZONES[country];
}

/**
 * Resolve an EarthCam stream ID to a playable HLS URL.
 *
 * Calls the dev-only `/api/earthcam-resolve` middleware in vite.config.ts which
 * handles both EarthCam player systems server-side (the old embed.php and the
 * tokenized share.earthcam.net chain). The browser would otherwise be unable to
 * read the Location header on the share-system 302.
 */
async function fetchHlsUrl(streamId: string): Promise<string> {
  const r = await fetch(`/api/earthcam-resolve?vid=${encodeURIComponent(streamId)}`);
  if (!r.ok) {
    let msg = `resolve failed: ${r.status}`;
    try {
      const body = await r.json();
      if (body?.error) msg = body.error;
    } catch {
      /* ignore */
    }
    throw new Error(msg);
  }
  const { stream } = (await r.json()) as { stream: string };
  return proxyStreamUrl(stream);
}

export const earthcamSource: Source = {
  id: SOURCE_ID,
  label: "EarthCam",

  async listCameras(): Promise<Camera[]> {
    return SEEDS.map((s) => ({
      id: s.id,
      sourceId: SOURCE_ID,
      label: s.label,
      location: { city: s.city, country: s.country },
      timezone: lookupTimezone(s.city, s.country),
      streamType: "hls",
      pageUrl: `https://www.earthcam.com/js/video/embed.php?vid=${encodeURIComponent(s.id)}`,
    }));
  },

  async resolveStream(cam: Camera): Promise<string> {
    return fetchHlsUrl(cam.id);
  },
};
