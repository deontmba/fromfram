export type FeatureIcon = "leaf" | "chef" | "clock" | "truck" | "heart" | "award";

export type Feature = {
  title: string;
  description: string;
  icon: FeatureIcon;
};

export type Step = {
  number: string;
  title: string;
  description: string;
  tone: string;
};

export type Testimonial = {
  name: string;
  role: string;
  quote: string;
  initial: string;
  tilt: string;
};

export type PricingPlan = {
  name: string;
  price: string;
  period: string;
  description: string;
  benefits: string[];
  popular?: boolean;
};

export type FaqItem = {
  question: string;
  answer: string;
};

export type FooterGroup = {
  title: string;
  links: string[];
};