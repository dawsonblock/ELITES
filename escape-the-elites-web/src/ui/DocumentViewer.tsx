import { useEffect, useState } from "react";
import type { EvidenceItem } from "../types/evidence";

type Props = {
  evidence: EvidenceItem | null;
  open: boolean;
  onClose: () => void;
};

function useTypewriter(text: string, speed = 18) {
  const [display, setDisplay] = useState("");
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!text) { setDisplay(""); setDone(true); return; }
    setDisplay("");
    setDone(false);
    let i = 0;
    const interval = setInterval(() => {
      i++;
      setDisplay(text.slice(0, i));
      if (i >= text.length) {
        clearInterval(interval);
        setDone(true);
      }
    }, speed);
    return () => clearInterval(interval);
  }, [text, speed]);

  return { display, done };
}

const documentContent: Record<string, string> = {
  service_map_001: `MAINTENANCE ROUTE MAP
Classification: Internal Use
Date: [REDACTED]

The service dock connects to the lower mansion corridor via a maintenance passage. This route is not monitored by the primary security system and is used exclusively by staff during off-hours.

Key Access Points:
- Dock Pier (Entry Point A)
- Storage Annex (Checkpoint 1)
- Lower Corridor Junction (Exit Point B)

Note: All service staff must clear the east wing by 22:00.`,

  guest_log_001: `PRIVATE GUEST ARRIVAL LOG
Facility: Island Compound
Period: Q3-Q4

[REDACTED] entries indicate repeated late-night arrivals routed through staff entrances rather than the main dock. Arrival times consistently between 23:30 and 02:00.

Notable Patterns:
- Same vessel registration on 12 separate occasions
- Staff cleared from east wing prior to each arrival
- No passenger manifest filed with harbor authority

[Signature redacted]
[Date redacted]`,

  security_feed_002: `ARCHIVED SECURITY FEED — CAM-04
Timestamp: [REDACTED]
Duration: 4m 12s

Footage shows restricted movement between the mansion upper level and the underground access corridor. Individual is not identifiable due to lighting conditions.

Events:
- 00:00: Subject exits east wing via staff entrance
- 00:34: Subject descends to underground level
- 01:15: Subject returns carrying object (indistinct)
- 02:48: Subject returns to east wing

Note: This footage was flagged for deletion by [REDACTED] but archived prior to purge.`,

  server_archive_001: `ENCRYPTED SERVER ARCHIVE
Node: OFFSHORE-7
Encryption: AES-256

Contents:
1. Transport Manifests (2020-2024)
2. Payment Routing Records
3. Security Feed Archives
4. Communication Logs

Warning: Unauthorized access to this archive is a Category A breach. All access attempts are logged and transmitted to external monitoring.

The archive contains cross-referenced records linking the island facility to [REDACTED] network operations. Distribution of this data outside the facility is punishable under [REDACTED].`,

  access_log_001: `BUNKER ACCESS LOG
Location: Server Level B

Recent Entries:
[REDACTED] — 00:47 — Maintenance
[REDACTED] — 01:12 — Archive Upload
[REDACTED] — 02:30 — Security Override
[REDACTED] — 03:15 — System Backup

Pattern Analysis:
All entries occur between midnight and 04:00. No daytime access recorded in past 90 days.

Access Code: 7391
[This code should not be stored in plain text — compliance violation flagged]`,

  payment_note_001: `PAYMENT LEDGER FRAGMENT
Routing Institution: [REDACTED] Holdings (Cayman)

Transaction Summary:
- Wire transfers to 14 shell companies
- Total volume: [REDACTED] USD
- Frequency: Bi-weekly
- Purpose codes: "Consulting Services"

Offshore routing numbers match patterns identified in previous [REDACTED] investigation. Original ledger remains in secure vault.

[This page was torn from a larger document]`,

  staff_memo_001: `STAFF INSTRUCTION MEMO
To: All Service Personnel
From: Management

Effective immediately:

1. All service staff must exit the east wing by 22:00 daily.
2. Do not discuss guest arrivals with external contacts.
3. Do not photograph or record any guest activity.
4. Maintenance requests after 22:00 require supervisor approval.

Failure to comply will result in immediate termination and contract forfeiture.

[Signature illegible]`,

  transport_manifest_001: `TRANSPORT MANIFEST
Vessel: [REDACTED]
Holding Company: [REDACTED] Maritime Ltd.

Arrival Records:
- 14 confirmed arrivals from offshore holding facility
- 3 unregistered vessel contacts
- 1 emergency medical evacuation (unlogged)

Flight Records:
- Private helicopter: 8 landings (no manifest filed)
- Seaplane: 3 landings (partial manifest)

Note: Holding company shares directors with [REDACTED] network entities.`,

  hidden_archive_001: `REDACTED INTERNAL MEMO
Classification: TOP SECRET
Distribution: NODE DIRECTORS ONLY

The island facility discussed in this memo is identified as NODE-7 within the larger operational network. Other nodes exist and operate independently.

[REDACTED] paragraph regarding coordination between nodes.

[REDACTED] paragraph regarding fallback protocols.

[REDACTED] paragraph regarding external oversight.

The remainder of this document has been redacted under [REDACTED].`,

  camera_note_001: `MAINTENANCE NOTE — CAM-3
Technician: [REDACTED]

"Cam 3 sweep pattern off by 12 degrees. Leave it. Nobody uses that corridor anyway."

Status: Deferred
Priority: Low`,
};

export const DocumentViewer: React.FC<Props> = ({ evidence, open, onClose }) => {
  const content = evidence ? documentContent[evidence.id] || `${evidence.title}\n\n${evidence.summary}` : "";
  const { display, done } = useTypewriter(content, 12);

  if (!open || !evidence) return null;

  return (
    <div className="doc-viewer-overlay" onClick={onClose}>
      <div className="ui-panel doc-viewer-panel" onClick={(e) => e.stopPropagation()}>
        <div className="doc-viewer-header">
          <div>
            <div className="doc-viewer-type">{evidence.type}</div>
            <div className="doc-viewer-title">{evidence.title}</div>
          </div>
          <button className="ui-button secondary doc-viewer-close-btn" onClick={onClose}>Close</button>
        </div>

        <div className="doc-viewer-body">
          {display}
          {!done && <span className="doc-viewer-cursor">|</span>}
        </div>

        {evidence.corroborates.length > 0 && (
          <div className="doc-viewer-corroborates">
            Corroborates: {evidence.corroborates.join(", ")}
          </div>
        )}

        <div className="doc-viewer-tags">
          {evidence.tags.map((t) => (
            <span key={t} className="doc-viewer-tag">{t}</span>
          ))}
        </div>
      </div>
    </div>
  );
};
