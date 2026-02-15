import type { StoredConcept } from './conceptStorage';
import type { Campaign } from './campaignStorage';

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function getGradeLetter(score: number): string {
  if (score >= 90) return 'A+';
  if (score >= 85) return 'A';
  if (score >= 80) return 'A-';
  if (score >= 75) return 'B+';
  if (score >= 70) return 'B';
  if (score >= 60) return 'C+';
  if (score >= 50) return 'C';
  return 'D';
}

export function exportCampaignAsPDF(campaign: Campaign, concepts: StoredConcept[]): void {
  const brief = campaign.brief;
  const hasBrief = brief.objective || brief.targetAudience || brief.keyMessage;

  const html = `<!DOCTYPE html>
<html><head><meta charset="UTF-8">
<title>${esc(campaign.name)} - Campaign Deck</title>
<style>
  @page { margin: 40px 50px; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Helvetica Neue', Arial, sans-serif; background: #0a0a0a; color: #fff; }

  .slide { min-height: 100vh; display: flex; flex-direction: column; justify-content: center; padding: 60px 80px; page-break-after: always; position: relative; }

  /* Cover */
  .cover { text-align: center; align-items: center; }
  .cover h1 { font-size: 52px; font-weight: 900; letter-spacing: 3px; text-transform: uppercase; }
  .cover .meta { font-size: 14px; color: rgba(255,255,255,0.4); margin-top: 12px; }
  .cover .status { display: inline-block; border: 1px solid rgba(255,255,255,0.2); padding: 4px 16px; font-size: 11px; letter-spacing: 2px; text-transform: uppercase; color: rgba(255,255,255,0.5); margin-top: 16px; }
  .cover .desc { font-size: 16px; color: rgba(255,255,255,0.6); margin-top: 20px; max-width: 600px; }

  /* Brief slide */
  .brief-slide h2 { font-size: 12px; letter-spacing: 3px; text-transform: uppercase; color: rgba(255,255,255,0.35); margin-bottom: 32px; }
  .brief-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 32px; }
  .brief-item label { display: block; font-size: 10px; letter-spacing: 2px; text-transform: uppercase; color: rgba(255,255,255,0.35); margin-bottom: 6px; }
  .brief-item p { font-size: 16px; color: rgba(255,255,255,0.85); line-height: 1.6; }
  .brief-item.full { grid-column: 1 / -1; }

  /* Concept slides */
  .slide-num { position: absolute; top: 40px; right: 60px; font-size: 48px; font-weight: 900; color: rgba(255,255,255,0.06); }
  .slide h1 { font-size: 44px; font-weight: 900; line-height: 1.1; max-width: 80%; margin-bottom: 12px; }
  .slide h2 { font-size: 20px; font-weight: 400; color: #67e8f9; font-style: italic; margin-bottom: 24px; }
  .device-tag { display: inline-block; border: 1px solid rgba(255,255,255,0.2); padding: 4px 14px; font-size: 11px; letter-spacing: 2px; text-transform: uppercase; color: rgba(255,255,255,0.5); margin-bottom: 30px; }
  .body { font-size: 18px; line-height: 1.7; color: rgba(255,255,255,0.8); max-width: 700px; margin-bottom: 24px; }
  .visual-block { background: rgba(255,255,255,0.05); border-left: 3px solid rgba(255,255,255,0.15); padding: 16px 20px; margin-bottom: 24px; max-width: 700px; }
  .vl { font-size: 9px; letter-spacing: 2px; color: rgba(255,255,255,0.35); display: block; margin-bottom: 6px; }
  .visual-block p { font-size: 14px; color: rgba(255,255,255,0.6); font-style: italic; }
  .score-row { display: flex; gap: 12px; margin-top: 20px; }
  .score-pill { background: rgba(255,255,255,0.08); padding: 10px 16px; text-align: center; min-width: 60px; }
  .sp-val { display: block; font-size: 22px; font-weight: 800; color: #60A5FA; }
  .sp-lbl { display: block; font-size: 9px; letter-spacing: 1px; color: rgba(255,255,255,0.4); margin-top: 2px; }

  .footer { text-align: center; font-size: 11px; color: rgba(255,255,255,0.2); }

  @media print { .slide { height: 100vh; } }
</style></head><body>

<!-- Cover Slide -->
<div class="slide cover">
  <h1>${esc(campaign.name)}</h1>
  <div class="status">${esc(campaign.status)}</div>
  ${campaign.description ? `<div class="desc">${esc(campaign.description)}</div>` : ''}
  <div class="meta">${concepts.length} Concept${concepts.length !== 1 ? 's' : ''} | ${new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</div>
</div>

${hasBrief ? `
<!-- Brief Slide -->
<div class="slide brief-slide">
  <h2>Campaign Brief</h2>
  <div class="brief-grid">
    ${brief.objective ? `<div class="brief-item"><label>Objective</label><p>${esc(brief.objective)}</p></div>` : ''}
    ${brief.targetAudience ? `<div class="brief-item"><label>Target Audience</label><p>${esc(brief.targetAudience)}</p></div>` : ''}
    ${brief.keyMessage ? `<div class="brief-item full"><label>Key Message</label><p>${esc(brief.keyMessage)}</p></div>` : ''}
    ${brief.tone ? `<div class="brief-item"><label>Tone</label><p>${esc(brief.tone)}</p></div>` : ''}
    ${brief.mandatories ? `<div class="brief-item"><label>Mandatories</label><p>${esc(brief.mandatories)}</p></div>` : ''}
    ${brief.additionalNotes ? `<div class="brief-item full"><label>Additional Notes</label><p>${esc(brief.additionalNotes)}</p></div>` : ''}
  </div>
</div>
` : ''}

${concepts.map((c, i) => {
  const scores = [
    { label: 'ORI', value: c.originalityScore },
    { label: 'PRO', value: c.professionalismScore },
    { label: 'CLR', value: c.clarityScore },
    { label: 'FRS', value: c.freshnessScore },
    { label: 'RES', value: c.resonanceScore },
    { label: 'AWD', value: c.awardsScore },
  ].filter(s => s.value && s.value > 0);

  return `
<div class="slide">
  <div class="slide-num">${String(i + 1).padStart(2, '0')}</div>
  <h1>${esc(c.headlines[0] || 'Untitled')}</h1>
  ${c.tagline ? `<h2>${esc(c.tagline)}</h2>` : ''}
  <div class="device-tag">${esc(c.rhetoricalDevice)}</div>
  ${c.bodyCopy ? `<p class="body">${esc(c.bodyCopy)}</p>` : ''}
  ${c.visualDescription ? `<div class="visual-block"><span class="vl">VISUAL DIRECTION</span><p>${esc(c.visualDescription)}</p></div>` : ''}
  ${scores.length > 0 ? `<div class="score-row">${scores.map(s =>
    `<div class="score-pill"><span class="sp-val">${s.value}</span><span class="sp-lbl">${s.label}</span></div>`
  ).join('')}</div>` : ''}
</div>`;
}).join('\n')}

<div class="slide footer" style="justify-content: center; align-items: center; text-align: center;">
  <p>Generated by Concept Forge | thecforge.com</p>
</div>
</body></html>`;

  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${campaign.name.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase()}-deck-${Date.now()}.html`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
