export interface Section {
  heading: string;
  bullets: string[];
}

export interface Document {
  title: string;
  sections: Section[];
}

export interface Config {
  tools: string[];
}
