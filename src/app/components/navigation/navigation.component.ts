import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive } from '@angular/router';

@Component({
  selector: 'app-navigation',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  templateUrl: `./navigation.component.html`,
  styleUrls: [`./navigation.component.scss`]
})
export class NavigationComponent {
  @Input() darkMode = false;
  @Output() toggleDarkMode = new EventEmitter<void>();
}