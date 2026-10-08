# AI Studio — Xưởng phim AI

Phần mềm dựng video bằng AI theo đúng quy trình của một nhà sản xuất phim:
từ ý tưởng → cốt truyện → casting → kịch bản → phân cảnh → dàn dựng 3D →
lồng tiếng → quay bằng AI → dựng phim → xuất bản.

```bash
npm install
npm run dev        # http://localhost:5173
```

Mở **⚙️ Cài đặt & API key** để nhập khoá Anthropic (biên kịch AI) và ElevenLabs (lồng tiếng).
Ứng dụng mở sẵn một dự án mẫu ngắn (“Ngọn hải đăng cuối cùng”) để thử ngay toàn bộ quy trình.

## Quy trình 10 bước

| # | Bước | Làm gì | Công nghệ |
|---|------|--------|-----------|
| 1 | Phát triển | Logline, thể loại, giọng điệu, thời lượng, khung hình. **AI dựng dàn ý**: synopsis, nhân vật, bối cảnh, cảnh + thoại, đồ thị truyện | Claude (structured output) |
| 2 | Cốt truyện | Đồ thị liên kết truyện: nút Cảnh / Nhịp truyện / Rẽ nhánh / Kết thúc, nhãn cho từng liên kết. Đồ thị quyết định thứ tự cảnh ở các bước sau | [React Flow](https://reactflow.dev/) |
| 3 | Casting | Nhân vật (màu, tính cách, *visual prompt* nhất quán), chọn giọng; bối cảnh | |
| 4 | Kịch bản | Thoại + chỉ dẫn cảm xúc theo định dạng kịch bản, ước lượng thời lượng | |
| 5 | Phân cảnh | Shot list: cỡ cảnh (EWS…ECU, OTS, POV), chuyển động máy, thời lượng, thoại trong shot, prompt. **AI chia shot** | Claude |
| 6 | Dàn dựng 3D | Kéo thả nhân vật, máy quay và điểm ngắm; chỉnh tiêu cự (mm); nhìn qua ống kính; chụp khung hình previz | three.js, react-three-fiber, drei |
| 7 | Lồng tiếng | Tạo giọng từng câu / hàng loạt, nghe lại | ElevenLabs, VoiceStudio |
| 8 | Quay (AI) | Prompt sản xuất đầy đủ cho mỗi shot (nhân vật + bối cảnh + thông số máy), ảnh previz làm tham chiếu; tải keyframe/clip | |
| 9 | Dựng phim | Timeline V1/A1 và trình phát animatic có phụ đề: clip → keyframe → previz | |
| 10 | Xuất bản | Kịch bản `.fountain`, shot list `.csv`, lưu/mở dự án `.json` | |

## Kiến trúc

```
src/
  types.ts                 Mô hình dữ liệu dự án (scene, shot, camera rig, blocking…)
  store/projectStore.ts    Zustand + persist (localStorage) — mọi thao tác trên dự án
  lib/assets.ts            Audio/ảnh/video lưu trong IndexedDB, dự án chỉ giữ id
  lib/storyOrder.ts        Suy ra thứ tự cảnh từ đồ thị React Flow
  lib/timeline.ts          Dựng timeline từ shot + thời lượng audio thật
  lib/prompt.ts            Ghép prompt sản xuất cho model video
  providers/
    llm/claude.ts          Biên kịch & đạo diễn AI (dàn ý, chia shot)
    voice/                 Engine giọng nói dạng plugin
      types.ts             interface VoiceProvider
      elevenlabs.ts
      voicestudio.ts
      registry.ts
  features/<bước>/         Giao diện từng bước sản xuất
```

### Thêm engine giọng nói

Mỗi engine là một `VoiceProvider` (`listVoices`, `synthesize`) đăng ký trong
`providers/voice/registry.ts`. Giao diện Casting/Lồng tiếng tự nhận engine mới.

**VoiceStudio** ([debpalash/VoiceStudio](https://github.com/debpalash/VoiceStudio)) đã được
cắm sẵn qua API tương thích OpenAI của nó (`GET /v1/audio/voices`, `POST /v1/audio/speech`, cổng 3900).
Chạy VoiceStudio trên máy, rồi chọn “VoiceStudio (cục bộ)” cho nhân vật. Vite proxy `/voicestudio` →
`http://127.0.0.1:3900` để tránh CORS; đổi đích bằng `VOICESTUDIO_URL=http://host:port npm run dev`.

### Bảo mật

Đây là ứng dụng chạy cục bộ: API key lưu trong `localStorage` và trình duyệt gọi thẳng
Anthropic / ElevenLabs. Trước khi triển khai cho nhiều người dùng, chuyển các lời gọi trong
`providers/` ra một backend giữ khoá.

## Lộ trình

- Plugin sinh video/ảnh (Veo, Kling, Runway, ComfyUI với Wan 2.x / LTX-Video / HunyuanVideo), dùng ảnh previz làm khung tham chiếu image-to-video
- Render phim hoàn chỉnh (FFmpeg/Remotion) từ timeline: ghép clip, audio, phụ đề, nhạc nền
- Nhân vật 3D có tư thế (pose) và bối cảnh 3D đơn giản trong previz; keyframe chuyển động máy
- Nhạc nền & hiệu ứng âm thanh; lip-sync
- Đóng gói dự án kèm asset (zip)

## Dự án mã nguồn mở tham khảo

- [React Flow](https://github.com/xyflow/xyflow) — đồ thị câu chuyện
- [react-three-fiber](https://github.com/pmndrs/react-three-fiber) / [drei](https://github.com/pmndrs/drei) — không gian 3D previz
- [VoiceStudio](https://github.com/debpalash/VoiceStudio) — clone/thiết kế giọng nói tự host
- [Remotion](https://github.com/remotion-dev/remotion) — dựng & render video bằng React (hướng cho bước render)
- [ComfyUI](https://github.com/comfyanonymous/ComfyUI) — chạy model sinh ảnh/video cục bộ
- [MoneyPrinterTurbo](https://github.com/harry0703/MoneyPrinterTurbo) — pipeline video ngắn tự động (kịch bản → giọng → ghép video)
- [Fountain](https://fountain.io/) — định dạng kịch bản văn bản thuần
