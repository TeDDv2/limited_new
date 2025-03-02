import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Product } from '../../models/product';
import { Size } from '../../models/size';

@Component({
  selector: 'app-product-card',
  standalone: true,
  imports: [CommonModule],
  templateUrl: `./product-card.component.html`,
  styleUrls: [`./product-card.component.scss`],
})
export class ProductCardComponent {
  @Input() product!: Product;
  @Input() inStockCount: number = 0;
  @Input() totalSizes: number = 0;
  
  @Output() productClick = new EventEmitter<string>();
  @Output() markSeen = new EventEmitter<string>();
}