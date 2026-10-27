export interface JourneyStep {
  when: string;
  title: string;
  org: string;
  body: string;
  points?: string[];
  stack?: string[];
}
