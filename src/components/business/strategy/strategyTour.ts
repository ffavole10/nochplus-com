import { driver } from "driver.js";
import "driver.js/dist/driver.css";

export type TourMode = "full" | "quick";

const fullSteps = [
  {
    element: "[data-tour='strategy-title']",
    popover: {
      title: "This is the Strategy page.",
      description:
        "Every account in NOCH+ has one. It's where we plan how to win the account, not just track deals.",
    },
  },
  {
    element: "[data-tour='north-star']",
    popover: {
      title: "Start with the North Star.",
      description:
        "What's the ONE big thing we want from this account in 12 months? Keep it specific. One sentence. Click to edit anytime.",
    },
  },
  {
    element: "[data-tour='account-types']",
    popover: {
      title: "Tell the system WHY this account matters.",
      description:
        "Revenue? Partnership access? A logo for credibility? Pick one or more. The KPIs below adjust based on what you pick.",
    },
  },
  {
    element: "[data-tour='why-this-account']",
    popover: {
      title: "Explain the strategic reasoning.",
      description:
        "In 2-3 sentences, write why we're investing here vs. another company. Anyone reading this page later should understand the 'why' fast.",
    },
  },
  {
    element: "[data-tour='decision-map']",
    popover: {
      title: "Map the people.",
      description:
        "Champions root for us. Decision Makers sign the contract. Blockers could kill it. Add them from your contacts list.",
    },
  },
  {
    element: "[data-tour='plays']",
    popover: {
      title: "These are your moves.",
      description:
        "Specific actions we're running this quarter. Not 'have a meeting' — actual moves. Each one has an owner and a due date.",
    },
  },
  {
    element: "[data-tour='kpis']",
    popover: {
      title: "These measure if it's working.",
      description:
        "Already set up based on the account type you picked. Edit targets anytime. Some are greyed out — those activate when telemetry comes online later this year.",
    },
  },
  {
    element: "[data-tour='risks']",
    popover: {
      title: "Spot trouble early.",
      description: "Add risks as you find them. Review them in your weekly account review.",
    },
  },
  {
    element: "[data-tour='health-badge']",
    popover: {
      title: "This is your at-a-glance health check.",
      description:
        "The system rolls up KPI progress and play completion automatically. If it's red or amber, something needs attention.",
    },
  },
  {
    element: "[data-tour='wizard-icon']",
    popover: {
      title: "You can come back to this tour anytime.",
      description:
        "Click the wizard icon in the top right to see this tour again. Now go fill in your first strategy.",
    },
  },
];

const quickSteps = [
  {
    element: "[data-tour='north-star']",
    popover: {
      title: "North Star + Account Type",
      description: "Define the 12-month outcome and why this account matters. KPIs adjust to match.",
    },
  },
  {
    element: "[data-tour='plays']",
    popover: {
      title: "Plays + KPIs",
      description: "Plays are your moves this quarter. KPIs measure if they're working.",
    },
  },
  {
    element: "[data-tour='health-badge']",
    popover: {
      title: "Health + Risks",
      description: "Strategy health rolls up automatically. Log risks as you spot them.",
    },
  },
];

export function runStrategyTour(mode: TourMode = "full", onClose?: () => void) {
  const steps = mode === "full" ? fullSteps : quickSteps;
  const d = driver({
    showProgress: true,
    allowClose: true,
    steps,
    onDestroyStarted: () => {
      onClose?.();
      d.destroy();
    },
  });
  d.drive();
}

export function runSectionHelp(target: string, title: string, description: string) {
  const d = driver({
    allowClose: true,
    steps: [{ element: target, popover: { title, description, doneBtnText: "Got it" } }],
  });
  d.drive();
}
