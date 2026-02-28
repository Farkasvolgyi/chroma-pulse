import { Component, ChangeDetectionStrategy, inject, signal, OnDestroy } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { GameService } from './services/game.service';
import { GameBoard } from './game-board/game-board';
import { Leaderboard } from './leaderboard/leaderboard';

@Component({
  selector: 'app-root',
  imports: [DecimalPipe, GameBoard, Leaderboard],
  templateUrl: './app.html',
  styleUrl: './app.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '(document:keydown)': 'onKeyDown($event)',
  },
})
export class App implements OnDestroy {
  protected readonly game = inject(GameService);
  protected readonly showLeaderboard = signal(false);
  protected readonly playerName = signal('');
  protected readonly scoreSaved = signal(false);

  onKeyDown(event: KeyboardEvent): void {
    const key = event.key.toLowerCase();

    if (this.game.gameState() === 'menu' && !this.showLeaderboard()) {
      if (key === ' ' || key === 'enter') {
        event.preventDefault();
        this.startGame();
      }
    } else if (this.game.gameState() === 'playing') {
      event.preventDefault();
      this.game.handleKeyPress(key);
    }
  }

  startGame(): void {
    this.scoreSaved.set(false);
    this.playerName.set('');
    this.game.startGame();
  }

  saveScore(): void {
    this.game.addToLeaderboard(this.playerName());
    this.scoreSaved.set(true);
  }

  onNameInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.playerName.set(input.value);
  }

  goToMenu(): void {
    this.showLeaderboard.set(false);
    this.game.returnToMenu();
  }

  toggleLeaderboard(): void {
    this.showLeaderboard.update(v => !v);
  }

  ngOnDestroy(): void {
    this.game.destroy();
  }
}
