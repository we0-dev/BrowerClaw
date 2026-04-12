export async function callGatewayTool(
  _name: string,
  _args?: unknown,
  _options?: unknown,
): Promise<unknown> {
  throw new Error("Gateway tools are unavailable in the mini build.");
}
