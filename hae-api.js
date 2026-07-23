// Hakee aanestysdatan api.eduskunta.fi -rajapinnasta ja paivittaa docs/data.json.
const fs = require("node:fs");
const path = require("node:path");
const URL_UUSIMMAT = "https://api.eduskunta.fi/api/v1/taysistunnot/uusimmat-aanestykset";
const DOCS = path.join(__dirname, "docs");
const TIEDOSTO = path.join(DOCS, "data.json");
const KOODI = { "Jaa": "J", "Ei": "E", "Poissa": "P" };
function koodi(teksti) {
  const t = String(teksti || "").trim();
  if (KOODI[t]) return KOODI[t];
  if (t.indexOf("Tyhj") === 0) return "T";
  return "?";
}
const fi = (o) => (o && typeof o === "object" ? String(o.fi || "") : String(o || ""));
async function hae(url) {
  for (let y = 0; y < 4; y++) {
    const v = await fetch(url, { headers: {
      "Accept": "application/json",
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/125.0 Safari/537.36" } });
    if (v.ok) return v.json();
    if (y === 3) throw new Error(url + " palautti " + v.status);
    await new Promise((r) => setTimeout(r, 1000 * (y + 1)));
  }
}
async function main() {
  let vanha = { edustajat: [], aanestykset: [] };
  if (fs.existsSync(TIEDOSTO)) {
    try { vanha = JSON.parse(fs.readFileSync(TIEDOSTO, "utf8")); }
    catch (e) { console.log("Vanhaa data.json ei voitu lukea, aloitetaan tyhjalta."); }
  }
  console.log("Vanhassa datassa " + vanha.aanestykset.length + " aanestysta, " + vanha.edustajat.length + " edustajaa.");
  const indeksi = new Map();
  const edustajat = [];
  for (const e of vanha.edustajat) {
    indeksi.set(e.sukunimi + "|" + e.etunimi + "|" + e.ryhma, edustajat.length);
    edustajat.push(e);
  }
  console.log("Haetaan uusimmat aanestykset api.eduskunta.fi -rajapinnasta...");
  const raaka = await hae(URL_UUSIMMAT);
  const tietueet = [];
  for (const osa of (Array.isArray(raaka) ? raaka : [raaka])) {
    for (const r of (Array.isArray(osa) ? osa : [osa])) tietueet.push(r);
  }
  console.log("  rajapinta palautti " + tietueet.length + " aanestysta");
  const uudet = [];
  for (const r of tietueet) {
    const tulos = r.aanestystulos || {};
    const aanet = [];
    for (const t of (r.aanestystapahtumat || [])) {
      const ryhma = fi(t.edkryhmalyhenne).trim();
      const avain = t.sukunimi + "|" + t.etunimi + "|" + ryhma;
      if (!indeksi.has(avain)) {
        indeksi.set(avain, edustajat.length);
        edustajat.push({ sukunimi: t.sukunimi, etunimi: t.etunimi, ryhma: ryhma });
      }
      aanet.push([indeksi.get(avain), koodi(fi(t.kayttaytyminen))]);
    }
    const ryhmat = (r.eduskuntaryhmaJakaumat || []).map((g) => ({
      ryhma: fi(g.nimi), jaa: g.jaa | 0, ei: g.ei | 0, tyhjaa: g.tyhjia | 0, poissa: g.poissa | 0 }));
    uudet.push({
      id: String(r.id), numero: Number(r.aanestysnumero) || 0,
      istunto: String(r.istuntonumero || ""), pvm: String(r.istuntopvm || "").slice(0, 10),
      otsikko: fi(r.aanestysotsikko), kohta: fi(r.kohta && r.kohta.otsikko),
      vaihe: fi(r.kohta && r.kohta.kasittelyvaihenimi),
      asia: "", asiaUrl: "", poytakirja: "", poytakirjaUrl: "",
      jaa: tulos.jaa | 0, ei: tulos.ei | 0, tyhjaa: tulos.tyhjia | 0, poissa: tulos.poissa | 0,
      aanet: aanet, ryhmat: ryhmat });
  }
  const kaikki = new Map();
  for (const a of vanha.aanestykset) kaikki.set(String(a.id), a);
  let lisatty = 0;
  for (const a of uudet) { if (!kaikki.has(a.id)) lisatty++; kaikki.set(a.id, a); }
  const lista = [...kaikki.values()].sort((a, b) =>
    a.pvm === b.pvm ? b.numero - a.numero : b.pvm.localeCompare(a.pvm));
  const ulos = { haettu: new Date().toISOString(), lahde: "https://api.eduskunta.fi",
    vuodet: [...new Set(lista.map((a) => a.pvm.slice(0, 4)))].sort(),
    edustajat: edustajat, aanestykset: lista };
  if (!fs.existsSync(DOCS)) fs.mkdirSync(DOCS, { recursive: true });
  fs.writeFileSync(TIEDOSTO, JSON.stringify(ulos));
  let tuntematon = 0;
  for (const a of lista) for (const x of a.aanet) if (x[1] === "?") tuntematon++;
  console.log("Valmis: " + lista.length + " aanestysta (uusia " + lisatty + "), " +
    edustajat.length + " edustajaa, tuntemattomia aania " + tuntematon + ".");
}
main().catch((e) => { console.error("VIRHE:", e.message); process.exit(1); });