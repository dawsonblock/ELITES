export type TerminalMode =
  | "file_browser"
  | "security_controls"
  | "door_controls"
  | "download_archive"
  | "broadcast_router"
  | "power_routing";

export type TerminalCommand = {
  id: string;
  label: string;
  action: string;
  params?: Record<string, unknown>;
  requiresEvidence?: string[];
};

export type TerminalDefinition = {
  id: string;
  name: string;
  modes: TerminalMode[];
  commands: TerminalCommand[];
  locked: boolean;
  unlockCode?: string;
  evidenceFiles?: string[];
};
