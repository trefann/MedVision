export interface DemoStep {
  route: string;
  title: string;
  say: string;
  todo?: string;
  action?: "screening";
}

export const DEMO_STEPS: DemoStep[] = [
  {
    route: "/dashboard",
    title: "The ASHA worker's home",
    say: "Every follow-up in one place. The referral loop shows where patients get lost: most flagged patients have not reached a hospital.",
    todo: "Point at the referral loop and the overdue patient.",
  },
  {
    route: "/capture",
    title: "Guided capture",
    say: "Four mouth sites. Each photo is checked for blur and light, and the AI model runs on the phone with no internet.",
    todo: "Optional: tap 'blurry' under 'Test the quality gate' to show a bad photo being rejected, then Retake. Then tap the button below.",
    action: "screening",
  },
  {
    route: "/triage",
    title: "Instant result",
    say: "Refer urgently, with a saliency map of what the model looked at. The score is 70% image and 30% tobacco habits. Triage support, not a diagnosis.",
  },
  {
    route: "/result",
    title: "Message for the patient",
    say: "The patient gets the result in their own language, spoken aloud.",
    todo: "Switch to Tamil and Hindi, then tap play.",
  },
  {
    route: "/patients/p4",
    title: "Referral tracker",
    say: "That screening opened a referral. This is the loop no existing app closes: flagged, referred, reached, biopsy.",
    todo: "Tap 'Confirm referral made', then 'Patient reached hospital'.",
  },
  {
    route: "/compare",
    title: "Change over time",
    say: "The app aligns two visits, corrects for the camera being closer, and measures growth. Validated on synthetic lesions of known size, 8 of 8 cases.",
    todo: "Tap 'Demo: lesion grew', then 'Measure change'.",
  },
  {
    route: "/district",
    title: "District view",
    say: "The health authority sees anonymised counts: where patients drop out and which centre needs attention. Only Melmaruvathur is live, the rest is sample data.",
  },
  {
    route: "/sync",
    title: "Works offline",
    say: "Screening, comparison and this whole app keep working with no signal, and data syncs when a network returns.",
    todo: "Switch Wi-Fi off and reload to prove it.",
  },
];
