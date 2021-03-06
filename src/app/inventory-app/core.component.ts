import { Component, OnInit } from '@angular/core';

import { Subscription } from 'rxjs';

import { ThemeService } from '../theme/theme.service';

@Component({
  selector: 'app-core',
  templateUrl: './core.component.html'
})
export class CoreComponent implements OnInit {
  themeMode: string;

  private themeSub: Subscription;

  constructor(private themeService: ThemeService) {}

  ngOnInit() {
    this.themeSub = this.themeService.themeStatus.subscribe((themeModeData) => {
      this.themeMode = themeModeData;
    });
    this.themeService.getThemeMode();
  }
}
