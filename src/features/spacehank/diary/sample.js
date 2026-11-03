import { createNote } from '../notes/library';
import { dayKey, textToHtml } from '../notes/notes';
import { composeText, shiftDay } from './model';
import { addPhotoBlob } from './photos';

// A month of made-up diary pages for the demo, with a few landscape postcards, so the journey has somewhere to walk the first time.
// `ago` is how many days back; the days not listed are the ones left blank. Today is left empty on purpose, to be written.

export const SAMPLE_PAGES = [
  { ago: 1, mood: 4, photo: 0, text: 'Chiều nay đi uống trà đào với nhóm bạn, ngồi nói chuyện đến tận lúc đèn đường sáng. Cười đau cả bụng. Mình nhận ra những buổi chiều bình thường thế này mới là thứ mình sẽ nhớ.' },
  { ago: 2, mood: 5, text: 'Xong bài thuyết trình rồi! Tim đập nhanh lắm nhưng mọi người vỗ tay. Mình tự thưởng một ly kem dâu.' },
  { ago: 3, mood: 3, text: 'Một ngày bình thường. Học bài, nấu cơm, nghe nhạc. Không có gì đặc biệt, và hôm nay như vậy cũng ổn.' },
  { ago: 5, mood: 2, text: 'Hôm nay hơi mệt và hơi buồn, không rõ vì sao. Mình đi ngủ sớm. Ngày mai sẽ nhẹ hơn.' },
  { ago: 6, mood: 4, text: 'Mẹ gọi điện hỏi mình ăn cơm chưa. Chỉ vậy thôi mà thấy ấm cả ngày.' },
  { ago: 7, mood: 5, photo: 1, text: 'Cuối tuần đi chợ hoa với em gái. Mua một chậu cúc họa mi nhỏ xíu đặt cạnh cửa sổ. Phòng thơm hẳn lên.' },
  { ago: 8, mood: 4, text: 'Học được cách làm trứng cuộn từ video. Hơi cháy nhưng vẫn ngon!' },
  { ago: 10, mood: 3, text: 'Ngồi code cả ngày, cuối cùng cũng sửa được lỗi khó chịu. Cảm giác nhẹ cả người.' },
  { ago: 13, mood: 4, text: 'Trời mưa nhẹ, mình ngồi bên cửa sổ đọc sách với tách trà nóng.' },
  { ago: 14, mood: 5, photo: 2, text: 'Hai tuần rồi mình viết nhật ký. Hôm nay đi dạo bờ sông lúc hoàng hôn, trời hồng như kẹo bông. Chụp một tấm để nhớ.' },
  { ago: 15, mood: 3, text: 'Dọn lại góc học tập. Gọn gàng rồi, đầu óc cũng thấy sáng hơn.' },
  { ago: 18, mood: 2, text: 'Có chút áp lực chuyện thi cử. Mình viết ra cho nhẹ lòng, rồi lập kế hoạch từng bước nhỏ.' },
  { ago: 21, mood: 4, text: 'Gặp lại bạn cũ sau cả năm. Hai đứa kể chuyện không dứt.' },
  { ago: 29, mood: 3, text: 'Ngày thứ hai của hành trình. Chưa biết viết gì nhiều, nhưng mình thích cảm giác có một chỗ để kể.' },
  { ago: 30, mood: 4, text: 'Hôm nay mình bắt đầu viết nhật ký. Mong rằng một tháng nữa đọc lại, mình sẽ mỉm cười.' },
];

const SKIES = [
  ['#c7d9e4', '#7fa3b8', '#35566a'],
  ['#f2d3a3', '#c99366', '#3a4a5c'],
  ['#b9c9d6', '#8ea6b4', '#41525f'],
];

/** Three small postcards drawn on a canvas: a soft sky, a sun, hills. */
export const drawPostcards = async () =>
  Promise.all(
    SKIES.map((colors, k) => {
      const canvas = document.createElement('canvas');
      canvas.width = 640;
      canvas.height = 480;
      const g = canvas.getContext('2d');
      const sky = g.createLinearGradient(0, 0, 0, 480);
      sky.addColorStop(0, colors[0]);
      sky.addColorStop(0.6, colors[1]);
      sky.addColorStop(1, colors[2]);
      g.fillStyle = sky;
      g.fillRect(0, 0, 640, 480);
      g.fillStyle = 'rgba(255,238,205,0.92)';
      g.beginPath();
      g.arc(150 + k * 170, 150 + (k % 2) * 30, 56, 0, Math.PI * 2);
      g.fill();
      for (const [y, fill] of [[330, 'rgba(24,48,64,0.35)'], [380, 'rgba(18,38,52,0.55)'], [430, 'rgba(12,26,38,0.8)']]) {
        g.fillStyle = fill;
        g.beginPath();
        g.moveTo(0, 480);
        g.lineTo(0, y);
        g.bezierCurveTo(160, y - 70 + k * 12, 320, y + 50, 640, y - 30);
        g.lineTo(640, 480);
        g.fill();
      }
      return new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.85));
    })
  );

/** Writes the sample pages (and their postcards) into the notes and photos stores. */
export const seedDiary = async (now = new Date()) => {
  const today = dayKey(now);
  let ids = [];
  try {
    for (const blob of await drawPostcards()) ids.push(await addPhotoBlob(blob));
  } catch {
    ids = []; // the postcards are a nicety; the pages are the point
  }
  for (const { ago, mood, text, photo } of SAMPLE_PAGES) {
    const day = shiftDay(today, -ago);
    const full = composeText(day, text);
    await createNote(full, { day, html: textToHtml(full), mood, photos: photo !== undefined && ids[photo] ? [ids[photo]] : [], sample: true });
  }
};
