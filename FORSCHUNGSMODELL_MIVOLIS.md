# WAAGE_LAB – Mivolis-Vitamin-C-Forschungsmodell (v0.2.1, Vorschau)

**Stand: 3. November 2026. Das Modell ist eine ausdrücklich unvalidierte Arbeitshypothese.**

## Motivation

Das experimentelle WAAGE_LAB misst den **Massenverlust eines offenen Systems**. Es misst weder unmittelbar die chemische CO₂-Bildungsrate noch die Menge des in der Flüssigkeit verbliebenen CO₂. Die v0.2-Messstrecke mit Web Serial, Einwurfmarker, ungeglätteter Startphase, Klassikauswertung, CSV-Export und Laufvergleich bleibt unverändert.

Die zusätzliche Ansicht im Bereich **Prognose** ist kein Ersatz für die eigene Vorhersage der SchülerInnen. Sie stellt ein **Forschungsmodell** daneben, dessen Annahmen man systematisch verändern und anschließend an echten Messwerten überprüfen soll.

## Produktidentifikation

- Referenz: **Mivolis Vitamin C Brausetabletten**, dm-Artikel **3104290**, GTIN 4066447833041
- 20 Stück / 82 g, also **4,10 g nominelle durchschnittliche Tablettenmasse**; jede tatsächlich eingesetzte Tablette weiterhin einzeln wiegen
- Zutaten (laut dm): Citronensäure, Natriumhydrogencarbonat, Sorbit, L-Ascorbinsäure (240 mg / Tablette), Aromastoffe, Rote-Bete-Pulver, Maisstärke, Natriumcyclamat, Natriumsaccharin, Riboflavin
- **Salzäquivalent:** 20,2 g / 100 g

Produktquelle: https://www.dm.at/p/d/3104290/mivolis-vitamin-c-brausetabletten

## Was die Salzdeklaration erlaubt

EU-Nährwertkennzeichnung: Salzäquivalent = Natrium × 2,5.

Bei einer 4,10-g-Tablette:

- Natriumäquivalent: `4,10 g × 0,202 ÷ 2,5 = 0,33128 g Natrium`
- `n(Na) ≈ 14,41 mmol`
- *falls das gesamte Natrium aus NaHCO₃ stammt*: `m(NaHCO₃) ≈ 1,211 g`
- bei ausreichender Säure: `m(CO₂) ≤ ca. 0,634 g`

**Wichtig:** Weitere Natriumverbindungen stehen ausdrücklich auf der Zutatenliste. Damit ist die Rechnung **eine bedingte Obergrenze** und keine vollständige Rezepturrekonstruktion. Die absolute Citronensäuremasse von etwa 1,88 g aus der Gemini-Notiz ist **nicht** über die öffentlich vorliegenden Produktangaben belegt.

## Welche Teile des Modells sind Hypothesen?

### 1. Effektive CO₂-Bildung als Weibull-Kurve

`M_gen(t) = M_max · (1 - exp(-(t/τ)^β))`

Die ursprünglichen Gemini-Startwerte wurden als **explorative Vorgaben** übernommen:

| Form | τ₀ / s | β |
|---|---:|---:|
| ganz | 46 | 1,65 |
| geviertelt | 28 | 1,30 |
| fein gemörsert | 11 | 0,90 |

Für halbiert und grob zerkleinert liegen ergänzende heuristische Zwischenwerte vor; **keine** dieser Konstanten ist mit Mivolis-Messungen kalibriert. Der Temperaturfaktor `exp(0,035·(T−20))` ist ebenfalls eine Hypothese, keine gemessene Aktivierungsenergie.

### 2. Henry-Potential (nicht: gemessener Gasrückhalt)

`k_H(T) = 0,034 · exp(2400 · (1/T_K − 1/298,15))` in mol/(L·bar)

Als großzügige Partialdruckgrenze wird `p_CO₂ ≈ 0,98 bar − p_H₂O(T)` angesetzt. **Dieser Blasenpartialdruck ist nicht der CO₂-Partialdruck über einer ruhigen, offenen Lösung.** Die Bulk-Flüssigkeit erreicht im dynamischen Brauseversuch keineswegs nachweislich dieses Gleichgewicht.

