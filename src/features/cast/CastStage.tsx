import { Empty, Field, StageHeader } from '../../components/ui';
import { useProject } from '../../store/projectStore';
import { VoicePicker } from '../voice/VoicePicker';

export function CastStage() {
  const { characters, locations } = useProject((s) => s.project);
  const { addCharacter, updateCharacter, removeCharacter, addLocation, updateLocation, removeLocation } = useProject.getState();

  return (
    <div className="stage">
      <StageHeader
        step={3}
        title="Casting & bối cảnh"
        subtitle="Mô tả ngoại hình nhất quán (visual prompt) để AI giữ đúng nhân vật qua mọi shot, và chọn giọng cho từng vai."
      />
      <section>
        <div className="row spread">
          <h2>Nhân vật</h2>
          <button onClick={addCharacter}>+ Nhân vật</button>
        </div>
        {characters.length === 0 && <Empty>Chưa có nhân vật.</Empty>}
        <div className="cards">
          {characters.map((c) => (
            <div className="card" key={c.id} style={{ borderTop: `3px solid ${c.color}` }}>
              <div className="row">
                <input type="color" value={c.color} onChange={(e) => updateCharacter(c.id, { color: e.target.value })} />
                <input className="grow strong" value={c.name} onChange={(e) => updateCharacter(c.id, { name: e.target.value })} />
                <button className="ghost danger" onClick={() => confirm(`Xoá ${c.name}?`) && removeCharacter(c.id)}>✕</button>
              </div>
              <Field label="Vai trò">
                <input value={c.role} onChange={(e) => updateCharacter(c.id, { role: e.target.value })} />
              </Field>
              <Field label="Tính cách / động cơ">
                <textarea rows={2} value={c.description} onChange={(e) => updateCharacter(c.id, { description: e.target.value })} />
              </Field>
              <Field label="Visual prompt (tiếng Anh)">
                <textarea rows={3} value={c.visualPrompt} onChange={(e) => updateCharacter(c.id, { visualPrompt: e.target.value })} />
              </Field>
              <Field label="Giọng">
                <VoicePicker value={c.voice} onChange={(voice) => updateCharacter(c.id, { voice })} />
              </Field>
            </div>
          ))}
        </div>
      </section>

      <section>
        <div className="row spread">
          <h2>Bối cảnh</h2>
          <button onClick={addLocation}>+ Bối cảnh</button>
        </div>
        {locations.length === 0 && <Empty>Chưa có bối cảnh.</Empty>}
        <div className="cards">
          {locations.map((l) => (
            <div className="card" key={l.id}>
              <div className="row">
                <input className="grow strong" value={l.name} onChange={(e) => updateLocation(l.id, { name: e.target.value })} />
                <button className="ghost danger" onClick={() => confirm(`Xoá ${l.name}?`) && removeLocation(l.id)}>✕</button>
              </div>
              <Field label="Mô tả">
                <textarea rows={2} value={l.description} onChange={(e) => updateLocation(l.id, { description: e.target.value })} />
              </Field>
              <Field label="Visual prompt (tiếng Anh)">
                <textarea rows={3} value={l.visualPrompt} onChange={(e) => updateLocation(l.id, { visualPrompt: e.target.value })} />
              </Field>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
