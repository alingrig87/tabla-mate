# 39 — GeomStyle: flag-uri dezactivate implicit + persistare localStorage

## Problema

Flag-urile de decorare a figurilor geometrice (`height`, `angle`, `labels`, `diagonal`) erau activate implicit (`true`). Asta însemna că orice figură nouă era desenată cu toate decorațiile vizibile, chiar dacă utilizatorul nu le dorea.

## Fix

### Default off

```ts
// înainte
{ height: true, angle: true, labels: true, diagonal: true }

// după
{ height: false, angle: false, labels: false, diagonal: false }
```

### Persistare per browser (localStorage)

La inițializare se citesc setările salvate anterior. La fiecare modificare se salvează:

```ts
const [geomStyle, setGeomStyle] = useState<GeomStyle>(() => {
  try {
    const saved = localStorage.getItem('geomStyle');
    if (saved) return JSON.parse(saved) as GeomStyle;
  } catch {}
  return { height: false, angle: false, labels: false, diagonal: false };
});

useEffect(() => {
  geomStyleRef.current = geomStyle;
  try {
    localStorage.setItem('geomStyle', JSON.stringify(geomStyle));
  } catch {}
}, [geomStyle]);
```

## Comportament

- **Prim utilizator nou**: toate dezactivate
- **Utilizator care le activează**: setările se păstrează între sesiuni (localStorage per browser)
- **Figuri existente**: nu sunt afectate — stilul e stocat per figură în momentul desenării

## Fișiere modificate

- `src/components/CanvasBoard.tsx` — inițializare `geomStyle` cu citire/scriere localStorage
