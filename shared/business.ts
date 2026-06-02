export type ServiceTier = "standard" | "skilled" | "premium" | "custom";

export type ServiceOption = {
  id: string;
  name: string;
  icon: string;
  description: string;
  tier: ServiceTier;
  rateLabel: string;
  amountCents: number | null;
};

export type ServiceCategory = {
  label: string;
  services: ServiceOption[];
};

export type SubscriberPlan = {
  id: string;
  name: string;
  priceLabel: string;
  amountCents: number;
  interval: "week" | "month";
  savings: string;
  description: string;
};

export const standardRateCents = 4500;
export const skilledRateCents = 5000;
export const premiumRateCents = 5500;

export const serviceCategories: ServiceCategory[] = [
  {
    label: "Home & Property",
    services: [
      {
        id: "home-cleaning",
        name: "Home Cleaning",
        icon: "Clean",
        description: "Deep clean, regular maintenance, or move-in/move-out.",
        tier: "standard",
        rateLabel: "$45/hr",
        amountCents: standardRateCents,
      },
      {
        id: "home-organization",
        name: "Home Organization",
        icon: "Organize",
        description: "Declutter rooms, closets, garage, pantry, or storage.",
        tier: "standard",
        rateLabel: "$45/hr",
        amountCents: standardRateCents,
      },
      {
        id: "yard-work",
        name: "Yard Work",
        icon: "Yard",
        description: "Mowing, trimming, leaf removal, and seasonal cleanup.",
        tier: "standard",
        rateLabel: "$45/hr",
        amountCents: standardRateCents,
      },
      {
        id: "handyman-repairs",
        name: "Handyman Repairs",
        icon: "Repair",
        description: "Minor repairs, assembly, fixtures, and home upkeep.",
        tier: "skilled",
        rateLabel: "$50/hr",
        amountCents: skilledRateCents,
      },
      {
        id: "decorating-staging",
        name: "Decorating & Staging",
        icon: "Style",
        description: "Holiday decorating, room refresh, and home staging.",
        tier: "premium",
        rateLabel: "$55/hr",
        amountCents: premiumRateCents,
      },
    ],
  },
  {
    label: "Family & Kids",
    services: [
      {
        id: "childcare",
        name: "Childcare",
        icon: "Kids",
        description: "Watching kids, school pickups, and activities.",
        tier: "standard",
        rateLabel: "$45/hr",
        amountCents: standardRateCents,
      },
      {
        id: "meal-prep",
        name: "Meal Prep",
        icon: "Meals",
        description: "Weekly meal prep, cooking, and grocery-to-table help.",
        tier: "standard",
        rateLabel: "$45/hr",
        amountCents: standardRateCents,
      },
      {
        id: "pet-care",
        name: "Pet Care",
        icon: "Pets",
        description: "Dog walking, pet sitting, vet runs, and feeding.",
        tier: "standard",
        rateLabel: "$45/hr",
        amountCents: standardRateCents,
      },
      {
        id: "errands",
        name: "Errands",
        icon: "Errands",
        description: "Groceries, pickups, drop-offs, returns, and pharmacy.",
        tier: "standard",
        rateLabel: "$45/hr",
        amountCents: standardRateCents,
      },
    ],
  },
  {
    label: "Life & Growth",
    services: [
      {
        id: "personal-assistant",
        name: "Personal Assistant",
        icon: "Assist",
        description: "Scheduling, research, calls, paperwork, coordination.",
        tier: "skilled",
        rateLabel: "$50/hr",
        amountCents: skilledRateCents,
      },
      {
        id: "life-coaching",
        name: "Life Coaching",
        icon: "Coach",
        description: "Goal setting, accountability, systems, personal growth.",
        tier: "premium",
        rateLabel: "$55/hr",
        amountCents: premiumRateCents,
      },
      {
        id: "other",
        name: "Other",
        icon: "Custom",
        description: "Describe what you need and Grace & Grind will scope it.",
        tier: "custom",
        rateLabel: "Custom",
        amountCents: null,
      },
    ],
  },
];

export const subscriberPlans: SubscriberPlan[] = [
  {
    id: "weekly-care",
    name: "Weekly Care",
    priceLabel: "$180/wk",
    amountCents: 18000,
    interval: "week",
    savings: "10% off",
    description: "Recurring weekly care with the same familiar person.",
  },
  {
    id: "full-life-package",
    name: "Full Life Package",
    priceLabel: "$750/mo",
    amountCents: 75000,
    interval: "month",
    savings: "15% off",
    description: "Full-life support for home, family, errands, and projects.",
  },
];

export function getServiceByName(name: string) {
  return serviceCategories
    .flatMap((category) => category.services)
    .find((service) => service.name === name || service.id === name);
}

export function getSubscriberPlanByName(name: string) {
  return subscriberPlans.find((plan) => plan.name === name || plan.id === name);
}

export function formatDollars(cents: number) {
  return `$${(cents / 100).toFixed(2)}`;
}
