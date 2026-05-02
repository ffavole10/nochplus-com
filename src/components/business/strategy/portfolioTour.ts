import { driver } from "driver.js";
import "driver.js/dist/driver.css";

const portfolioSteps = [
  {
    element: "[data-tour='portfolio-header']",
    popover: {
      title: "Welcome to Account Strategy",
      description:
        "This is where every account in NOCH+ gets a strategic plan. Pipeline tracks deals. Strategy tracks how we win, expand, and deepen each account.",
    },
  },
  {
    element: "[data-tour='portfolio-metrics']",
    popover: {
      title: "These are your portfolio metrics.",
      description:
        "Connectors Under Management is the unit of growth. Watch this number go up as accounts adopt NOCH+.",
    },
  },
  {
    element: "[data-tour='needs-review-card']",
    popover: {
      title: "Start here every Monday.",
      description:
        "Strategies that need attention show up here. Click the card to filter the list to just those.",
    },
  },
  {
    element: "[data-tour='portfolio-filters']",
    popover: {
      title: "Filter by what matters.",
      description:
        "Show only Strategic Partners. Show only at-risk strategies. Sort by health to find the ones that need work.",
    },
  },
  {
    element: "[data-tour='portfolio-cards']",
    popover: {
      title: "Every card is a full strategy.",
      description:
        "Click any card to open the full Strategy page for that account. That's where the real work happens.",
    },
  },
];

export function runPortfolioTour(onClose?: () => void) {
  const d = driver({
    showProgress: true,
    allowClose: true,
    steps: portfolioSteps,
    onDestroyStarted: () => {
      onClose?.();
      d.destroy();
    },
  });
  d.drive();
}
