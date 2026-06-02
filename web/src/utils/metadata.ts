export interface MetadataOption {
  value: string;
  label: string;
  description: string;
  emoji: string;
}

export interface MetadataCategory {
  value: string;
  label: string;
  emoji: string;
  options: MetadataOption[];
}

export const WATER_BODY_TYPES: MetadataCategory[] = [
  {
    value: 'natural',
    label: 'Natural',
    emoji: '🌿',
    options: [
      { value: 'flowing', label: 'Flowing Water', description: 'Rivers, streams, tidal creeks with continuous flow', emoji: '🏞️' },
      { value: 'standing', label: 'Standing Water', description: 'Lakes, ponds, reservoirs with still water', emoji: '🌅' },
      { value: 'estuary', label: 'Estuary / Brackish', description: 'Mix of fresh and salt water, tidal influence', emoji: '🏝️' },
      { value: 'wetland', label: 'Wetland / Swamp', description: 'Saturated soil, marsh, peatland, mangrove swamp', emoji: '🌲' },
    ],
  },
  {
    value: 'artificial',
    label: 'Artificial / Managed',
    emoji: '🏗️',
    options: [
      { value: 'agricultural_ditch', label: 'Agricultural Ditch', description: 'Irrigation canals, drainage channels for farming', emoji: '🌾' },
      { value: 'urban_drain', label: 'Urban Drain / Canal', description: 'City runoff, stormwater, flood control canals', emoji: '🏙️' },
      { value: 'industrial', label: 'Industrial / Cooling Pond', description: 'Factory effluent ponds, treatment lagoons, cooling water', emoji: '🏭' },
      { value: 'aquaculture', label: 'Aquaculture Pond', description: 'Fish or shrimp farming ponds', emoji: '🐟' },
    ],
  },
  {
    value: 'coastal',
    label: 'Coastal / Marine',
    emoji: '🌊',
    options: [
      { value: 'coastal_marine', label: 'Coastal / Marine', description: 'Open sea, beach, coral reef, offshore waters', emoji: '🌊' },
    ],
  },
];

export const LAND_USE_TYPES: MetadataCategory[] = [
  {
    value: 'natural',
    label: 'Natural / Conservation',
    emoji: '🌲',
    options: [
      { value: 'pristine_forest', label: 'Pristine Forest', description: 'Undisturbed primary forest, jungle, wilderness', emoji: '🌳' },
      { value: 'mangrove_forest', label: 'Mangrove Forest', description: 'Coastal mangrove ecosystem', emoji: '🌴' },
      { value: 'wetland', label: 'Wetland / Marsh', description: 'Natural wetland, peatland, bog', emoji: '🌿' },
      { value: 'coastal_beach', label: 'Coastal / Beach', description: 'Sandy shore, dune, rocky coast', emoji: '🏖️' },
    ],
  },
  {
    value: 'agricultural',
    label: 'Agricultural',
    emoji: '🌾',
    options: [
      { value: 'rice_paddy', label: 'Rice Paddy', description: 'Flooded rice field, sawah', emoji: '🌾' },
      { value: 'plantation', label: 'Plantation', description: 'Palm oil, rubber, tea, sugar cane, large-scale mono-crop', emoji: '🌱' },
      { value: 'mixed_farming', label: 'Mixed Farming', description: 'Vegetables, fruit orchards, small-scale diverse crops', emoji: '🧑‍🌾' },
      { value: 'livestock_aquaculture', label: 'Livestock / Aquaculture', description: 'Cattle, poultry, fish or shrimp ponds', emoji: '🐄' },
    ],
  },
  {
    value: 'urban',
    label: 'Urban / Built-Up',
    emoji: '🏙️',
    options: [
      { value: 'dense_urban', label: 'Dense Urban', description: 'City center, commercial district, markets, offices', emoji: '🏢' },
      { value: 'residential', label: 'Residential / Suburban', description: 'Housing, apartments, residential estates', emoji: '🏠' },
      { value: 'industrial', label: 'Industrial Zone', description: 'Manufacturing plants, warehouses, factory complexes', emoji: '🏭' },
      { value: 'transport', label: 'Transport / Infrastructure', description: 'Roads, ports, airports, railways', emoji: '🚢' },
    ],
  },
  {
    value: 'degraded',
    label: 'Degraded / Special',
    emoji: '⚠️',
    options: [
      { value: 'mining', label: 'Mining / Extraction', description: 'Coal, sand, gravel, oil and gas extraction sites', emoji: '⛏️' },
      { value: 'landfill', label: 'Landfill / Waste Dump', description: 'Garbage site, illegal dumping, waste disposal', emoji: '🗑️' },
      { value: 'construction', label: 'Construction / Bare Soil', description: 'Active development, cleared land, construction sites', emoji: '🚧' },
    ],
  },
];

export function findWaterBodyType(value: string): MetadataOption | undefined {
  for (const group of WATER_BODY_TYPES) {
    const found = group.options.find((o) => o.value === value);
    if (found) return found;
  }
  return undefined;
}

export function findLandUse(value: string): MetadataOption | undefined {
  for (const group of LAND_USE_TYPES) {
    const found = group.options.find((o) => o.value === value);
    if (found) return found;
  }
  return undefined;
}
