import { Component, ChangeDetectionStrategy, inject, computed } from '@angular/core';
import { DecimalPipe, UpperCasePipe } from '@angular/common';
import { GameService, GAME_COLORS } from '../services/game.service';

@Component({
  selector: 'app-game-board',
  imports: [DecimalPipe, UpperCasePipe],
  templateUrl: './game-board.html',
  styleUrl: './game-board.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GameBoard {
  protected readonly game = inject(GameService);
  protected readonly gameColors = GAME_COLORS;
  protected readonly circleIndices = Array.from({ length: 10 }, (_, i) => i);
  protected readonly emberParticleCount = computed(() => {
    const combo = this.game.combo();
    if (combo < 20) return 0;
    if (combo >= 200) return 150;
    return Math.round(2 + ((combo - 20) / 180) * 148);
  });

  protected readonly emberParticles = computed(() =>
    Array.from({ length: this.emberParticleCount() }, (_, i) => ({
      id: i,
      left: (i * 37) % 100,
      delay: ((i * 17) % 140) / 100,
      duration: 1.9 + ((i * 23) % 140) / 100,
      drift: ((i % 2 === 0 ? 1 : -1) * (16 + (i % 24))),
      size: 3 + (i % 4),
    }))
  );
  protected readonly splashDots = Array.from({ length: 8 }, (_, i) => i);

  protected readonly livesDisplay = computed(() =>
    Array.from({ length: 3 }, (_, i) => i < this.game.lives())
  );

  protected readonly comboLevel = computed(() => {
    const c = this.game.combo();
    const speed = this.game.speedMultiplier();
    if (c >= 100 && speed >= 3) return 'legendary';
    if (c >= 75) return 'amazing';
    if (c >= 50) return 'amazing';
    if (c >= 25) return 'great';
    if (c >= 15) return 'nice';
    return '';
  });
}
