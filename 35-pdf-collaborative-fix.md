# 35 — Fix: PDF-urile nu dispar în modul colaborativ

## Problema

Când utilizatorul importa un PDF pe tablă și intra în modul colaborativ (sau era deja în modul colaborativ), fiecare stroke nou trimis la Firestore declanșa un `onSnapshot` care suprascria lista locală de items. Deoarece `ImageItem`-urile (PDF-uri) nu sunt niciodată sincronizate în Firestore (base64 > 1 MB), ele nu apăreau niciodată în `fromRemote` și nici în `pending` — deci dispăreau la fiecare update de la server.

## Cauza

Logica de merge din `CanvasBoard.tsx`:

```ts
return [...fromRemote, ...pending];
```

`pending` păstrează doar itemele care:

1. Au un id
2. Nu sunt încă confirmate de Firestore (`pendingUploadIds`)

`ImageItem`-urile nu intră în nicio categorie — sunt locale permanent.

## Fix

```ts
// Local-only: ImageItems (PDFs) are never synced to Firestore — preserve them
const localOnly = prev.filter((item) => item.kind === 'image');
return [...fromRemote, ...pending, ...localOnly];
```

## Fișiere modificate

- `src/components/CanvasBoard.tsx` — merge logic în useEffect-ul de Firestore subscription
