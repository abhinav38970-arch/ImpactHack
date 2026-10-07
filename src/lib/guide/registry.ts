/**
 * LiverLoop Guide — educational content registry (server-owned).
 *
 * Every entry with `sourceVerified: true` was retrieved and reviewed from
 * the cited page on the recorded date. Entries without verification carry
 * NO body text and are never supplied to the model or rendered as guidance.
 * `clinicianReviewed` stays false until a real clinician reviews the entry.
 */

export interface EduEntry {
  id: string;
  title: string;
  keywords: string[];
  /** Null when unverified — never sent to the model, never rendered. */
  body: {
    measures: string;
    notEstablished: string;
    askClinician: string;
  } | null;
  sourceTitle: string;
  sourceUrl: string;
  dateChecked: string;
  sourceVerified: boolean;
  clinicianReviewed: boolean;
}

const CHECKED = '2026-10-07';

export const EDU_REGISTRY: EduEntry[] = [
  {
    id: 'masld-overview',
    title: 'Fatty liver disease (NAFLD / MASLD)',
    keywords: ['masld', 'nafld', 'fatty liver', 'steatohepatitis', 'nash', 'steatosis', 'liver disease'],
    body: {
      measures:
        'NAFLD (also called metabolic dysfunction-associated steatotic liver disease, or MASLD) is a condition where excess fat builds up in the liver, not caused by heavy alcohol use. It has two types: NAFL, where there is fat with little or no inflammation or damage, and NASH, where there is inflammation and liver damage that can cause scarring (fibrosis) and may lead to cirrhosis. It is often a silent disease with few or no symptoms.',
      notEstablished:
        'General information about fatty liver does not say which type anyone has, how their condition will change over time, or which follow-up fits them. Those answers need a clinician who knows their history and test results.',
      askClinician:
        'What type of fatty liver condition do my results point to, and what follow-up makes sense for me?',
    },
    sourceTitle: 'NIDDK: Definition & Facts of NAFLD & NASH',
    sourceUrl: 'https://www.niddk.nih.gov/health-information/liver-disease/nafld-nash/definition-facts',
    dateChecked: CHECKED,
    sourceVerified: true,
    clinicianReviewed: false,
  },
  {
    id: 'liver-panel',
    title: 'Liver function tests (liver panel)',
    keywords: ['liver panel', 'liver function', 'liver tests', 'lft', 'liver profile'],
    body: {
      measures:
        'A liver panel uses a blood sample to measure several substances, including albumin, total protein, the enzymes ALP, ALT, AST and GGT, bilirubin, and LDH, plus prothrombin time (how long blood takes to clot). Some of these show how the liver is working; others can show possible damage.',
      notEstablished:
        'Liver function tests alone usually cannot diagnose specific diseases. When results are abnormal, providers usually order other tests to find the exact cause, comparing all measured substances for patterns — so one value on its own settles very little.',
      askClinician:
        'How do my liver panel results fit together, and do I need other tests?',
    },
    sourceTitle: 'MedlinePlus: Liver Function Tests',
    sourceUrl: 'https://medlineplus.gov/lab-tests/liver-function-tests/',
    dateChecked: CHECKED,
    sourceVerified: true,
    clinicianReviewed: false,
  },
  {
    id: 'alt',
    title: 'ALT blood test',
    keywords: ['alt', 'alanine', 'transaminase', 'sgpt'],
    body: {
      measures:
        'ALT is an enzyme found mainly in the liver. When liver cells are damaged, they release ALT into the bloodstream, so the test is commonly used to help diagnose liver damage or disease — usually as part of a group of liver function tests.',
      notEstablished:
        'A high ALT does not always mean a condition needing treatment: age, sex, weight, medicines, supplements, intense exercise, and menstrual cycle can affect results. The amount of ALT is also not related to how much the liver may be damaged. Only a provider seeing the full picture can say what a result means.',
      askClinician:
        'What could be influencing my ALT result, and should it be rechecked?',
    },
    sourceTitle: 'MedlinePlus: ALT Blood Test',
    sourceUrl: 'https://medlineplus.gov/lab-tests/alt-blood-test',
    dateChecked: CHECKED,
    sourceVerified: true,
    clinicianReviewed: false,
  },
  {
    id: 'ast',
    title: 'AST test',
    keywords: ['ast', 'aspartate', 'sgot'],
    body: {
      measures:
        'AST is an enzyme found mainly in the liver but also in the heart, muscles, and other tissues. When cells containing AST are damaged, they release it into the blood. The test is often part of routine screening or liver monitoring, frequently ordered alongside ALT.',
      notEstablished:
        'An out-of-range AST does not always mean a condition needing treatment — pregnancy, exercise, medicines, age, and sex can affect results. Because AST also comes from tissues other than the liver, it cannot by itself pinpoint the liver as the source.',
      askClinician:
        'My AST was measured with ALT — what does that combination suggest in my case?',
    },
    sourceTitle: 'MedlinePlus: AST Test',
    sourceUrl: 'https://medlineplus.gov/lab-tests/ast-test/',
    dateChecked: CHECKED,
    sourceVerified: true,
    clinicianReviewed: false,
  },
  {
    id: 'ggt',
    title: 'GGT test',
    keywords: ['ggt', 'gamma', 'glutamyl', 'bile duct'],
    body: {
      measures:
        'GGT is an enzyme found mainly in the liver. Damage to the liver or bile ducts can leak GGT into the blood. It is often ordered with other liver tests — especially ALP, which helps tell liver or bile-duct issues apart from bone disorders. Alcohol use raises GGT levels.',
      notEstablished:
        'A GGT result cannot diagnose the specific cause of liver damage; it only indicates damage may be present. Medicines, supplements, smoking, alcohol, and recent meals can affect the result.',
      askClinician:
        'What might be affecting my GGT result, including medicines or alcohol use I should mention?',
    },
    sourceTitle: 'MedlinePlus: Gamma-glutamyl Transferase (GGT) Test',
    sourceUrl: 'https://medlineplus.gov/lab-tests/gamma-glutamyl-transferase-ggt-test/',
    dateChecked: CHECKED,
    sourceVerified: true,
    clinicianReviewed: false,
  },
  {
    id: 'triglycerides',
    title: 'Triglycerides test',
    keywords: ['triglyceride', 'triglycerides', 'lipid', 'cholesterol', 'trig'],
    body: {
      measures:
        'A triglycerides test measures a type of fat in the blood, usually as part of a lipid profile. High levels may raise the risk of heart disease, stroke, and other artery conditions; very high levels raise the risk of pancreatitis. High levels usually cause no symptoms, which is why routine testing matters.',
      notEstablished:
        'One triglyceride value does not set personal risk or treatment by itself — providers read it with cholesterol results, history, and other risks. Fasting (usually 9–12 hours) can matter for the result.',
      askClinician:
        'How do my triglyceride results fit with my other lipid results, and was fasting needed?',
    },
    sourceTitle: 'MedlinePlus: Triglycerides Test',
    sourceUrl: 'https://medlineplus.gov/lab-tests/triglycerides-test/',
    dateChecked: CHECKED,
    sourceVerified: true,
    clinicianReviewed: false,
  },
  {
    id: 'platelet',
    title: 'Platelet count',
    keywords: ['platelet'],
    body: null,
    sourceTitle: 'Pending verification',
    sourceUrl: '',
    dateChecked: '',
    sourceVerified: false,
    clinicianReviewed: false,
  },
  {
    id: 'hba1c',
    title: 'HbA1c test',
    keywords: ['hba1c', 'a1c', 'blood sugar', 'hemoglobin'],
    body: null,
    sourceTitle: 'Pending verification',
    sourceUrl: '',
    dateChecked: '',
    sourceVerified: false,
    clinicianReviewed: false,
  },
];

