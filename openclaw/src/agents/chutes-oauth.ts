type ChutesCredential = {
  access: string;
};

export async function refreshChutesTokens<T extends ChutesCredential>(params: {
  credential: T;
}): Promise<T> {
  return params.credential;
}
