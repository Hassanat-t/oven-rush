// The regulars at tt's pink oven. Add more here: the game picks from this list.
//
// Each customer has:
// - personality: how they come across (shown through their lines)
// - want: their favourite order (`favourite` is an item id from items.js; they order it more often)
// - surprise: something you only learn when you serve them well (`surprise` line)
// - patience: how long they wait (1 = normal), tip: how generous they are (1 = normal)
// - style: their look, in start.ng's character fields
// - lines: what they say when they arrive, when served, when served the wrong thing, and when they give up
export const CUSTOMERS = [
  {
    id: 'nkechi',
    name: 'Mama Nkechi',
    personality: 'Warm and chatty; calls everyone "my dear".',
    want: 'Biscoff cookies for her grandchildren.',
    favourite: 'biscoff',
    surprise: 'The taro boba is secretly for her.',
    patience: 1.25,
    tip: 1.2,
    style: { body: 'female', primaryColor: '#eb3b5a', secondaryColor: '#5f3dc4', skinColor: '#5c3a21', hairColor: '#17120f', hair: 'bun', hat: 'none', accessory: 'earrings' },
    lines: {
      arrive: ['Good afternoon, my dear!', 'My grandchildren are waiting, o!', 'Ah, it smells like heaven in here.'],
      happy: ['God bless your hands, my dear.', 'You are a good child.'],
      surprise: "Don't tell them the taro boba is for me. 🤫",
      wrong: ['My dear, this is not what I asked for.'],
      angry: ['I will come back when you are less busy.'],
    },
  },
  {
    id: 'tunde',
    name: 'Tunde',
    personality: 'Always on a call; walks in mid-meeting.',
    want: 'A milk tea boba before standup.',
    favourite: 'milk',
    surprise: "He's the HNG mentor who reviews your PRs.",
    patience: 0.8,
    tip: 1.4,
    style: { body: 'male', primaryColor: '#4b7bec', secondaryColor: '#222f3e', skinColor: '#8d5524', hairColor: '#17120f', hair: 'short', hat: 'none', accessory: 'glasses' },
    lines: {
      arrive: ['Quick one, standup in 2 minutes.', "Can you hear me? Sorry, I'm ordering.", 'Fast as you can, boss.'],
      happy: ['Shipped. Approved. 👍', 'That was faster than CI.'],
      surprise: "By the way, I'm your HNG reviewer. Your PR's merged. 😉",
      wrong: ["That's a bug, not my order."],
      angry: ["I'll just grab water. I'm late."],
    },
  },
  {
    id: 'kemi',
    name: 'Kemi',
    personality: 'A student who counts every coin.',
    want: 'One white choc cookie to share.',
    favourite: 'white',
    surprise: 'Stipend day: tips big when served fast.',
    patience: 1,
    tip: 0.7,
    fastTip: 2.5,
    style: { body: 'female', primaryColor: '#1dd1a1', secondaryColor: '#4b6584', skinColor: '#c68642', hairColor: '#4a2c1a', hair: 'ponytail', hat: 'none', accessory: 'backpack' },
    lines: {
      arrive: ['Hi! Just a little something, please.', 'Exam season snack run!', 'Is it cheaper if I smile?'],
      happy: ['Thank you so much!', 'Exactly what I needed.'],
      surprise: 'Stipend just dropped. Keep the change! 💸',
      wrong: ['Um, I think that is someone else’s?'],
      angry: ['My lecture is starting, sorry!'],
    },
  },
  {
    id: 'femi',
    name: 'Chef Femi',
    personality: 'A rival baker pretending to be a normal customer.',
    want: 'Choc chip cookies to "study".',
    favourite: 'choc',
    surprise: 'Admits your cookies beat his.',
    patience: 0.9,
    tip: 1,
    style: { body: 'male', primaryColor: '#292a23', secondaryColor: '#3d3d3d', skinColor: '#a0662f', hairColor: '#17120f', hair: 'bald', hat: 'tophat', accessory: 'beard' },
    lines: {
      arrive: ["I'm just a regular customer. Nothing to see.", 'Hmm. Interesting little shop.', 'Your finest, please. For research.'],
      happy: ['Hmph. Acceptable.', 'Not bad. Not bad at all.'],
      surprise: 'Fine. Yours are better than mine. Happy?',
      wrong: ['Amateur hour, I see.'],
      angry: ['My bakery would never keep me waiting.'],
    },
  },
  {
    id: 'ayo',
    name: 'Little Ayo',
    personality: 'A polite kid with his mum’s money.',
    want: 'Strawberry boba, the pinkest drink.',
    favourite: 'berry',
    surprise: 'Pays in a jar of coins and says thank you twice.',
    patience: 1.1,
    tip: 1,
    style: { body: 'male', primaryColor: '#f7b731', secondaryColor: '#0c6e5a', skinColor: '#5c3a21', hairColor: '#17120f', hair: 'afro', hat: 'cap', accessory: 'none' },
    lines: {
      arrive: ['Hello! Mummy said I can get one.', 'The pink one please!', 'Can I have a treat?'],
      happy: ['Thank you! Thank you!', 'Yayyy!'],
      surprise: "Here's my coin jar. Thank you, thank you! 🫙",
      wrong: ['That is not pink...'],
      angry: ['Mummy is calling me. Bye!'],
    },
  },
  {
    id: 'spinz',
    name: 'DJ Spinz',
    personality: 'Loud, hype, narrates everything like a radio show.',
    want: 'Two boba for the booth.',
    favourite: 'taro',
    surprise: 'Gives the shop a live shout-out on the radio.',
    patience: 0.85,
    tip: 1.3,
    style: { body: 'male', primaryColor: '#a55eea', secondaryColor: '#2b2f4a', skinColor: '#8d5524', hairColor: '#17120f', hair: 'dreads', hat: 'beanie', accessory: 'scarf' },
    lines: {
      arrive: ['Wahala! DJ Spinz in the building!', 'Make it quick, the playlist is ending!', 'Yo yo yo, pink oven!'],
      happy: ['That one sweet die! 🔥', 'Pull up!'],
      surprise: 'Big shout-out to tt’s pink oven, live on air! 📻',
      wrong: ['Rewind! That’s not my order.'],
      angry: ['The beat dropped and so did my patience.'],
    },
  },
  {
    id: 'olu',
    name: 'Grandpa Olu',
    personality: 'Slow, kind and full of old stories.',
    want: 'A milk tea "like we had in 1975".',
    favourite: 'milk',
    surprise: 'He owned this building when it was a bookshop.',
    patience: 1.5,
    tip: 1.1,
    style: { body: 'male', primaryColor: '#fd9644', secondaryColor: '#4b6584', skinColor: '#5c3a21', hairColor: '#b8b8b8', hair: 'short', hat: 'none', accessory: 'glasses' },
    lines: {
      arrive: ['Take your time, my child.', 'In my day, we had no boba.', 'Ah, I remember this corner.'],
      happy: ['Lovely, lovely.', 'You remind me of my daughter.'],
      surprise: 'This building was my bookshop, you know. I’m glad it’s sweet now.',
      wrong: ['My eyes are old, but that is not mine.'],
      angry: ['Even I have somewhere to be.'],
    },
  },
  {
    id: 'bisi',
    name: 'Aunty Bisi',
    personality: 'Glamorous, phone always out, always filming.',
    want: 'Something pretty for her page.',
    favourite: 'berry',
    surprise: 'She’s a food blogger with 200k followers.',
    patience: 0.95,
    tip: 1.5,
    style: { body: 'female', primaryColor: '#ff6b6b', secondaryColor: '#222f3e', skinColor: '#e0ac69', hairColor: '#4a2c1a', hair: 'braids', hat: 'crown', accessory: 'earrings' },
    lines: {
      arrive: ['Hold on, let me get the lighting right.', 'Make it cute, I’m posting this.', 'Hi! Is this the viral bakery?'],
      happy: ['Perfect for the gram! 📸', 'Oh, it’s giving.'],
      surprise: 'Posting this to my 200k followers right now! ✨',
      wrong: ['That is not camera-ready, darling.'],
      angry: ['Two stars. Slow service.'],
    },
  },
];

/** A random line from a list (or the line itself if it's a string). */
export function say(lines) {
  if (typeof lines === 'string') return lines;
  return lines[Math.floor(Math.random() * lines.length)];
}
