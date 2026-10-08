import { useEffect, useState } from 'react';
import { errorMessage } from '../../components/ui';
import { voiceProviders, type Voice } from '../../providers/voice/registry';
import { useProject } from '../../store/projectStore';
import type { VoiceAssignment, VoiceProviderId } from '../../types';

// Cache danh sách giọng theo engine trong phiên làm việc
const cache = new Map<VoiceProviderId, Voice[]>();

export function VoicePicker({ value, onChange }: { value: VoiceAssignment | null; onChange: (v: VoiceAssignment | null) => void }) {
  const settings = useProject((s) => s.settings);
  const providerId = value?.providerId ?? settings.defaultVoiceProvider;
  const provider = voiceProviders[providerId];
  const [voices, setVoices] = useState<Voice[]>(cache.get(providerId) ?? []);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => setVoices(cache.get(providerId) ?? []), [providerId]);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const list = await provider.listVoices(settings);
      cache.set(providerId, list);
      setVoices(list);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setLoading(false);
    }
  };

  const preview = voices.find((v) => v.id === value?.voiceId)?.previewUrl;

  return (
    <div className="voice-picker">
      <div className="row">
        <select
          value={providerId}
          onChange={(e) => onChange({ providerId: e.target.value as VoiceProviderId, voiceId: '', voiceName: '' })}
        >
          {Object.values(voiceProviders).map((p) => (
            <option key={p.id} value={p.id}>{p.label}</option>
          ))}
        </select>
        {voices.length > 0 ? (
          <select
            value={value?.voiceId ?? ''}
            onChange={(e) => {
              const v = voices.find((x) => x.id === e.target.value);
              onChange(v ? { providerId, voiceId: v.id, voiceName: v.name } : null);
            }}
          >
            <option value="">— chọn giọng —</option>
            {voices.map((v) => (
              <option key={v.id} value={v.id} title={v.description}>{v.name}</option>
            ))}
          </select>
        ) : (
          <input
            placeholder="voice id"
            value={value?.voiceId ?? ''}
            onChange={(e) => onChange({ providerId, voiceId: e.target.value, voiceName: e.target.value })}
          />
        )}
        <button className="ghost" onClick={load} disabled={loading || !provider.isConfigured(settings)} title="Tải danh sách giọng từ engine">
          {loading ? '…' : '↻'}
        </button>
        {preview && (
          <button className="ghost" onClick={() => new Audio(preview).play()} title="Nghe mẫu">▶</button>
        )}
      </div>
      {!provider.isConfigured(settings) && <span className="field-hint">Cấu hình {provider.label} trong Cài đặt để tải danh sách giọng.</span>}
      {error && <span className="error small">{error}</span>}
    </div>
  );
}
