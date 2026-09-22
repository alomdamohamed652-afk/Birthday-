# 💗 Birthday Surprise

An interactive, mobile-first birthday website designed as a small personal journey for نيرة.

## ✨ Experience

1. 🔐 Birthday PIN gate
2. 🎂 Personalized birthday hero
3. 💌 Intro chapter
4. ✨ Real touch/mouse scratch cards
5. ✉️ Interactive envelope letters
6. 📸 Memory album with fullscreen viewer + mobile swipe
7. ♥️ Hidden heart hunt
8. 🎁 Final gift reveal
9. 🎂 Candle + birthday cake interaction
10. 🎉 Final message + replay

## 🚀 Run locally

```bash
python -m http.server 5500
```

Open `http://localhost:5500`.

## ⚙️ Personalization

Edit `config.js`.

- `recipientName`
- `birthday` → DDMMYYYY
- `lockScreen`
- `hero`
- `intro`
- `scratch.cards`
- `letters.cards`
- `photos.items`
- `hearts.messages`
- `final`
- `site.music`

### Photo example

```js
{
  image: "./photos/memory-01.jpg",
  title: "يوم جميل",
  date: "14 فبراير",
  caption: "تفصيلة صغيرة لسه فاكرينها."
}
```

## 🎵 Music

A direct audio URL can be configured in `config.js`. The player appears after unlock and supports pause/resume.

## ♿ Accessibility

Keyboard controls, focus states, reduced-motion support, semantic controls, and lazy-loaded images are included.

## 🔒 Important

The birthday is stored in frontend JavaScript. It is a fun surprise gate, not real security.
