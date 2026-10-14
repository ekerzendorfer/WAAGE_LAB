# WAAGE_LAB

**Chemische Versuche mit einer preiswerten seriellen Waage – reale Messdaten zuerst, KI erst bei der Interpretation.**

WAAGE_LAB ist eine browserbasierte Messumgebung für den Chemieunterricht. Ausgangspunkt ist eine Waage mit serieller Schnittstelle (aktuell getestet mit U.S. Solid USS-DBS61-12, 1200 g × 0,01 g). Die App trennt bewusst vier Ebenen:

**Vorhersage → reale Messung → klassische Auswertung → KI-Coach**

Die KI misst nichts, filtert keine Rohdaten und berechnet keine Kennwerte, die deterministisch in der App berechnet werden können. Sie wird erst danach eingesetzt, um Schlussfolgerungen zu prüfen, Messgrenzen sichtbar zu machen und Transferfragen zu erzeugen.

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

## GitHub Pages

Einmalig in GitHub unter **Settings → Pages** als Quelle den Branch `main` und `/ (root)` wählen. Danach läuft die Anwendung über HTTPS und kann in Chromium-Browsern Web Serial verwenden.

## Experimentelles Standardprotokoll BrauseLab

- ausreichend großer PET-Becher, Füllstand deutlich unter der Hälfte
- leichter Kunststoffrührstab von Beginn an im gewogenen System
- Tablette einzeln wiegen
- stabile Basislinie aufnehmen
- Tablette einwerfen, danach während der spontanen Messphase nicht eingreifen
- optional nach Erreichen des Plateaus standardisiert entgasen/rühren
- Temperatur dokumentieren; eine preiswerte serielle Temperaturmessung ist als nächster Ausbauschritt vorgesehen

**Wichtig:** Die Waage misst den Massenverlust des offenen Systems. Das ist nicht automatisch identisch mit der momentanen chemischen CO₂-Bildungsrate.

## Geplante nächste Schritte

- zweite serielle Schnittstelle für Temperatur (z. B. THERMOsera)
- Vergleich mehrerer realer Läufe im selben Diagramm
- Presets für Carbonat + Säure, Mineralwasser/Entgasung, Verdunstung, Gärung und kalorimetrische Versuche
- LehrerInnen-/SchülerInnenmodus
- KI-Coach mit optionaler direkter Anbindung, ohne API-Schlüssel im Browser zu speichern
- Export/Übergabe an MESSWERT_LAB

## Leitidee

> Lehrkräfte steuern. SchülerInnen denken. KI unterstützt.

> Messen vor Prompten.
