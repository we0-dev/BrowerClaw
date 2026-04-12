export type NodeInfo = {
  nodeId: string;
  platform?: string;
  commands?: string[];
};

export async function listNodes(_params: unknown): Promise<NodeInfo[]> {
  return [];
}

export function resolveNodeIdFromList(
  nodes: NodeInfo[],
  preferred?: string,
  allowSingle = false,
): string {
  if (preferred) {
    const match = nodes.find((entry) => entry.nodeId === preferred);
    if (match) return match.nodeId;
  }
  if (allowSingle && nodes.length === 1) {
    return nodes[0]!.nodeId;
  }
  throw new Error("node required");
}
