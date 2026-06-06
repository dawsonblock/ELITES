export type EvidenceType =
  | "document"
  | "photo"
  | "audio"
  | "video"
  | "server_file"
  | "guest_log"
  | "transport_record"
  | "payment_record"
  | "security_feed"
  | "staff_memo"
  | "key_item";

export type EvidenceItem = {
  id: string;
  title: string;
  type: EvidenceType;
  summary: string;
  location: string;
  tags: string[];
  importance: 1 | 2 | 3 | 4 | 5;
  requiredForBestEnding: boolean;
  requiredForSecretEnding?: boolean;
  unlocks: string[];
  corroborates: string[];
  contentFile?: string;
  discovered: boolean;
};

export type EvidenceState = {
  collectedIds: string[];
  viewedIds: string[];
  boardOpen: boolean;
};
