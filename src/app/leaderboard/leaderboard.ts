import { Component, ChangeDetectionStrategy, inject, output } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { GameService } from '../services/game.service';

@Component({
  selector: 'app-leaderboard',
  imports: [DecimalPipe],
  templateUrl: './leaderboard.html',
  styleUrl: './leaderboard.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Leaderboard {
  protected readonly game = inject(GameService);
  readonly closePanel = output<void>();
}
