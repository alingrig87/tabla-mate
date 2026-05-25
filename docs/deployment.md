# Deployment — Vercel + tablamate.ro

## Rezumat

Aplicația este hoistată pe **Vercel** și accesibilă la **[tablamate.ro](https://tablamate.ro)**.

---

## 1. Repository GitHub

```
https://github.com/alingrig87/tabla-mate
```

Push pe `main` → Vercel detectează automat și face deploy.

---

## 2. Configurare Vercel

### `vercel.json` (în rădăcina repo-ului)

```json
{
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }]
}
```

- `buildCommand` — rulează `npm run build` (Vite)
- `outputDirectory` — fișierele compilate merg în `dist/`
- `rewrites` — toate URL-urile returnează `index.html` (necesar pentru SPA routing)

### Cum a fost creat proiectul pe Vercel

1. [vercel.com](https://vercel.com) → **Add New Project**
2. Import `alingrig87/tabla-mate` din GitHub
3. Vercel detectează Vite automat — nicio configurare suplimentară
4. Click **Deploy**

### Domeniu adăugat

- **Settings → Domains** → adăugat `tablamate.ro`
- Vercel a afișat tab-ul **"Vercel DNS"** cu nameserverele de configurat

---

## 3. Configurare DNS — ROTLD (rotld.ro)

Domeniul `tablamate.ro` este înregistrat la **ROTLD** (Registrul .ro).

Panou de administrare: [https://www.rotld.ro/domadmin/](https://www.rotld.ro/domadmin/)

### Nameservere configurate

Secțiunea **"Servere de nume"** → câmpuri NS completate cu:

| Câmp | Valoare              |
| ---- | -------------------- |
| NS 1 | `ns1.vercel-dns.com` |
| NS 2 | `ns2.vercel-dns.com` |

Click **Actualizează** → propagare DNS: 10–60 minute.

> **De ce NS și nu A record?**
> ROTLD permite doar delegarea nameserverelor (câmpuri NS), nu adăugarea directă de recorduri A/CNAME.
> Soluția: delegăm DNS-ul complet către Vercel prin nameservere.
> Vercel preia controlul DNS și configurează automat A record + SSL.

---

## 4. SSL / HTTPS

Vercel generează automat un certificat **Let's Encrypt** după ce nameserverele propagă.
Nu necesită nicio configurare manuală.

---

## 5. Flux de deploy

```
git push origin main
       ↓
Vercel webhook se declanșează automat
       ↓
npm ci && npm run build
       ↓
dist/ deploiat pe CDN Vercel (edge network global)
       ↓
tablamate.ro live în ~2 minute
```

---

## 6. Variabile de mediu

Niciuna necesară — aplicația este 100% client-side, fără backend sau API keys.

---

## 7. Comenzi utile

```bash
# Deploy manual via CLI (opțional)
vercel --prod

# Șterge proiectul din Vercel
vercel project rm tabla-mate

# Verifică statusul DNS
nslookup tablamate.ro
```
