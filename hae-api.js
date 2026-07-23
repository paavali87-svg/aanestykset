// Hakee eduskunnan taysistuntoaanestykset api.eduskunta.fi -rajapinnasta
// ja kirjoittaa docs/data.json. Ajetaan GitHub Actionsissa joka yo.
const fs = require("node:fs");
const path = require("node:path");

const JUURI = "https://api.eduskunta.fi/api/v1/taysistunnot/istunnon-aanestykset/";
const VUODET = (process.env.VUODET || "2026").split(",").map(v => v.trim()).filter(Boolean);
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
  for (let y = 0; y < 3; y++) {
    const v = await fetch(url, { headers: {
      "Accept": "application/json",
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/125.0 Safari/537.36" } });
    if (v.ok) return v.json();
    if (v.status === 404) return null;
    if (y === 2) throw new Error(url + " palautti " + v.status);
    await new Promise((r) => setTimeout(r, 1000 * (y + 1)));
  }
}
function kerro(x, ulos) {
  if (Array.isArray(x)) { for (const y of x) kerro(y, ulos); }
  else if (x && x.aanestysnumero !== undefined) ulos.push(x);
}

async function main() {
  const indeksi = new Map();
  const edustajat = [];
  const kaikki = new Map();

  for (const vuosi of VUODET) {
    let loydetty = 0;
    for (let n = 1; n <= 220; n++) {
      let data = null;
      try { data = await hae(JUURI + vuosi + "-" + n); } catch (e) { console.log("  istunto " + n + ": " + e.message); }
      const rivit = [];
      kerro(data, rivit);
      if (!rivit.length) continue;
      loydetty += rivit.length;
      for (const r of rivit) {
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
        kaikki.set(String(r.id), {
          id: String(r.id), numero: Number(r.aanestysnumero) || 0,
          istunto: String(r.istuntonumero || n), pvm: String(r.istuntopvm || "").slice(0, 10),
          otsikko: fi(r.aanestysotsikko), kohta: fi(r.kohta && r.kohta.otsikko),
          vaihe: fi(r.kohta && r.kohta.kasittelyvaihenimi),
          asia: "", asiaUrl: "", poytakirja: "", poytakirjaUrl: "",
          jaa: tulos.jaa | 0, ei: tulos.ei | 0, tyhjaa: tulos.tyhjia | 0, poissa: tulos.poissa | 0,
          aanet: aanet, ryhmat: ryhmat });
      }
      if (n % 20 === 0) console.log("  istunto " + n + ": yhteensa " + loydetty + " aanestysta");
    }
    console.log("Vuosi " + vuosi + ": " + loydetty + " aanestysta");
  }

  const lista = [...kaikki.values()].sort((a, b) =>
    a.pvm === b.pvm ? b.numero - a.numero : b.pvm.localeCompare(a.pvm));
  const ulos = { haettu: new Date().toISOString(), lahde: "https://api.eduskunta.fi",
    vuodet: VUODET, edustajat: edustajat, aanestykset: lista };
  if (!fs.existsSync(DOCS)) fs.mkdirSync(DOCS, { recursive: true });
  fs.writeFileSync(TIEDOSTO, JSON.stringify(ulos));
  let tuntematon = 0;
  for (const a of lista) for (const x of a.aanet) if (x[1] === "?") tuntematon++;
  console.log("Valmis: " + lista.length + " aanestysta, " + edustajat.length +
    " edustajaa, tuntemattomia aania " + tuntematon + ".");
}
main().catch((e) => { console.error("VIRHE:", e.message); process.exit(1); });