Ein effektiver Druckanteil (10–100 %) ist einstellbar, um diese Annahme experimentell zu hinterfragen. Ein empirischer Matrixfaktor `10^(−0,028·(200/V)·(m_tab/4,10))` und die Sättigungs-/Retentionsfaktoren aus der Gemini-Notiz sind **nicht validiert**. Für gesättigte NaCl-Lösung wird optional nur als **Gedankenszenario** der pauschale Faktor 0,22 verwendet – keine geprüfte Vorhersage, zumal Dichte, Aktivität, Viskosität und Kinetik mitverändert werden.

### 3. Verteilung zwischen „gebildet“, „zurückgehalten“ und „ausgetreten“

Die dynamische Retentionsformel der Gemini-Notiz wird als **phänomenologischer Ansatz** verwendet. In jedem Zeitschritt gilt definitionsgemäß:

`M_gen(t) = M_diss,modell(t) + M_austritt,modell(t)`

Das ist **keine** Aussage, dass CO₂ tatsächlich nur in diesen beiden Speichern vorliegt. Gasblasen im Becher, CO₂ im Kopfraum, Hydrogencarbonat und zeitversetzter Stofftransport werden nicht eigenständig modelliert.

### 4. Rückrechnung aus dem Waagenendwert

Der Ausdruck

`M_CO₂,bedingt = Δm_Waage,exp + M_diss,modell`

wird auf Wunsch zur **bedingten Szenariorechnung** angezeigt. Er darf **nicht** als „wahre CO₂-Menge“ oder unabhängige Gehaltsbestimmung bezeichnet werden. Ohne getrennte Messung des gelösten CO₂ oder Bilanzierung von Spritz-/Verdunstungsverlusten ist die Inversion nicht eindeutig.

## Bedienung

1. Unter **Versuch vorbereiten** das Produkt **Mivolis Vitamin C** wählen.
2. Die individuell bestimmte Tablettenmasse, Wasser-Starttemperatur und Tablettenform eintragen.
3. Im Bereich **Prognose** zuerst die eigene SchülerInnen-Vorhersage festhalten.
4. Im Forschungsbereich die Modellparameter variieren: Wasservolumen, effektiver CO₂-Druck, Retentionsfaktor, Zeitfaktor, Matrixparameter, NaCl-Gedankenszenario.
5. Das Diagramm zeigt getrennt: modelliert gebildetes CO₂, modelliert zurückgehaltenes CO₂, modellierten Waagenverlust und – falls vorhanden – reale Messwerte.
6. Den ersten passenden Mivolis-Lauf im **500-mL-Becher mit ca. 200 g Wasser** aufnehmen. Gemessene Daten immer als Rohdaten erhalten.
7. Der Button **„Modell und Messwerte als Hub-JSON kopieren“** überträgt nur in die Zwischenablage; ein angebundener Tabletten-Hub existiert bislang nicht. `localStorage` verschiedener Webseiten-Domains wäre nicht gegenseitig sichtbar.

## Versuchsvorschlag für die Validierung

- Reproduzierbarkeit: 3 × Mivolis ganz, 20–22 °C, je ca. 200 g Wasser
- Temperaturen: 15 / 22 / 35 °C, ganze Tablette, gleiche Geometrie und Wassermasse
- Form: ganz vs. geviertelt; Temperatur und Wassermasse konstant
- **separat**: Blank-Verdunstungsdrift, Spritzrückstand auf der Waagschale, ggf. qualitative Videomarker für Blasenentwicklung / Aufschwimmen
- Entscheidend: `Δm∞`, `t50`, `t90`, Startphase und tatsächlich bekannte Störgrößen gegenüber Modellvorhersagen vergleichen. Parameter **nicht** solange anpassen, bis eine Kurve hübsch aussieht.

## Literatur zur Einordnung (keine Quelle der frei gewählten Modellparameter)

- Stepanek, Loo & Lim (2006), *Multiscale modelling methodology for virtual prototyping of effervescent tablets*, J. Pharm. Sci. 95, 1614–1625. https://pubmed.ncbi.nlm.nih.gov/16732565/
- Sun & Cubaud (2011), *Dissolution of carbon dioxide bubbles and microfluidic multiphase flows*, Lab on a Chip 11, 2924–2928. https://doi.org/10.1039/C1LC20348G

Die Forschungsmodell-Gleichungen sind eine Aufbereitung der vom Nutzer bereitgestellten Gemini-Arbeitsnotizen, nicht behauptete Ergebnisse dieser Literatur.

## Didaktischer Leitgedanke

**Vorhersage (SchülerInnen) → reales Experiment → deterministische Auswertung → Modellprüfung → KI als wissenschaftlicher Kritiker → Transfer ohne KI.**
