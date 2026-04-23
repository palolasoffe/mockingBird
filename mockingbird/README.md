# MockingBird

Flappy Bird -tyylinen mobiilipeli Expo + React Native -pohjalla.

## Käynnistys

1. Asenna riippuvuudet

```bash
npm install
```

2. Käynnistä kehityspalvelin

```bash
npm run start
```

## Nykyinen rakenne

```text
app/
   _layout.tsx             # Sovelluksen root-layout
   (tabs)/
      _layout.tsx           # Tab-navigaation asetukset
      index.tsx             # Peliruutu (nykyinen Flappy-prototyyppi)

assets/
   images/                 # App-iconit ja splash-kuva

components/
   haptic-tab.tsx          # Haptinen tab-painike
   ui/
      icon-symbol.tsx
      icon-symbol.ios.tsx

constants/
   theme.ts

hooks/
   use-color-scheme.ts
   use-color-scheme.web.ts

game/                     # Pelilogiikan moduulit (rakennetaan seuraavaksi)
```

## Tekninen tavoite seuraavaksi

1. Siirretään pelin fysiikka ja putkigenerointi omiin tiedostoihin kansioon `game/`.
2. Erotetaan renderöinti (`Bird`, `Pipe`, `Hud`) omiin komponentteihin.
3. Lisätään perus testattava game loop -rakenne, jotta tiimin on helppo kehittää rinnakkain.
