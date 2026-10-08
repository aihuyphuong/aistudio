import type { Project } from '../types';

/** Dự án mẫu ngắn để thử toàn bộ quy trình ngay khi mở ứng dụng. */
export function sampleProject(): Project {
  const scenes: Project['scenes'] = [
    {
      id: 'scene_storm',
      title: 'Cơn bão',
      summary: 'Mai chèo thuyền qua cơn bão tới ngọn hải đăng đã tắt đèn.',
      locationId: 'loc_sea',
      timeOfDay: 'Đêm',
      lines: [
        { id: 'line_1', characterId: null, text: 'Đêm ấy, ngọn hải đăng cuối cùng của làng đã tắt.', emotion: 'trầm lắng' },
        { id: 'line_2', characterId: 'char_mai', text: 'Ông Tư ơi! Ông có ở đó không?', emotion: 'hốt hoảng, gào to' },
      ],
    },
    {
      id: 'scene_letter',
      title: 'Lá thư',
      summary: 'Ông Tư mở cửa. Mai trao lá thư của cha cô — người đã mất tích trên biển.',
      locationId: 'loc_lighthouse',
      timeOfDay: 'Đêm',
      lines: [
        { id: 'line_3', characterId: 'char_tu', text: 'Biển động thế này, con tới đây làm gì?', emotion: 'gắt nhưng lo lắng' },
        { id: 'line_4', characterId: 'char_mai', text: 'Cha con dặn: nếu đèn tắt, hãy đưa ông lá thư này.', emotion: 'run run' },
        { id: 'line_5', characterId: 'char_tu', text: 'Mười năm rồi… nó vẫn nhớ.', emotion: 'xúc động, thì thầm' },
      ],
    },
    {
      id: 'scene_dawn',
      title: 'Bình minh',
      summary: 'Hai người cùng thắp lại ngọn đèn. Ánh sáng quét qua mặt biển vừa lặng.',
      locationId: 'loc_lighthouse',
      timeOfDay: 'Bình minh',
      lines: [
        { id: 'line_6', characterId: 'char_tu', text: 'Chừng nào còn người chờ, đèn còn phải sáng.', emotion: 'quả quyết, ấm áp' },
      ],
    },
  ];

  return {
    id: 'proj_sample',
    schemaVersion: 1,
    development: {
      title: 'Ngọn hải đăng cuối cùng',
      logline: 'Một cô gái vượt bão để trao lá thư của người cha mất tích cho người gác hải đăng già, và cùng ông thắp lại ánh sáng cho làng chài.',
      synopsis: '',
      genre: 'Chính kịch, phim ngắn',
      tone: 'Ấm áp, u hoài, điện ảnh',
      audience: 'Mọi lứa tuổi',
      language: 'vi',
      targetDuration: 60,
      aspectRatio: '2.39:1',
      narratorVoice: null,
    },
    characters: [
      {
        id: 'char_mai',
        name: 'Mai',
        role: 'Nhân vật chính',
        description: '17 tuổi, con gái làng chài, bướng bỉnh và can đảm.',
        visualPrompt: 'Vietnamese teenage girl, 17, long black hair tied back, yellow raincoat, soaked, determined eyes',
        color: '#f3a712',
        voice: null,
      },
      {
        id: 'char_tu',
        name: 'Ông Tư',
        role: 'Người gác hải đăng',
        description: 'Ngoài 70, cô độc, cộc cằn bên ngoài nhưng giàu tình cảm.',
        visualPrompt: 'elderly Vietnamese man, 70s, white stubble, weathered face, thick wool sweater, oil lantern',
        color: '#669bbc',
        voice: null,
      },
    ],
    locations: [
      {
        id: 'loc_sea',
        name: 'Biển đêm bão',
        description: 'Mặt biển dữ dội, mưa xối xả, ngọn hải đăng đen sẫm phía xa.',
        visualPrompt: 'stormy night sea, huge waves, heavy rain, distant dark lighthouse on rocky cliff, cinematic',
      },
      {
        id: 'loc_lighthouse',
        name: 'Trong hải đăng',
        description: 'Cầu thang xoắn, phòng đèn cũ kỹ, ánh dầu leo lét.',
        visualPrompt: 'interior of old lighthouse, spiral iron staircase, warm oil lamp light, weathered wood, dust',
      },
    ],
    scenes,
    shots: [],
    story: {
      nodes: [
        { id: 'start', type: 'story', position: { x: 0, y: 40 }, data: { kind: 'start', label: 'Mở đầu', text: 'Làng chài chìm trong bóng tối.' } },
        ...scenes.map((s, i) => ({
          id: `node_${s.id}`,
          type: 'story',
          position: { x: 300 * (i + 1), y: i === 1 ? 140 : 0 },
          data: { kind: 'scene' as const, label: s.title, text: s.summary, sceneId: s.id },
        })),
        { id: 'node_end', type: 'story', position: { x: 1200, y: 40 }, data: { kind: 'end', label: 'Kết thúc', text: 'Ánh đèn trở lại.' } },
      ],
      edges: [
        { id: 'e1', source: 'start', target: 'node_scene_storm' },
        { id: 'e2', source: 'node_scene_storm', target: 'node_scene_letter', label: 'tới nơi' },
        { id: 'e3', source: 'node_scene_letter', target: 'node_scene_dawn' },
        { id: 'e4', source: 'node_scene_dawn', target: 'node_end' },
      ],
    },
    updatedAt: Date.now(),
  };
}
