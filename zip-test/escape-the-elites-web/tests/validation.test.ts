import { describe, it, expect } from "vitest";
import evidence from "../src/data/evidence.json";
import objectives from "../src/data/objectives.json";
import terminals from "../src/data/terminals.json";
import scenes from "../src/data/scenes.json";
import endings from "../src/data/endings.json";

describe("Data Graph Validation", () => {
  const evidenceIds = new Set(evidence.map((e: any) => e.id));
  const objectiveIds = new Set(objectives.map((o: any) => o.id));
  const terminalIds = new Set(terminals.map((t: any) => t.id));
  const sceneIds = new Set(scenes.map((s: any) => s.id));
  const doorIds = new Set([
    "main_gate", "maintenance_door", "security_door", "bunker_door", "office_drawer_001"
  ]);
  const cameraIds = new Set(["cam_service_01"]);

  it("every evidence corroborates existing evidence", () => {
    for (const item of evidence as any[]) {
      for (const ref of item.corroborates || []) {
        expect(evidenceIds.has(ref), `Evidence ${item.id} corroborates missing ${ref}`).toBe(true);
      }
    }
  });

  it("every objective evidenceGate references existing evidence", () => {
    for (const obj of objectives as any[]) {
      for (const ref of obj.evidenceGate || []) {
        expect(evidenceIds.has(ref), `Objective ${obj.id} gates on missing evidence ${ref}`).toBe(true);
      }
    }
  });

  it("every objective dependsOn references existing objectives", () => {
    for (const obj of objectives as any[]) {
      for (const ref of obj.dependsOn || []) {
        expect(objectiveIds.has(ref), `Objective ${obj.id} depends on missing ${ref}`).toBe(true);
      }
    }
  });

  it("every terminal command doorId references known doors", () => {
    for (const term of terminals as any[]) {
      for (const cmd of term.commands || []) {
        const doorId = cmd.params?.doorId;
        if (doorId) {
          expect(doorIds.has(doorId), `Terminal ${term.id} references unknown door ${doorId}`).toBe(true);
        }
      }
    }
  });

  it("every terminal command cameraId references known cameras", () => {
    for (const term of terminals as any[]) {
      for (const cmd of term.commands || []) {
        const camId = cmd.params?.cameraId;
        if (camId) {
          expect(cameraIds.has(camId), `Terminal ${term.id} references unknown camera ${camId}`).toBe(true);
        }
      }
    }
  });

  it("every terminal command evidenceId references existing evidence", () => {
    for (const term of terminals as any[]) {
      for (const cmd of term.commands || []) {
        const eid = cmd.params?.evidenceId;
        if (eid) {
          expect(evidenceIds.has(eid), `Terminal ${term.id} references unknown evidence ${eid}`).toBe(true);
        }
        const reqs = cmd.params?.requiresEvidence || [];
        for (const ref of reqs) {
          expect(evidenceIds.has(ref), `Terminal ${term.id} requires unknown evidence ${ref}`).toBe(true);
        }
      }
    }
  });

  it("every scene nextScene references existing scene", () => {
    for (const scene of scenes as any[]) {
      if (scene.nextScene) {
        expect(sceneIds.has(scene.nextScene), `Scene ${scene.id} nextScene ${scene.nextScene} missing`).toBe(true);
      }
    }
  });

  it("every ending requiredEvidence references existing evidence", () => {
    for (const end of endings as any[]) {
      for (const ref of end.conditions?.requiredEvidence || []) {
        expect(evidenceIds.has(ref), `Ending ${end.id} requires unknown evidence ${ref}`).toBe(true);
      }
    }
  });
});

describe("Objective Progression Validation", () => {
  it("has exactly one starting active objective", () => {
    const active = (objectives as any[]).filter((o) => o.status === "active");
    expect(active.length).toBe(1);
    expect(active[0].id).toBe("obj_find_way_inside");
  });

  it("all non-active objectives are locked", () => {
    for (const obj of objectives as any[]) {
      if (obj.status !== "active") {
        expect(obj.status).toBe("locked");
      }
    }
  });

  it("objectives form a single chain with no orphans", () => {
    const ids = new Set(objectives.map((o: any) => o.id));
    const reachable = new Set<string>();
    const queue = ["obj_find_way_inside"];
    while (queue.length) {
      const id = queue.pop()!;
      if (reachable.has(id)) continue;
      reachable.add(id);
      const deps = (objectives as any[]).filter((o) => o.dependsOn?.includes(id));
      for (const d of deps) queue.push(d.id);
    }
    expect(reachable.size).toBe(ids.size);
  });
});
