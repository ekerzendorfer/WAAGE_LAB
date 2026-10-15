# BrauseLab – Referenzserie mit 500-mL-Becher (Arbeitsprotokoll)

**Ziel:** Reproduzierbare, gravimetrische Massenverlustkurven im offenen System aufnehmen. Zuerst Temperatur bei ganzen Tabletten, anschließend der Einfluss der Tablettenform bei annähernd gleicher Temperatur.

## Feste Versuchsbedingungen

- Ein und derselbe, saubere und trockene **500-mL-Becher** (Leermasse einmalig zu Serienbeginn erfassen).
- Ziel-Wassermasse **200,0 g** (praktische Toleranz für die Vorbereitung ±0,5 g; der tatsächlich gewogene Wert wird dokumentiert). Nicht nach Volumen dosieren, sondern Becher + Wasser wiegen.
- **Kein Rührstab**, keine aktive Durchmischung; Becherposition auf der Wägeplatte nicht verändern.
- Tabletten aus derselben Produktcharge, jede Tablette einzeln wiegen; tatsächliche Tablettenmasse protokollieren.
- Dieselbe Waage und serielle Einstellung 9600, 8N1; ruhige, zugfreie Umgebung.
- Temperatur unmittelbar vor Einwurf im Wasser erfassen. Ist THERMOsera noch nicht verfügbar, ein geeignetes externes Thermometer verwenden und den abgelesenen Wert manuell eintragen.
- Jede Messung mit 5 s Vorlauf und möglichst zeitgleichem Klick auf **Einwurf markieren** beginnen. Die kleine Zeitunsicherheit des manuellen Klicks mitdenken.

## Untersuchungsplan

| Serie | Ziel-T | Form | Wiederholungen | Vergleichszweck |
|---|---:|---|---:|---|
| A | ca. 22 °C | ganz | 3 | Ausgangsniveau / Referenz |
| B | ca. 28 °C | ganz | 3 | Temperatureinfluss |
| C | ca. 36 °C | ganz | 3 | Temperatureinfluss |
| D | ca. 22 °C | geviertelt | 3 | Einfluss Tablettenform bei gleicher Temperatur |

**Tatsächliche Temperaturen sind Messwerte**, keine vorgegebenen Ersatzwerte. Bei Abweichung unbedingt die realen Werte eintragen. Die vier Reihen nicht gemeinsam als eindimensionalen Vergleich interpretieren: A–C isolieren die Temperatur besser; A gegen D vergleicht die Form. Bei D vier Stücke derselben zuvor gewogenen Tablette einsetzen, nicht nur ein Viertel der ursprünglichen Masse.

## Ablauf je Messung

1. Becher auf Spritzspuren prüfen und trocknen; Waage frei von Flüssigkeit und mit stabilem Nullwert.
2. Trockene Becherleermasse **einmal zu Serienbeginn** ermitteln und in „Versuch vorbereiten“ eintragen. Bei Becherwechsel neu messen.
3. Becher mit etwa 200 g Wasser auf die Waage stellen. Die **Basis-Masse Becher + Wasser** mittels „letzte 3 s mitteln“ übernehmen. Die App setzt die Wassermasse aus Basis minus Leermasse ein.
4. Tablette **separat wiegen**, Tablettenform, gemessene Wasser-Starttemperatur und ggf. Abweichungen dokumentieren.
5. Vorab eine überprüfbare **Prognose** zu Δm∞ und t90 notieren; anschließend zur Messansicht wechseln.
6. „**Vorlauf aufzeichnen**“ wählen. Nach mindestens fünf Sekunden stabiler Basis die Tablette einwerfen und möglichst synchron „**Einwurf markieren (t=0)**“ klicken.
7. Reaktion unbeeinflusst beobachten. **Mindestens bis zur stabilen Endphase** aufzeichnen; als Orientierung 120–180 s, wenn erforderlich länger. Kein bewusstes Ausschwenken oder Rühren in der spontanen Phase.
8. „Messlauf beenden“, Diagramm und ungeglättetes Rohsignal prüfen. Das Standard-Auswertefenster beginnt bei **t = 5 s**; bei längerem Einschwingen im Datensatz begründet anpassen.
9. CSV exportieren; Originaldatei mit sprechendem Namen ablegen, z. B. `B500_A22_GANZ_R01.csv` und `B500_D22_VIERTEL_R01.csv`.
10. Becher erst **nach der beendeten Messung** abheben und die Wägeplatte auf Tröpfchen prüfen; gegebenenfalls Restmasse auf der Platte separat dokumentieren. Sie dient als **Qualitätsindikator**, nicht als rechnerische Korrektur des Massenverlusts.

## Dokumentation und Prüfpunkte

| Lauf-ID | Ist-T / °C | Ist-Wasser / g | Tablette / g | Form | Einwurfmarker | Δm∞ / g | t50 / s | t90 / s | t95 / s | Spritzer / Rest auf Platte | Bemerkung |
|---|---:|---:|---:|---|---|---:|---:|---:|---:|---|---|
| A01 | | | | ganz | manuell | | | | | | |
| A02 | | | | ganz | manuell | | | | | | |
| A03 | | | | ganz | manuell | | | | | | |
| B01 | | | | ganz | manuell | | | | | | |
| B02 | | | | ganz | manuell | | | | | | |
| B03 | | | | ganz | manuell | | | | | | |
| C01 | | | | ganz | manuell | | | | | | |
| C02 | | | | ganz | manuell | | | | | | |
| C03 | | | | ganz | manuell | | | | | | |
| D01 | | | | geviertelt | manuell | | | | | | |
| D02 | | | | geviertelt | manuell | | | | | | |
| D03 | | | | geviertelt | manuell | | | | | | |

**Messgrößen trennen:** Früheste Blasenbildung, Tablettenzerfall, Beginn erkennbaren Massenverlusts und Einwurfmarker sind unterschiedliche Ereignisse. Der Endwert der Waage entspricht weder zwingend der theoretisch produzierten CO₂-Menge noch einem unmittelbar gemessenen Reaktionsumsatz. Gelöstes CO₂, Blasenrückhaltung, Wasserdampf, Tropfenverlust und mechanische Effekte bleiben mögliche Ursachen.

## Vergleich in v0.2

- Zuerst A01–C03 importieren, als Untersuchungsvariable **Temperatur** wählen; normierten Verlauf einschalten, um die Geschwindigkeit getrennt von der Endmasse zu vergleichen.
- Danach den Vergleich leeren und A01–A03 mit D01–D03 laden; **Tablettenform** auswählen.
- Korrektur eines versehentlich falsch gewählten Tablettenform-Metadatums ist in der Vergleichstabelle möglich (mit † gekennzeichnet); die Original-CSV bleibt unverändert.
- Die App markiert Veränderungen weiterer dokumentierter Kontrollgrößen, ebenso fehlende Metadaten, geschätzte Startmarker und Endwerte ohne überzeugende Plateauanzeichen.
- **Erst anschließend** KI-Coach verwenden: „Welche Aussage dürfen die Daten NICHT beweisen?“
