# PolitCheck Österreich

Accountability-App: Wahlversprechen 2024 vs. Abstimmungsverhalten im Nationalrat (XXVIII. GP).

## Projektstruktur

```
politcheck/
├── index.html        ← Einstiegspunkt
├── css/
│   └── style.css     ← Alle Styles
├── js/
│   └── app.js        ← App-Logik
├── data/
│   └── data.js       ← Alle Daten (Versprechen, Abstimmungen, Cluster)
└── README.md
```

## GitHub Pages einrichten

1. Repository auf GitHub erstellen (z.B. `politcheck`)
2. Alle Dateien hochladen (Ordnerstruktur beibehalten)
3. Auf GitHub: **Settings → Pages → Source: Deploy from branch → main → / (root)**
4. Nach ~60 Sekunden erreichbar unter: `https://<dein-username>.github.io/politcheck`

## Lokale Vorschau

Einfach `index.html` im Browser öffnen — keine Build-Tools oder Server nötig.

## Daten aktualisieren

Alle Inhalte befinden sich in `data/data.js`:

- **PROMISE_DATA**: Wahlversprechen pro Partei mit Klassifizierung
- **CLUSTERS**: Alle Abstimmungen geclustert nach Thema
- **PARTIES / THEMES**: Stammdaten

Neue Versprechen oder Abstimmungen einfach als Objekt ans jeweilige Array anhängen.

## Klassifizierungslogik

`alignment` wird aus der Versprechen-Richtung (`direction`) und der Abstimmungsposition der Partei abgeleitet — **nicht** aus dem Abstimmungsergebnis:

| Versprechen | Position | Alignment |
|-------------|----------|-----------|
| pro         | ja       | voll      |
| pro         | nein     | keine     |
| contra      | nein     | voll      |
| contra      | ja       | keine     |
| Grenzfall   | –        | teil (manuell) |

## Datenquellen

- Wahlprogramme der Parteien (September 2024)
- Parlamentskorrespondenz parlament.gv.at
- Tagungsbilanz XXVIII. GP (14.07.2025)
