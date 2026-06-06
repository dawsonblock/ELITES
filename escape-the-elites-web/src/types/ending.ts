export type EndingType = "bad" | "partial" | "best" | "secret";

export type EndingDefinition = {
  id: EndingType;
  title: string;
  description: string;
  explanation: string;
  conditions: {
    broadcastComplete: boolean;
    requiredEvidencePercent: number;
    needsServerArchive: boolean;
    needsSecurityFeed: boolean;
    needsGuestLog: boolean;
    needsHiddenArchive?: boolean;
    needsAllCorroboration?: boolean;
  };
  newsSegments: string[];
};

export type EndingScore = {
  requiredEvidencePercent: number;
  optionalEvidencePercent: number;
  corroborationPercent: number;
  stealthBonus: number;
  total: number;
};
