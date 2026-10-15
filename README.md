# WAAGE_LAB

**Chemische Versuche mit einer preiswerten seriellen Waage – reale Messdaten zuerst, KI erst bei der Interpretation.**

WAAGE_LAB ist eine browserbasierte Messumgebung für den Chemieunterricht. Ausgangspunkt ist eine Waage mit serieller Schnittstelle (aktuell getestet mit U.S. Solid USS-DBS61-12, 1200 g × 0,01 g). Die App trennt bewusst vier Ebenen:

**Vorhersage → reale Messung → klassische Auswertung → KI-Coach**

Die KI misst nichts, filtert keine Rohdaten und berechnet keine Kennwerte, die deterministisch in der App berechnet werden können. Sie wird erst danach eingesetzt, um Schlussfolgerungen zu prüfen, Messgrenzen sichtbar zu machen und Transferfragen zu erzeugen.

## v0.2.0 – BrauseLab und Laufvergleich

Die weiter nutzbare v0.1-Grundlage wurde um folgende Funktionen erweitert:

- **Vorlauf + Einwurfmarker:** Waage starten, stabile Basis erfassen, „Vorlauf aufzeichnen“, unmittelbar beim Tabletteneinwurf den Marker setzen. Die letzten 5 s vor t=0 bleiben mit negativen Zeiten als Rohwerte erhalten.
- **Ungeglättete Startphase** als zusätzliches Massesignal m(t). Der Beginn der Kennwertauswertung ist einstellbar (standardmäßig 5 s); Rohdaten werden nicht entfernt.
- **500-mL-Becher:** trockene Leermasse einmalig messen, Basis-Masse Becher + Wasser erfassen. Wassermasse wird aus der Differenz bestimmt, manuelle Eingabe bleibt als Fallback möglich.
- **Erweiterte Metadaten:** ganz, halbiert, geviertelt, grob/fein zerkleinert; Einwurfmodus, Bechermasse und Auswertebeginn in der CSV.
- **CSV-Vergleich:** mehrere exportierte Läufe importieren und reale Kurven als Δm(t) oder X(t) = Δm(t) / Δm∞ überlagern. Alte v0.1-CSV-Dateien bleiben lesbar.
- **Deterministische Kontrollprüfung:** Temperatur, Wasser, Tablettenmasse und Tablettenform mit transparenten Toleranzen; bei mehreren geänderten Größen bleibt die Zielvariable ausdrücklich unbestimmt, bis sie ausgewählt wird.
- **Kritischer KI-Vergleich:** erst nach klassischer Auswertung; die App übergibt tatsächliche Kurven-Stützpunkte, Kennwerte und Störfaktoren, keine erfundenen Daten.

### Wichtig zur Messmethodik

Der **manuelle Einwurfmarker** ist im Regelfall zuverlässiger nachvollziehbar als eine Startschwelle der Waage. Er besitzt selbst eine kleine Reaktionszeit-Unsicherheit: den Klick möglichst synchron mit dem Loslassen der Tablette setzen. Tera-Term-Logs können einen angegebenen Einwurfoffset übernehmen, ohne Offset bleibt nur eine explizit gekennzeichnete Schätzung. Das Startsignal ist **kein** Beweis für eine chemische Induktionszeit.

Die Kennwerte basieren auf dem Median der letzten 5 s und Schwelleninterpolation ab dem eingestellten Auswertungsbeginn. Ein einfacher 0,02-g-Endphasencheck markiert instabile Endwerte mit `*` als **vorläufig**. Diese Heuristik ersetzt keinen Plateau-Nachweis; sie misst verlorene Masse aus einem offenen System, nicht unmittelbar die chemische CO₂-Produktionsrate.

### Kontrollvariablen

Die numerischen Warnschwellen dienen als Orientierung, **nicht** als Fehlergrenzen: Temperatur 0,5 °C, Wassermasse 2 g, Tablettenmasse 0,10 g; Tablettenform wird kategorial verglichen. Veränderte oder fehlende Werte werden angezeigt. Nicht aus CSV kontrollierbar bleiben unter anderem Bechergeometrie, Spritzer, Tablettencharge, Rühren und Markerungenauigkeit. Metadaten zur Tablettenform können im Vergleich mit `†` gekennzeichnet korrigiert werden; die ursprüngliche CSV bleibt unverändert.

