/**
 * Bridges the saved audio settings to the audio engine. Pure apart from the
 * engine call. Boot and GameScene call `applyAudioSettings(store.getSettings())`;
 * the settings screen applies a mute flip through `applySettingsAction`.
 *
 * Owner: ui-engineer.
 */
import { audio } from '../audio';
import type { AudioEngine } from '../audio';
import type { SaveStore, Settings } from '../save';

/** The one engine method used here, so tests pass a stub. */
export type AudioSink = Pick<AudioEngine, 'applySettings'>;

/** Push the saved music volume, SFX volume and mute flag into the engine. */
export function applyAudioSettings(settings: Settings, engine: AudioSink = audio): void {
  engine.applySettings({ musicVolume: settings.musicVolume, sfxVolume: settings.sfxVolume, muted: settings.muted });
}

/** Change a saved audio setting and apply the result. Returns the settings after the change. */
export function updateAudioSetting(
  store: SaveStore,
  patch: Partial<Pick<Settings, 'musicVolume' | 'sfxVolume' | 'muted'>>,
  engine: AudioSink = audio,
): Settings {
  const settings = store.updateSettings(patch);
  applyAudioSettings(settings, engine);
  return settings;
}

/** Flip mute (for an `M` hotkey or the settings toggle). Returns the new value. */
export function toggleMuted(store: SaveStore, engine: AudioSink = audio): boolean {
  return updateAudioSetting(store, { muted: !store.getSettings().muted }, engine).muted;
}
