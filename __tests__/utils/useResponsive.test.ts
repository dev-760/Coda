import { getSizeClass, bottomBarClearance, TAB_BAR_HEIGHT, MINI_PLAYER_HEIGHT } from '../../src/hooks/useResponsive';

describe('useResponsive helpers', () => {
  describe('getSizeClass', () => {
    it('treats small phones as compact', () => {
      expect(getSizeClass(320)).toBe('compact'); // iPhone SE 1st gen
      expect(getSizeClass(375)).toBe('compact'); // iPhone SE 2/3
      expect(getSizeClass(390)).toBe('compact'); // iPhone 14
      expect(getSizeClass(599)).toBe('compact');
    });

    it('treats large phones in landscape as regular', () => {
      expect(getSizeClass(600)).toBe('regular');
          expect(getSizeClass(736)).toBe('regular'); // large phone landscape, small foldable
          expect(getSizeClass(767)).toBe('regular');
        });

        it('treats any tablet width as large', () => {
          expect(getSizeClass(768)).toBe('large'); // iPad mini portrait
          expect(getSizeClass(834)).toBe('large'); // iPad Air portrait
          expect(getSizeClass(1024)).toBe('large'); // iPad Pro 11"
          expect(getSizeClass(1366)).toBe('large'); // iPad Pro 12.4"
          expect(getSizeClass(840)).toBe('large');
        });

    it('treats tablets and unfolded foldables as large', () => {
          expect(getSizeClass(840)).toBe('large');
        });
  });

  describe('bottomBarClearance', () => {
    it('clears the tab bar and mini player', () => {
      const clearance = bottomBarClearance(0);
      expect(clearance).toBe(TAB_BAR_HEIGHT + MINI_PLAYER_HEIGHT + 16);
    });

    it('grows with the device safe-area inset', () => {
      expect(bottomBarClearance(34)).toBe(bottomBarClearance(0) + 34);
    });

    it('drops the mini player allowance when it is hidden', () => {
      expect(bottomBarClearance(0, false)).toBe(TAB_BAR_HEIGHT + 16);
    });

    it('always leaves enough room to tap the last row', () => {
      expect(bottomBarClearance(0)).toBeGreaterThanOrEqual(120);
    });
  });
});