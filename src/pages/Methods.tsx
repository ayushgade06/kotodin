import { ArrowUpRight } from 'lucide-react';
import { FE_RHA_LITERATURE as P, K_RANGE, MIN_CALIBRATION_TESTS } from '../engine';

const A = ({ href, children }: { href: string; children: React.ReactNode }) => (
  <a href={href} target="_blank" rel="noreferrer" className="inline-flex items-center gap-0.5 text-water underline decoration-water/30 underline-offset-4 hover:decoration-water">{children}<ArrowUpRight className="size-3" aria-hidden /></a>
);
const Tag = ({ children }: { children: React.ReactNode }) => <span className="rounded bg-due-50 px-1.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-due-ink">{children}</span>;
const Eq = ({ children }: { children: React.ReactNode }) => <div className="my-3 overflow-x-auto rounded-lg border border-line bg-surface px-4 py-3 font-mono text-[13.5px] text-ink">{children}</div>;

const SECTIONS = [['model', 'The model'], ['parameters', 'Parameters'], ['calibration', 'Calibration'], ['queue', 'Status & visit queue'], ['data', 'Survey data'], ['card', 'Family card & privacy'], ['limits', 'Limitations'], ['credits', 'Sources, licences & disclosure']] as const;

export default function Methods() {
  return (
    <div className="mx-auto grid max-w-[1200px] gap-10 px-4 py-10 sm:px-6 lg:grid-cols-[220px_1fr]">
      <nav aria-label="On this page" className="hidden lg:block">
        <div className="sticky top-24">
          <div className="eyebrow mb-3">On this page</div>
          <ul className="space-y-1.5 border-l border-line text-sm">
            {SECTIONS.map(([id, l]) => <li key={id}><a href={`#${id}`} className="-ml-px block border-l border-transparent pl-3 text-ink-2 hover:border-ink hover:text-ink">{l}</a></li>)}
          </ul>
        </div>
      </nav>
      <article className="min-w-0 max-w-[72ch] text-[15.5px] leading-relaxed text-ink-2 [&_h2]:display [&_h2]:mt-14 [&_h2]:scroll-mt-24 [&_h2]:text-[28px] [&_h2]:font-medium [&_h2]:text-ink [&_h3]:mt-6 [&_h3]:font-semibold [&_h3]:text-ink [&_p]:mt-3 [&_li]:mt-1.5">
        <div className="eyebrow">Methods &amp; limits</div>
        <h1 className="display mt-2 text-[clamp(32px,4.4vw,48px)] font-medium leading-tight text-ink">How Kotodin calculates, and what it can’t tell you.</h1>
        <p className="mt-4 text-[17px]">Kotodin is a <strong className="text-ink">planning aid, not a safety certification</strong>. It estimates when a household filter’s adsorbent pouch is likely to stop removing arsenic, so programs can test and replace in time. Only a water test confirms that water is safe.</p>

        <h2 id="model">The model</h2>
        <p>Each pouch holds a limited mass of arsenic before filtered water exceeds the 10 µg/L WHO guideline. Kotodin estimates that capacity from a Langmuir adsorption isotherm and divides it by the arsenic arriving each day.</p>
        <Eq>C = C₀ / 1000 <span className="text-muted">(µg/L → mg/L)</span></Eq>
        <Eq>qe(C) = q<sub>max</sub> · b · C / (1 + b · C) <span className="text-muted">(mg As per g media, at equilibrium)</span></Eq>
        <Eq>Q = mass<sub>g</sub> · qe · derate · f<sub>BT</sub> · k <span className="text-muted">(usable capacity, mg As)</span></Eq>
        <Eq>L = C · litres per day <span className="text-muted">(daily arsenic load, mg/day)</span></Eq>
        <Eq>D = Q / L <span className="text-muted">(days to breakthrough)</span></Eq>
        <p>D is computed three times, with low, mid and high values of q<sub>max</sub> and derating, giving a band. <strong className="text-ink">The replace-by date uses the low band</strong> (install date + ⌊D<sub>low</sub>⌋), so the forecast is cautious by design. If C₀ ≤ 10 µg/L no arsenic filter is needed. Dates are calendar days in UTC, so the result does not shift with timezone.</p>

        <h2 id="parameters">Parameters and assumptions</h2>
        <p>Every value below is an <Tag>assumption</Tag> until a specific filter’s media is measured. Programs can replace them with their own lab isotherm (“Your lab data”) on the dashboard and in the Design Lab.</p>
        <div className="relative mt-4 overflow-x-auto rounded-xl border border-line bg-surface">
          <table className="w-full min-w-[600px] text-left text-sm">
            <thead className="bg-paper/60 text-[12.5px] text-muted"><tr><th className="px-4 py-2.5 font-medium">Parameter</th><th className="font-medium">Low / mid / high</th><th className="pr-4 font-medium">Basis</th></tr></thead>
            <tbody className="[&_td]:border-t [&_td]:border-line [&_td]:py-2.5 [&_td:first-child]:px-4 [&_td:last-child]:pr-4 tnum">
              <tr><td>q<sub>max</sub> (mg/g)</td><td>{P.qmax.join(' / ')}</td><td>Low: Fe-modified rice-husk carbon, <A href="https://doi.org/10.2965/jwet.2009.43">JWET 2009</A>. Mid: Fe-modified rice-husk biochar, arsenate, <A href="https://www.ncbi.nlm.nih.gov/pmc/articles/PMC9692524/">PMC9692524</A>. High: 12 mg/g, a conservative ceiling <Tag>assumption</Tag></td></tr>
              <tr><td>b (L/mg)</td><td>{P.b}</td><td>Placeholder until a measured isotherm <Tag>assumption</Tag></td></tr>
              <tr><td>Field derating</td><td>{P.derate.join(' / ')}</td><td>Competing phosphate and silicate, pH, channelling <Tag>assumption</Tag></td></tr>
              <tr><td>f<sub>BT</sub></td><td>{P.fBT}</td><td>Share of equilibrium capacity used before effluent exceeds 10 µg/L <Tag>assumption</Tag></td></tr>
              <tr><td>Water use</td><td>5 L per person per day</td><td>Drinking and cooking only; editable per household <Tag>assumption</Tag></td></tr>
              <tr><td>Pouch cost</td><td>৳{P.pouchCostBDT}</td><td>Placeholder <Tag>assumption</Tag></td></tr>
              <tr><td>Demo pouch mass</td><td>1,000 g</td><td>Demo program only; the Design Lab starts at 250 g <Tag>assumption</Tag></td></tr>
              <tr><td>Target</td><td>10 µg/L</td><td>WHO guideline value for arsenic in drinking water</td></tr>
            </tbody>
          </table>
        </div>
        <p className="text-sm text-muted">Published capacities for iron-modified rice-husk materials differ by more than 10× and depend strongly on pH, arsenic species and competing ions. A higher value (~25 mg/g, Fe-oxide rice-husk ash) appears in a secondary listing whose primary source we could not verify, so it is not used.</p>

        <h2 id="calibration">Fleet calibration</h2>
        <p>When a field test finds filtered water at or above 10 µg/L, Kotodin records how much arsenic that pouch actually held:</p>
        <Eq>Q<sub>obs</sub> = L × days from install to the first failing effluent test</Eq>
        <Eq>r = Q<sub>obs</sub> / Q<sub>mid</sub> (lab-based, k = 1)</Eq>
        <Eq>k = clamp(median(r), {K_RANGE[0]}, {K_RANGE[1]}) once there are ≥ {MIN_CALIBRATION_TESTS} observations; otherwise k = 1</Eq>
        <p>k multiplies every filter’s capacity in the program, in all three bands. A median is used so that one odd test cannot swing the fleet. A failing test only bounds capacity from above (the pouch may have broken through a little earlier), so k is, if anything, slightly optimistic; the cautious low band offsets this. Passing tests are recorded but not used in k.</p>

        <h2 id="queue">Status and the visit queue</h2>
        <ul className="list-disc pl-5">
          <li><strong className="text-ink">OK</strong>: more than 7 days left on the cautious forecast. <strong className="text-ink">Due</strong>: 1–7 days. <strong className="text-ink">Overdue</strong>: 0 or fewer.</li>
          <li><strong className="text-ink">Breakthrough</strong>: an effluent test ≥ 10 µg/L since the current pouch was installed. This overrides the forecast.</li>
          <li><strong className="text-ink">No filter needed</strong>: well ≤ 10 µg/L. <strong className="text-ink">Test the well</strong>: no arsenic value yet.</li>
        </ul>
        <Eq>priority = (C₀ / 10) × household members × urgency</Eq>
        <p>Urgency is 3 for a breakthrough, 2 + min(days overdue, 30)/30 when overdue, and 1 when due. Status is always shown with an icon and words as well as colour.</p>

        <h2 id="data">Survey data</h2>
        <p>The Design Lab and the nearest-well estimates use the <A href="https://www.bgs.ac.uk/groundwater/download/dphe-bgs-national-hydrochemical-survey/">DPHE/BGS National Hydrochemical Survey</A> (fieldwork 1998–99, data release 25 May 2000): 3,534 tubewells from 61 of 64 districts, with coordinates, depth and arsenic. Values reported below detection (e.g. “&lt; 6”) are stored as half the detection limit. In the processed file, 42.1% of wells exceed 10 µg/L and 24.9% exceed 50 µg/L; 27.4% of shallow (&lt; 150 m) wells exceed 50 µg/L, matching BGS’s published figure of about 27%.</p>
        <p>The survey is a single sample per well taken over 25 years ago. Arsenic in a particular well can differ today, and it varies sharply between neighbouring wells. A nearest-wells median is labelled an <em>estimate</em> everywhere it appears; a field test of the household’s own well always replaces it.</p>
        <p>The demo program’s 40 households are <strong className="text-ink">synthetic</strong>. They are placed (with ±300 m jitter) on real survey wells around Sonargaon, Narayanganj, and use those wells’ arsenic values. Their install dates and test results are generated so the demo opens with a realistic mix of statuses.</p>

        <h2 id="card">The family card and privacy</h2>
        <p>The QR sticker links to a card whose numbers (household code, well arsenic, water use, pouch mass, media parameters, k and install date) are encoded in the part of the link after “#”. Browsers never send that part to a server, and it contains no names or locations. Kotodin has no accounts, no cookies and no analytics; program data is stored only in the browser on the device, and can be exported as a file.</p>
        <p>Because the card is self-contained, <strong className="text-ink">it cannot know about tests logged after the sticker was printed</strong>. Reprint the sticker after each pouch change or recalibration.</p>

        <h2 id="limits">Limitations</h2>
        <ul className="list-disc pl-5">
          <li>The forecast has not been validated against field data from any real filter program. It is an engineering estimate with wide, honest bands.</li>
          <li>Langmuir equilibrium capacity is an imperfect proxy for a flow-through pouch; real breakthrough depends on contact time, flow rate, arsenic species (As(III)/As(V)), iron, phosphate, silicate and pH.</li>
          <li>Water use is assumed, not measured. Households that drink more will exhaust pouches sooner.</li>
          <li>Calibration needs at least three caught breakthroughs and treats the whole program as one media batch.</li>
          <li>It does not assess health risk for individuals and must not be used to decide that water is safe.</li>
        </ul>

        <h2 id="credits">Sources, licences and disclosure</h2>
        <ul className="list-disc pl-5">
          <li>Survey data: DPHE/BGS (2001) <em>Arsenic contamination of groundwater in Bangladesh</em>, BGS Technical Report WC/00/19. Contains British Geological Survey materials © UKRI. The derived file is generated at build time from the official download and is not redistributed in the source repository.</li>
          <li>Abandonment finding: Sanchez et al. (2016) <A href="https://pmc.ncbi.nlm.nih.gov/articles/PMC4907796">Sci. Total Environ.</A>; filter support gaps: <A href="https://www.eawag.ch/fileadmin/Domain1/Abteilungen/sandec/publikationen/WST/Hanchett_2011.pdf">Hanchett 2011</A>; population exposure: <A href="https://washdata.org/report/bangladesh-2019-mics-report">Bangladesh MICS 2019</A>.</li>
          <li>Maps: © OpenStreetMap contributors (ODbL), tiles from openstreetmap.org. Fonts: Inter, Fraunces, Noto Sans Bengali (SIL Open Font Licence). Icons: Lucide (ISC).</li>
          <li><strong className="text-ink">No affiliation.</strong> Kotodin is an independent student project. It is not affiliated with or endorsed by KeebsforWater, PureHusk, BGS, DPHE or any organisation named here. PureHusk is mentioned only as an example of a replaceable-media filter whose lab results could be entered as custom media.</li>
          <li><strong className="text-ink">AI assistance.</strong> The code was written with substantial help from an AI coding assistant (Anthropic’s Claude). The model, data pipeline and automated tests are open source so anyone can check them.</li>
        </ul>
      </article>
    </div>
  );
}
