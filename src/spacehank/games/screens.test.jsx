import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import ConnectFour from './ConnectFour';
import Game2048 from './Game2048';
import LightsOut from './LightsOut';
import Minesweeper from './Minesweeper';
import Reversi from './Reversi';
import SlidePuzzle from './SlidePuzzle';
import Tetris from './FallingBlocks';
import WhackMole from './WhackMole';

// every new game draws its first screen without breaking
describe('the new games open', () => {
  const screens = { 'Gộp số': Game2048, 'Dò mìn': Minesweeper, 'Bốn quân': ConnectFour, 'Cờ lật': Reversi, 'Ghép số': SlidePuzzle, 'Tắt đèn': LightsOut, 'Đập chuột': WhackMole, 'Xếp hình': Tetris };
  for (const [name, Screen] of Object.entries(screens)) {
    it(`${name} renders its first screen`, () => {
      const html = renderToStaticMarkup(<Screen />);
      expect(html.length).toBeGreaterThan(200);
    });
  }
});
