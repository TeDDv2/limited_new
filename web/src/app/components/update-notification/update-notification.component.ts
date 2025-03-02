import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { ProductService } from '../../services/product.service';
import { CommonModule } from '@angular/common';

interface Notification {
  id: number;
  title: string;
  message: string;
  action: string;
  colorClass: string;
  data: any;
  timeoutId?: number; // Added timeoutId as optional number
  isExiting: boolean;
}

@Component({
  selector: 'app-update-notification',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './update-notification.component.html',
  styleUrls: ['./update-notification.component.scss']
})
export class UpdateNotificationComponent implements OnInit, OnDestroy {
  notifications: Notification[] = [];
  
  private nextId = 1;
  private destroy$ = new Subject<void>();

  constructor(
    private productService: ProductService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.productService.buzzUpdate$
      .pipe(takeUntil(this.destroy$))
      .subscribe(update => {
        this.handleUpdate(update);
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    
    this.notifications.forEach(n => {
      if (n.timeoutId) {
        clearTimeout(n.timeoutId);
      }
    });
  }

  private handleUpdate(update: any): void {
    let notification: Notification = {
      id: this.nextId++,
      title: '',
      message: '',
      action: '',
      colorClass: 'bg-blue-500',
      data: update.data,
      isExiting: false
    };
    
    switch (update.event) {
      case 'product_added':
        notification.title = 'New Product 🚨';
        notification.message = `${update.data.name} (${update.data.sku}) has been added`;
        notification.action = 'View Details';
        notification.colorClass = 'bg-green-500';
        break;
        
      case 'price_changed':
        notification.title = 'Price Updated 💰';
        notification.message = `${update.data.product.name}: ${update.data.old_price} → ${update.data.new_price} CZK`;
        notification.action = 'View Details';
        notification.colorClass = 'bg-rose-500';
        break;
        
      case 'size_changed':
        const inStockCount = update.data.size_updates.filter((s: any) => 
          s.action === 'updated' && s.old_stock === 0 && s.new_stock > 0
        ).length;
        
        if (inStockCount > 0) {
          notification.title = 'Sizes Restocked 👟';
          notification.message = `${update.data.product.name}: ${inStockCount} size(s) now in stock`;
          notification.action = 'View Details';
          notification.colorClass = 'bg-blue-500';
        } else {
          notification.title = 'Stock Updated';
          notification.message = `${update.data.product.name}: stock levels changed`;
          notification.action = 'View Details';
          notification.colorClass = 'bg-blue-500';
        }
        break;
        
      case 'product_deleted':
        notification.title = 'Product Removed';
        notification.message = `Product ${update.data.pid} has been removed`;
        notification.action = '';
        notification.colorClass = 'bg-gray-500';
        break;
        
      default:
        return; 
    }
    
    this.notifications.push(notification);
    
    notification.timeoutId = setTimeout(() => {
      this.startNotificationExit(notification);
    }, 8000);
  }

  closeNotification(notification: Notification): void {
    this.startNotificationExit(notification);
    if (notification.timeoutId !== undefined) {
      clearTimeout(notification.timeoutId);
    }
  }
  
  startNotificationExit(notification: Notification): void {
    notification.isExiting = true;
    
    setTimeout(() => {
      this.notifications = this.notifications.filter(n => n.id !== notification.id);
    }, 300);
  }

  handleActionClick(notification: Notification): void {
    if (notification.action === 'View Details' && notification.data) {
      const pid = notification.data.pid || 
                 (notification.data.product ? notification.data.product.pid : null);
      
      if (pid) {
        this.router.navigate(['/product', pid]);
        this.closeNotification(notification);
      }
    }
  }
}