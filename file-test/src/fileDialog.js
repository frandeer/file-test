import { open } from '@tauri-apps/plugin-dialog';

export async function openFileDialog() {
  const selected = await open({ multiple: false });
  return selected;
}