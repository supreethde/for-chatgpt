export const FAQ_ITEMS = [
  {
    q: 'Who is The Soil Theory for?',
    a: 'We supply fruits and vegetables to fine-dine restaurants, hotels & resorts, cafes & bakeries, caterers & event organisers, retail shops, and cloud kitchens across Bengaluru and Karnataka.',
  },
  {
    q: 'What produce formats do you offer?',
    a: 'Five formats to match different kitchen needs and budgets: certified organic, organically grown, pesticide-free/hydroponic, microgreens & specialty, and imported exotics — each with different pricing and certification levels.',
  },
  {
    q: 'How do you guarantee produce is chemical- and pesticide-free?',
    a: 'We conduct pesticide-residue lab testing every week across organophosphates, carbamates, and pyrethroids. If a batch fails, it never ships. We share the residue test report with our partners, because trust should be visible, not just claimed.',
  },
  {
    q: 'What time is produce delivered?',
    a: 'Standard kitchen delivery is before 6 AM daily, timed so your team can prep with fresh produce from the moment service starts. Orders placed by around midday are harvested, quality-checked, and delivered the same overnight cycle.',
  },
  {
    q: 'How is pricing structured?',
    a: 'Pricing depends on the produce format and your volume — for example, certified organic runs roughly ₹60–70/kg, while pesticide-free ranges around ₹45–50/kg. Use our produce cost calculator on the homepage for an estimate, or request a sample invoice tailored to your actual menu.',
  },
  {
    q: "What if I'm not happy with a delivery?",
    a: 'Our QA policy is simple: if a vegetable disappoints you, we replace it — free, no forms required. Just let us know.',
  },
  {
    q: 'Do you supply fruits and vegetables suppliers for restaurants outside Bengaluru?',
    a: 'Right now we focus on restaurants, hotels, and food businesses within Bengaluru and surrounding parts of Karnataka, where our farm network and delivery timelines are strongest.',
  },
  {
    q: 'How do I get started?',
    a: "Reach out via phone (+91 98805 85292), email (hello@soiltheory.in), or WhatsApp — tell us a bit about your kitchen and expected volumes, and we'll put together a sample invoice.",
  },
] as const;

export function createFaqSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: FAQ_ITEMS.map((item) => ({
      '@type': 'Question',
      name: item.q,
      acceptedAnswer: {
        '@type': 'Answer',
        text: item.a,
      },
    })),
  };
}
