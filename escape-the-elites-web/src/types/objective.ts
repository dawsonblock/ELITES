export type ObjectiveStatus = "locked" | "active" | "completed" | "failed";

export type Objective = {
  id: string;
  title: string;
  description: string;
  status: ObjectiveStatus;
  dependsOn?: string[];
  evidenceGate?: string[];
  locationTrigger?: string;
  terminalTrigger?: string;
  isMain: boolean;
};

export type ObjectiveChain = {
  chainId: string;
  objectives: Objective[];
};
