// Malaysian states and their cities/towns
export const MALAYSIA_STATES = {
  "Melaka": ["Melaka City", "Alor Gajah", "Jasin", "Ayer Keroh", "Klebang", "Batu Berendam", "Bukit Beruang"],
  "Johor": ["Johor Bahru", "Batu Pahat", "Muar", "Kluang", "Segamat", "Kulai", "Pontian"],
  "Selangor": ["Shah Alam", "Petaling Jaya", "Klang", "Subang Jaya", "Kajang", "Ampang", "Rawang"],
  "Kuala Lumpur": ["Kuala Lumpur"],
  "Negeri Sembilan": ["Seremban", "Port Dickson", "Nilai", "Bahau"],
  "Perak": ["Ipoh", "Taiping", "Teluk Intan", "Sitiawan", "Kampar"],
  "Penang": ["George Town", "Bukit Mertajam", "Butterworth", "Bayan Lepas"],
  "Kedah": ["Alor Setar", "Sungai Petani", "Kulim", "Langkawi"],
  "Pahang": ["Kuantan", "Temerloh", "Bentong", "Cameron Highlands"],
  "Terengganu": ["Kuala Terengganu", "Kemaman", "Dungun"],
  "Kelantan": ["Kota Bharu", "Pasir Mas", "Tanah Merah"],
  "Perlis": ["Kangar", "Arau"],
  "Sabah": ["Kota Kinabalu", "Sandakan", "Tawau", "Lahad Datu"],
  "Sarawak": ["Kuching", "Miri", "Sibu", "Bintulu"],
  "Putrajaya": ["Putrajaya"],
  "Labuan": ["Labuan"],
};

export const STATE_LIST = Object.keys(MALAYSIA_STATES);

export const DAYS = Array.from({ length: 31 }, (_, i) => String(i + 1).padStart(2, "0"));

export const MONTHS = [
  { value: "01", label: "January" },
  { value: "02", label: "February" },
  { value: "03", label: "March" },
  { value: "04", label: "April" },
  { value: "05", label: "May" },
  { value: "06", label: "June" },
  { value: "07", label: "July" },
  { value: "08", label: "August" },
  { value: "09", label: "September" },
  { value: "10", label: "October" },
  { value: "11", label: "November" },
  { value: "12", label: "December" },
];

const CURRENT_YEAR = new Date().getFullYear();
export const YEARS = Array.from({ length: 100 }, (_, i) => String(CURRENT_YEAR - i));

// Pet types for preference step
export const PET_TYPES = [
  { key: "dogs", label: "Dogs", emoji: "🐶" },
  { key: "cats", label: "Cats", emoji: "🐱" },
  { key: "rabbits", label: "Rabbits", emoji: "🐰" },
  { key: "birds", label: "Birds", emoji: "🐦" },
  { key: "others", label: "Others", emoji: "🐾" },
  { key: "any", label: "Any", emoji: "🐾" },
];

// Breed options per pet type. "others" and "any" have no breed step.
export const BREED_OPTIONS = {
  dogs: {
    title: "Which dog breeds do you prefer?",
    emoji: "🐶",
    breeds: [
      "Golden Retriever", "Labrador Retriever", "Poodle", "Husky", "Corgi",
      "German Shepherd", "Shih Tzu", "Pomeranian", "Beagle", "Chihuahua",
      "Pug", "Rottweiler", "Doberman", "Dachshund", "Border Collie",
      "Shiba Inu", "Maltese", "Jack Russell Terrier", "Schnauzer", "Bulldog",
      "Cocker Spaniel", "Akita", "Great Dane", "Local/Kampung Dog", "Mixed", "Any",
    ],
  },
  cats: {
    title: "Which cat breeds do you prefer?",
    emoji: "🐱",
    breeds: [
      "Persian", "Ragdoll", "Siamese", "Scottish Fold", "Domestic Shorthair",
      "British Shorthair", "Maine Coon", "Bengal", "Sphynx", "Munchkin",
      "American Shorthair", "Himalayan", "Russian Blue", "Exotic Shorthair",
      "Turkish Angora", "Norwegian Forest Cat", "Local/Kampung Cat", "Mixed", "Any",
    ],
  },
  rabbits: {
    title: "Which rabbit breeds do you prefer?",
    emoji: "🐰",
    breeds: [
      "Netherland Dwarf", "Holland Lop", "Lionhead", "Mini Rex", "Dutch Rabbit",
      "Flemish Giant", "English Angora", "Himalayan Rabbit", "Polish Rabbit",
      "Dwarf Hotot", "Local Rabbit", "Mixed", "Any",
    ],
  },
  birds: {
    title: "Which bird breeds do you prefer?",
    emoji: "🐦",
    breeds: [
      "Lovebird", "Cockatiel", "Budgerigar (Budgie)", "Cockatoo", "African Grey Parrot",
      "Macaw", "Canary", "Finch", "Mynah", "Parakeet", "Conure",
      "Local/Kampung Bird", "Mixed", "Any",
    ],
  },
  others: {
    title: "Which other pets do you prefer?",
    emoji: "🐾",
    breeds: [
      "Hamster", "Guinea Pig", "Hedgehog", "Chinchilla", "Ferret",
      "Turtle", "Tortoise", "Gecko", "Iguana", "Snake",
      "Fish", "Chicken", "Duck", "Mixed", "Any",
    ],
  },
};

// Pet types that have a breed-preference step
export const BREED_STEP_TYPES = ["dogs", "cats", "rabbits", "birds", "others"];