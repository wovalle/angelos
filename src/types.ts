export type Host = {
  id: string;
  name: string;
};

export interface HostChange {
  type: "add" | "remove";
  host: Host;
}

type SubscribeCallback = (changes: HostChange[]) => void;

export interface Provider {
  getName(): string;
  setup(): Promise<void>;
  getHosts(): Promise<Host[]>;
  subscribe(cb: SubscribeCallback): void;
}

export type Target = {
  getName(): string;
  setup: () => Promise<void>;
  getHosts: () => Promise<Host[]>;
  apply: (changes: HostChange[]) => Promise<void>;
};
