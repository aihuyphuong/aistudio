import { Field } from '../../components/ui';
import { ELEVENLABS_MODELS } from '../../providers/voice/elevenlabs';
import { useProject } from '../../store/projectStore';
import { useUI } from '../../store/uiStore';
import type { Settings, VoiceProviderId } from '../../types';

export function SettingsDialog() {
  const settings = useProject((s) => s.settings);
  const update = useProject((s) => s.updateSettings);
  const close = () => useUI.getState().setSettingsOpen(false);

  const set = <K extends 'anthropic' | 'elevenlabs' | 'voicestudio'>(key: K, patch: Partial<Settings[K]>) =>
    update((s) => ({ ...s, [key]: { ...s[key], ...patch } }));

  return (
    <div className="modal-backdrop" onClick={close}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="row spread">
          <h2>Cài đặt</h2>
          <button className="ghost" onClick={close}>✕</button>
        </div>
        <p className="muted small">
          Khoá API chỉ lưu trong trình duyệt này (localStorage) và được gửi thẳng tới nhà cung cấp. Không dùng trên máy dùng chung.
        </p>

        <h3>Claude — biên kịch & đạo diễn AI</h3>
        <Field label="Anthropic API key">
          <input type="password" value={settings.anthropic.apiKey} onChange={(e) => set('anthropic', { apiKey: e.target.value })} placeholder="sk-ant-..." />
        </Field>
        <Field label="Model">
          <input value={settings.anthropic.model} onChange={(e) => set('anthropic', { model: e.target.value })} />
        </Field>

        <h3>ElevenLabs</h3>
        <Field label="API key">
          <input type="password" value={settings.elevenlabs.apiKey} onChange={(e) => set('elevenlabs', { apiKey: e.target.value })} />
        </Field>
        <Field label="Model giọng">
          <select value={settings.elevenlabs.modelId} onChange={(e) => set('elevenlabs', { modelId: e.target.value })}>
            {ELEVENLABS_MODELS.map((m) => (
              <option key={m.id} value={m.id}>{m.label}</option>
            ))}
          </select>
        </Field>

        <h3>VoiceStudio (tự host)</h3>
        <Field label="Địa chỉ API" hint="Mặc định đi qua proxy của Vite tới http://127.0.0.1:3900. Có thể nhập URL đầy đủ nếu server bật CORS.">
          <input value={settings.voicestudio.baseUrl} onChange={(e) => set('voicestudio', { baseUrl: e.target.value })} />
        </Field>
        <Field label="Engine (model)" hint="omnivoice, voxcpm2, cosyvoice, kittentts…">
          <input value={settings.voicestudio.model} onChange={(e) => set('voicestudio', { model: e.target.value })} />
        </Field>
        <Field label="API key (tuỳ chọn)">
          <input type="password" value={settings.voicestudio.apiKey} onChange={(e) => set('voicestudio', { apiKey: e.target.value })} />
        </Field>

        <Field label="Engine giọng mặc định cho nhân vật mới">
          <select
            value={settings.defaultVoiceProvider}
            onChange={(e) => update((s) => ({ ...s, defaultVoiceProvider: e.target.value as VoiceProviderId }))}
          >
            <option value="elevenlabs">ElevenLabs</option>
            <option value="voicestudio">VoiceStudio</option>
          </select>
        </Field>
      </div>
    </div>
  );
}
