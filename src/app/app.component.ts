import { Component, OnInit, HostBinding } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { CommonModule } from '@angular/common';
import { UpdateNotificationComponent } from './components/update-notification/update-notification.component';
import { NavigationComponent } from './components/navigation/navigation.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, CommonModule, UpdateNotificationComponent, NavigationComponent],
  template: `
    <div class="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-200">
      <app-navigation [darkMode]="darkMode" (toggleDarkMode)="toggleDarkMode()"></app-navigation>

      <main class="container mx-auto p-4 md:p-6 animate-fade-in">
        <router-outlet></router-outlet>
      </main>
      
      <app-update-notification></app-update-notification>
    </div>
  `
})
export class AppComponent implements OnInit {
  @HostBinding('class.dark') darkMode = false;
  
  ngOnInit() {
    const savedDarkMode = localStorage.getItem('darkMode');
    if (savedDarkMode === 'true') {
      this.darkMode = true;
      document.documentElement.classList.add('dark');
    }
    
    if (savedDarkMode === null) {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      this.darkMode = prefersDark;
      if (prefersDark) {
        document.documentElement.classList.add('dark');
      }
    }
  }
  
  toggleDarkMode() {
    this.darkMode = !this.darkMode;
    if (this.darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('darkMode', this.darkMode.toString());
  }
}