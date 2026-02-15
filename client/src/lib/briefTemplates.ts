// Pre-built brief templates for common advertising scenarios

export interface BriefTemplate {
  id: string;
  name: string;
  category: string;
  description: string;
  brief: string;
  suggestedTone: string;
  suggestedCount: number;
}

export const briefTemplates: BriefTemplate[] = [
  // Product Launch
  {
    id: 'product-launch-tech',
    name: 'Tech Product Launch',
    category: 'Product Launch',
    description: 'Introduce a new technology product to market with impact.',
    brief: 'Launch campaign for a new [product] that [key differentiator]. Target audience: [demographic] who value [benefit]. The product solves [pain point] by [how it works]. Key message: this is the future of [category]. Tone should feel innovative yet accessible. Budget allows for digital, social, and OOH.',
    suggestedTone: 'bold',
    suggestedCount: 5,
  },
  {
    id: 'product-launch-consumer',
    name: 'Consumer Product Launch',
    category: 'Product Launch',
    description: 'Drive trial and awareness for a new consumer packaged good.',
    brief: 'Introduce [product name] to [target market]. It stands apart because [unique selling proposition]. Competitors focus on [competitor approach] but we believe [brand belief]. The campaign should make people feel [desired emotion] and drive first purchase. Channels: social-first with retail POS support.',
    suggestedTone: 'conversational',
    suggestedCount: 5,
  },
  {
    id: 'product-launch-luxury',
    name: 'Luxury Product Debut',
    category: 'Product Launch',
    description: 'Position a premium product with exclusivity and craft.',
    brief: 'Unveil [luxury product] for discerning [audience] who appreciate [craftsmanship/heritage/innovation]. The product represents [brand values] and is priced at [price point]. Campaign must convey exclusivity without elitism. Visual language should reference [aesthetic influence]. Limited availability creates urgency.',
    suggestedTone: 'strategic',
    suggestedCount: 3,
  },

  // Awareness Campaign
  {
    id: 'awareness-social-cause',
    name: 'Social Cause Awareness',
    category: 'Awareness',
    description: 'Raise awareness for a social issue or public health campaign.',
    brief: 'Create awareness around [issue/cause] targeting [primary audience]. Current perception: [what people currently think]. Desired perception: [what we want them to think/feel/do]. The campaign must avoid [common tropes to avoid] and instead [fresh approach]. Success metric: [measurable goal]. The tone must be [empowering/urgent/hopeful] without being preachy.',
    suggestedTone: 'bold',
    suggestedCount: 5,
  },
  {
    id: 'awareness-brand',
    name: 'Brand Awareness Push',
    category: 'Awareness',
    description: 'Increase brand recognition and recall in a competitive market.',
    brief: 'Build awareness for [brand name] in the [industry] space. We are currently #[position] in awareness behind [competitors]. Our brand personality is [personality traits]. Target: [audience] aged [age range] who currently use [competitor/alternative]. The big idea should be ownable and campaign-able across multiple executions. Media mix: [channels].',
    suggestedTone: 'bold',
    suggestedCount: 5,
  },

  // Rebrand
  {
    id: 'rebrand-modernize',
    name: 'Brand Modernization',
    category: 'Rebrand',
    description: 'Refresh a legacy brand for a new generation.',
    brief: 'Modernize [brand name], a [years]-year-old [category] brand. Current perception: [dated/traditional/out-of-touch]. Target new audience: [younger demographic] while retaining [existing loyal base]. Brand heritage worth keeping: [heritage elements]. What must change: [outdated elements]. The rebrand should signal evolution, not revolution. Tagline and visual identity refresh needed.',
    suggestedTone: 'strategic',
    suggestedCount: 5,
  },
  {
    id: 'rebrand-repositioning',
    name: 'Strategic Repositioning',
    category: 'Rebrand',
    description: 'Shift market perception of a brand into a new category or territory.',
    brief: 'Reposition [brand] from [current positioning] to [desired positioning]. The market sees us as [current perception] but we want to own [new territory]. Proof points: [evidence supporting new position]. Competitive set shifts from [old competitors] to [new competitors]. The campaign must bridge existing equity while staking new ground. Key tension to resolve: [brand tension].',
    suggestedTone: 'strategic',
    suggestedCount: 3,
  },

  // Seasonal/Event
  {
    id: 'seasonal-holiday',
    name: 'Holiday Campaign',
    category: 'Seasonal',
    description: 'Seasonal campaign for major holiday period.',
    brief: 'Create a [holiday] campaign for [brand/product]. The brand should feel relevant during [season] without being cliche. Avoid: [tired holiday tropes]. Instead: [fresh approach]. Gift-giving angle: [yes/no]. Emotional territory: [specific emotion beyond "joy"]. Campaign must cut through holiday noise and be memorable. Timeline: [weeks] from launch to [holiday date].',
    suggestedTone: 'conversational',
    suggestedCount: 5,
  },
  {
    id: 'seasonal-summer',
    name: 'Summer Campaign',
    category: 'Seasonal',
    description: 'Energetic warm-weather campaign.',
    brief: 'Summer activation for [brand/product]. Target audience shifts behavior in summer by [behavioral change]. The product/brand fits because [summer relevance]. Campaign should capture the feeling of [specific summer moment/vibe] without being generic. Experiential component: [yes/no]. Social amplification strategy needed. Run dates: [month] to [month].',
    suggestedTone: 'conversational',
    suggestedCount: 3,
  },

  // Digital/Social
  {
    id: 'social-viral',
    name: 'Social-First Viral Play',
    category: 'Digital',
    description: 'Design content engineered for social sharing and cultural relevance.',
    brief: 'Create a social-first campaign for [brand] targeting [platform(s)]. The content must be natively shareable without feeling forced. Cultural moment to tap: [trend/tension/conversation]. Format: [short-form video/static/carousel/interactive]. The hook must work in the first [1-3] seconds. Brand integration should feel organic, not interruptive. Success = [metric: shares/saves/comments/UGC].',
    suggestedTone: 'conversational',
    suggestedCount: 5,
  },
  {
    id: 'digital-performance',
    name: 'Performance Creative',
    category: 'Digital',
    description: 'Direct-response creative optimized for conversion.',
    brief: 'Design conversion-focused creative for [product/service]. Primary CTA: [action]. Target: [audience segment] at [funnel stage]. Key objection to overcome: [objection]. Proof point: [social proof/stat/testimonial]. Formats needed: [ad sizes/formats]. A/B testing priorities: [headline vs image vs CTA]. Landing page destination: [URL/description].',
    suggestedTone: 'simplified',
    suggestedCount: 5,
  },

  // B2B
  {
    id: 'b2b-enterprise',
    name: 'Enterprise B2B Campaign',
    category: 'B2B',
    description: 'Reach decision-makers at large organizations.',
    brief: 'Campaign targeting [C-suite title/role] at [company size/industry] companies. They care about [business priorities]. Our solution: [product/service] which delivers [quantified benefit]. Current buying process: [how they evaluate]. Key competitor: [competitor] whose weakness is [gap we fill]. The creative must be sophisticated enough for boardrooms but human enough to connect. Channels: [LinkedIn/trade/events/ABM].',
    suggestedTone: 'strategic',
    suggestedCount: 3,
  },

  // Non-Profit
  {
    id: 'nonprofit-fundraising',
    name: 'Non-Profit Fundraising',
    category: 'Non-Profit',
    description: 'Drive donations and supporter engagement.',
    brief: 'Fundraising campaign for [organization] working on [mission]. Target donors: [donor profile]. Average gift size: [amount]. The ask must feel urgent because [urgency driver]. Impact story: [specific beneficiary or outcome]. Avoid guilt-based messaging -- instead use [empowerment/hope/agency]. Year-end giving deadline: [date]. Digital-first with direct mail support.',
    suggestedTone: 'conversational',
    suggestedCount: 3,
  },

  // Recruitment
  {
    id: 'employer-brand',
    name: 'Employer Brand Campaign',
    category: 'Recruitment',
    description: 'Attract top talent with compelling employer messaging.',
    brief: 'Recruitment campaign for [company] hiring [roles] in [locations]. We compete for talent against [competing employers]. Our culture differentiator: [what makes working here unique]. Current Glassdoor/perception: [current state]. Target candidates value [what talent wants]. The campaign should make talented people feel [desired emotion] about joining. Channels: LinkedIn, job boards, careers site, employee advocacy.',
    suggestedTone: 'conversational',
    suggestedCount: 3,
  },
];

export const templateCategories = [
  'Product Launch',
  'Awareness',
  'Rebrand',
  'Seasonal',
  'Digital',
  'B2B',
  'Non-Profit',
  'Recruitment',
] as const;
