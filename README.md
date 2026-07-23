# Eduskunnan äänestykset

Sivu, joka näyttää eduskunnan täysistuntojen äänestykset. Voit selata äänestyksiä aiheen
mukaan tai **Kansanedustaja-välilehdellä hakea yksittäisen kansanedustajan nimellä** ja
katsoa, miten hän on äänestänyt.

Data haetaan eduskunnan avoimesta rajapinnasta **GitHubin omilla palvelimilla kerran
vuorokaudessa** (GitHub Actions, klo 02 UTC). Sivu pysyy ajan tasalla itsestään — omaa
konetta ei tarvita sen jälkeen kun sivu on kerran julkaistu. Tämä on GitHubissa ilmaista
julkisille repoille.

---

## Vaihtoehto A — sinulla on nämä tiedostot koneellasi

Helpoin tapa. Vaatii Windowsin ja GitHub-tunnuksen. **Sinun ei tarvitse osata mitään
komentoja** — kirjaudut vain selaimessa.

1. Kaksoisklikkaa tiedostoa **`Asenna.cmd`**.
   - Jos Windows varoittaa ("Windows suojasi tietokonetta"), valitse *Lisätietoja* →
     *Suorita joka tapauksessa*.
2. Ikkunaan ilmestyy **8 merkin koodi**, esim. `AB12-CD34`, ja selain avautuu osoitteeseen
   `https://github.com/login/device`.
   - Tämä ei ole salasana eikä 2FA-koodi. Se on kertakäyttöinen laitekoodi.
3. Kirjoita koodi selaimeen, kirjaudu GitHub-tunnuksellasi ja paina **Authorize**.
4. Palaa ikkunaan ja odota. Skripti tekee loput itse:
   luo repon `aanestykset`, lataa tiedostot, kytkee GitHub Pagesin päälle ja käynnistää
   datan haun GitHubin palvelimella.
5. Kun ikkunassa lukee **VALMIS JA TESTATTU**, sivusi on osoitteessa
   `https://<käyttäjätunnuksesi>.github.io/aanestykset/` ja avautuu selaimeen.

Ensimmäinen ajo kestää yleensä 1–3 minuuttia. Skripti ei sano "valmis" ennen kuin se on
oikeasti hakenut sivun ja datan verkosta ja saanut vastauksen.

Saman `Asenna.cmd`-tiedoston voi ajaa myöhemmin uudelleen: se päivittää tiedostot repoon.
Sitä **ei tarvitse** ajaa datan päivittämiseksi — se hoituu itsestään joka yö.

---

## Vaihtoehto B — teet tämän suoraan GitHubissa (ilman mitään tiedostoja koneella)

Toimii millä tahansa käyttöjärjestelmällä, pelkällä selaimella.

1. Mene tämän repon GitHub-sivulle ja paina oikeasta yläkulmasta **Fork** → **Create fork**.
2. Avaa oman kopiosi **Actions**-välilehti. Paina
   **I understand my workflows, go ahead and enable them**.
3. Mene **Settings** → vasemmalta **Pages**.
   - *Source*: **Deploy from a branch**
   - *Branch*: **main**, kansio **/docs** → **Save**
4. Palaa **Actions**-välilehdelle, valitse työnkulku **Paivita aanestysdata** ja paina
   **Run workflow** → **Run workflow**.
5. Odota vihreä ruksi (1–3 min). Sivusi on osoitteessa
   `https://<käyttäjätunnuksesi>.github.io/aanestykset/`.

Tämän jälkeen mitään ei tarvitse tehdä. Työnkulku ajaa itsensä joka yö klo 02 UTC.

---

## Tiedostot

| Tiedosto | Mitä tekee |
|---|---|
| `docs/index.html` | Sivu, joka näyttää datan. Välilehdet: Äänestykset ja Kansanedustaja (nimihaku). |
| `docs/data.json` | Haettu data. **Syntyy GitHubissa automaattisesti** — sitä ei ole repossa etukäteen. |
| `hae-api.js` | Hakee äänestykset rajapinnasta ja kirjoittaa `docs/data.json`. Ajetaan GitHubin palvelimella. |
| `.github/workflows/paivita.yml` | GitHub Actions -työnkulku: ajaa haun kerran vuorokaudessa. |
| `asenna.ps1` | Julkaisee kaiken GitHub-tunnuksellesi. |
| `Asenna.cmd` | Käynnistää `asenna.ps1`:n kaksoisklikkauksella. |

## Jos jokin menee pieleen

| Oire | Korjaus |
|---|---|
| Sivulla "Datan haku epäonnistui: HTTP 404" | `docs/data.json` puuttuu vielä. Aja Actions-välilehdellä **Paivita aanestysdata** ja odota vihreä ruksi. |
| Sivun osoite antaa 404 | Pages ei ole päällä. Settings → Pages → branch **main**, kansio **/docs** → Save. Odota minuutti. |
| Actions-välilehti on tyhjä | Kytke työnkulut forkissa päälle: Actions → *I understand my workflows...*. |
| Ajo epäonnistui punaisella | Avaa ajo ja katso vaiheen **Hae aanestysdata** loki. |
| `Asenna.cmd` ei tee mitään | Avaa PowerShell ja aja `powershell -ExecutionPolicy Bypass -File asenna.ps1`. |

## Datasta

Lähde: `https://api.eduskunta.fi/api/v1/taysistunnot/istunnon-aanestykset/`. "Poissa" tarkoittaa,
ettei edustaja äänestänyt kyseisessä äänestyksessä; se ei kerro syytä.