export function verifiedEntries(): EduEntry[] {
  return EDU_REGISTRY.filter((e) => e.sourceVerified && e.body !== null);
}

export function knownSourceIds(): Set<string> {
  return new Set(verifiedEntries().map((e) => e.id));
}

export function getVerifiedByIds(ids: string[]): EduEntry[] {
  const map = new Map(verifiedEntries().map((e) => [e.id, e]));
  const out: EduEntry[] = [];
  for (const id of ids) {
    const e = map.get(id);
    if (e && !out.includes(e)) out.push(e);
  }
  return out;
}

function normalize(s: string): string {
  return s.toLowerCase();
}

/** Keyword retrieval over verified entries only. Max `limit`, stable order. */
export function findRelevant(message: string, limit = 3): EduEntry[] {
  const text = normalize(message);
  const scored: Array<{ entry: EduEntry; score: number }> = [];
  for (const entry of verifiedEntries()) {
    let score = 0;
    for (const kw of entry.keywords) {
      if (kw.length <= 3 ? new RegExp(`\\b${kw}\\b`).test(text) : text.includes(kw)) {
        score += kw.length <= 3 ? 3 : kw.length >= 8 ? 2 : 1;
      }
    }
    if (score > 0) scored.push({ entry, score });
  }
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, limit).map((s) => s.entry);
}

export function groundingText(entries: EduEntry[]): string {
  return entries
    .map(
      (e) =>
        `[source:${e.id}] ${e.title}\nWhat it is: ${e.body!.measures}\nWhat it does not establish: ${e.body!.notEstablished}`,
    )
    .join('\n\n');
}