Siehe [Referenzprotokoll für den 500-mL-Becher](REFERENZSERIE_500ML.md).

## v0.1.0 – BrauseLab

Die erste Version enthält:

- Web-Serial-Verbindung zur Waage (9600 Baud, 8N1, kein Flow Control)
- Import von Tera-Term-Logs mit Zeitstempeln
- Demo mit einem real gemessenen Brausetabletten-Lauf vom 14.10.2026
- Eingabe der Versuchsbedingungen (Tablettenmasse, Wassermasse, Temperatur, Tablettenform)
- theoretischer Startwert `m0 = Basis-Masse + Tablettenmasse`
- Live-Darstellung von `Δm(t) = m0 - m(t)`
- eigene Prognosekurve vor dem Experiment; kein nachträglicher Fit
- transparente Kennwerte `Δm∞`, `t50`, `t90`, `t95`
- CSV-Export
- datenbasiertes Analysepaket für einen KI-Coach

## Start

Die App ist statisch und benötigt keinen Build-Schritt.

1. Repository klonen oder herunterladen.
2. Für Web Serial die App über `https://` oder `localhost` öffnen. GitHub Pages eignet sich dafür gut.
3. In Chrome oder Edge **Serielle Waage verbinden** wählen und den COM-Port freigeben.
4. Waage: 9600 Baud, 8 Datenbits, keine Parität, 1 Stopbit, kein Flow Control; bei der getesteten U.S.-Solid-Waage `C5=0` (continuous) und zunächst `C2=1`.

Bei direktem Öffnen als `file://` kann Web Serial je nach Browser blockiert sein. Demo und Log-Import bleiben nutzbar.

## Testen (ohne Waage)

Mit installiertem Node.js:

```bash
node tests/waage_v02.test.js
```

Die Tests prüfen die Verknüpfungen zwischen HTML und JavaScript, die gravimetrische Wassermasse, Schwellenzeiten (einschließlich zu früh überschrittener Schwellen), den CSV-Import und die Kontrollvariablenprüfung. Die **physische Web-Serial-Messung** und der manuelle Einwurfmarker müssen zusätzlich am Gerät geprüft werden.

## GitHub Pages

Einmalig in GitHub unter **Settings → Pages** als Quelle den Branch `main` und `/ (root)` wählen. Danach läuft die Anwendung über HTTPS und kann in Chromium-Browsern Web Serial verwenden.

## Experimentelles Standardprotokoll BrauseLab

- 500-mL-Becher mit ungefähr 200 g Wasser; ohne Rührstab
- Becher trocken einmalig wiegen, Basis Becher + Wasser je Lauf durch die Waage bestimmen
- Tablette einzeln wiegen, Starttemperatur vor dem Einwurf erfassen
- 3 s Basis kontrollieren und übernehmen; „Vorlauf aufzeichnen“
- Den Einwurf bewusst mit „Einwurf markieren (t=0)“ markieren; die letzten 5 s vor dem Einwurf bleiben erhalten
- Kein Eingriff während der spontanen Messung; ausreichend lange bis zur stabilen Endphase aufzeichnen
- Spritzer/Restflüssigkeit auf Wägeplatte dokumentieren, nicht nachträglich aus Δm herausrechnen
- Original-CSV sofort exportieren und Metadaten prüfen

**Wichtig:** Die Waage misst entweichende Masse im offenen System. Das ist nicht automatisch identisch mit der momentanen CO₂-Bildungsrate.

## Geplante nächste Schritte

- zweite serielle Schnittstelle für Temperatur (THERMOsera, später; gemeinsame Zeitbasis)
- Replikatstatistik und qualitative Qualitätsflags für standardisierte Referenzserien
- Presets für Carbonat + Säure, Mineralwasser/Entgasung, Verdunstung, Gärung und kalorimetrische Versuche
- LehrerInnen-/SchülerInnenmodus
- KI-Coach mit optionaler direkter Anbindung, ohne API-Schlüssel im Browser zu speichern
- Export/Übergabe an MESSWERT_LAB

## Leitidee

> Lehrkräfte steuern. SchülerInnen denken. KI unterstützt.

> Messen vor Prompten.
