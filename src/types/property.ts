import { Property, PropertyFAQ } from './db';

export interface PropertyWithFAQs extends Property {
  faqs: PropertyFAQ[];
}

export interface PropertyImport {
  name: string;
  location: string;
  unit_types: string;
  base_price: number;
  amenities: string;
  highlights: string;
  availability: string;
}
