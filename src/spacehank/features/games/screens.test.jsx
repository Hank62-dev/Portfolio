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
import BrickBreaker from './BrickBreaker';
import ColourCopy from './ColourCopy';
import DotsBoxes from './DotsBoxes';
import Hanoi from './Hanoi';
import MentalMath from './MentalMath';
import PaperPlane from './PaperPlane';
import PictureLogic from './PictureLogic';
import QuickDraw from './QuickDraw';
import TypeFast from './TypeFast';
import WordGuess from './WordGuess';

// every new game draws its first screen without breaking
describe('the new games open', () => {
  const screens = { 'Gộp số': Game2048, 'Dò mìn': Minesweeper, 'Bốn quân': ConnectFour, 'Cờ lật': Reversi, 'Ghép số': SlidePuzzle, 'Tắt đèn': LightsOut, 'Đập chuột': WhackMole, 'Xếp hình': Tetris,
    'Word guess': WordGuess, 'Copy the colours': ColourCopy, 'Paper plane': PaperPlane, 'Brick breaker': BrickBreaker, 'Quick draw': QuickDraw,
    'Type fast': TypeFast, 'Picture logic': PictureLogic, 'Mental math': MentalMath, 'Dots and boxes': DotsBoxes, 'Tower of Hanoi': Hanoi };
  for (const [name, Screen] of Object.entries(screens)) {
    it(`${name} renders its first screen`, () => {
      const html = renderToStaticMarkup(<Screen />);
      expect(html.length).toBeGreaterThan(200);
    });
  }
});
