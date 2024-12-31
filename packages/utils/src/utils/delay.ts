export async function delay (ms: number): Promise<unknown> {
  return await new Promise(resolve => setTimeout(resolve, ms))
}
