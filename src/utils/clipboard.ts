export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (e) {
    console.error('Failed to copy to clipboard', e);
    return false;
  }
}
