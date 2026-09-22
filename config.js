/*
  💗 BIRTHDAY CONFIG
  ------------------
  You can personalize almost the entire website from this file.

  birthday = DDMMYYYY
  Example: "14022004" = 14 / 02 / 2004

  NOTE:
  This is a fun birthday gate, NOT real security. The value is visible
  to anyone who can inspect the website files.
*/

window.BIRTHDAY_CONFIG = {
  recipientName: "Jori",
  birthday: "14022004",

  site: {
    title: "A Little Birthday Story",
    accent: "#c97f91",
    music: {
      enabled: false,
      url: ""
    }
  },

  lockScreen: {
    eyebrow: "A SPECIAL DELIVERY",
    title: "Something special<br>is waiting for you.",
    subtitle: "A little corner of the internet was made just for you.",
    hint: "ENTER YOUR BIRTHDAY",
    wrongDateMessage: "Hmm... that's not the birthday I was looking for. ♡"
  },

  hero: {
    eyebrow: "A LITTLE SOMETHING FOR YOU",
    titlePrefix: "Happy Birthday,",
    scrollText: "SCROLL TO BEGIN · ♥"
  },

  intro: {
    eyebrow: "01 · A LITTLE BEGINNING",
    title: "Before you open everything...",
    text: "I wanted to make something a little different this year — a tiny place filled with words, little surprises, and a few things made especially for you.",
    button: "Keep going ↓"
  },

  scratch: {
    eyebrow: "02 · LITTLE SECRETS",
    title: "Scratch to reveal",
    copy: "Use your finger on your phone or your mouse on a computer. Take your time — there is something underneath every card.",
    cards: [
      { title: "A tiny secret", reveal: "You make ordinary days feel a little less ordinary. ♡" },
      { title: "Keep this one", reveal: "Some people leave memories. Some people become one." },
      { title: "A little wish", reveal: "I hope this new year gives you countless reasons to smile." },
      { title: "You found it", reveal: "One extra birthday wish, because apparently one is never enough. ✨" }
    ]
  },

  letters: {
    eyebrow: "03 · YOU HAVE MAIL",
    title: "A few little letters",
    copy: "Some things are nicer when they arrive slowly.",
    cards: [
      {
        label: "LETTER 01",
        title: "For your birthday",
        message: "Happy birthday. I hope today feels soft, peaceful, and full of little moments that make you genuinely happy."
      },
      {
        label: "LETTER 02",
        title: "A little reminder",
        message: "Whatever this next chapter brings, I hope you remember that you deserve good things, good people, and plenty of reasons to laugh."
      },
      {
        label: "LETTER 03",
        title: "For the year ahead",
        message: "May this year surprise you in the nicest ways — new memories, new adventures, and moments you'll want to keep forever."
      }
    ]
  },

  hearts: {
    eyebrow: "04 · FIND THE HEARTS",
    title: "A few are hiding here...",
    copy: "Tap the little hearts. Each one has a tiny message waiting for you.",
    messages: [
      "You found a little heart. ♡",
      "A tiny reminder: smile today.",
      "Another little wish for you. ✨",
      "This one was hiding for you.",
      "Keep this one. ♥",
      "One more reason to smile."
    ]
  },

  final: {
    eyebrow: "THE LAST ONE",
    title: "Happy Birthday, Jori ♡",
    message: "This little website is just a small way of saying: I hope your birthday is beautiful, and I hope the year ahead is even more beautiful.",
    signature: "With love, Someone who cares",
    button: "Replay the beginning ↺"
  }
};