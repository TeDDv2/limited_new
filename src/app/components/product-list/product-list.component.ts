import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { ProductService } from '../../services/product.service';
import { Product } from '../../models/product';
import { Size } from '../../models/size';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ProductCardComponent } from '../product-card/product-card.component';

@Component({
  selector: 'app-product-list',
  standalone: true,
  imports: [CommonModule, FormsModule, ProductCardComponent],
  templateUrl: './product-list.component.html',
  styleUrls: ['./product-list.component.scss']
})
export class ProductListComponent implements OnInit, OnDestroy {
  products: Product[] = [];
  sizes: Size[] = [];
  isLoading = true;
  isConnected = false;
  searchTerm: string = '';
  showingUpdatedOnly = false;
  showingInStockOnly = false;
  selectedBrand: string | null = null;
  private destroy$ = new Subject<void>();

  constructor(
    private productService: ProductService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.productService.products$
      .pipe(takeUntil(this.destroy$))
      .subscribe(products => {
        this.products = products;
      });

    this.productService.sizes$
      .pipe(takeUntil(this.destroy$))
      .subscribe(sizes => {
        this.sizes = sizes;
      });

    this.productService.isLoading$
      .pipe(takeUntil(this.destroy$))
      .subscribe(isLoading => {
        this.isLoading = isLoading;
      });

    this.productService.connectionStatus$
      .pipe(takeUntil(this.destroy$))
      .subscribe(isConnected => {
        this.isConnected = isConnected;
      });
      
    // Listen for real-time updates
    this.productService.buzzUpdate$
      .pipe(takeUntil(this.destroy$))
      .subscribe(update => {
        console.log('Product list received update:', update.event);
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  getProductSizes(pid: string): Size[] {
    return this.sizes.filter(size => size.pid === pid);
  }

  getInStockSizes(pid: string): number {
    const productSizes = this.getProductSizes(pid);
    return productSizes.filter(size => size.stock > 0).length;
  }

  viewProduct(pid: string): void {
    this.router.navigate(['/product', pid]);
  }

  updatePrice(pid: string): void {
    this.productService.updatePrice(pid).subscribe({
      next: () => {
        console.log('Product marked as seen');
      },
      error: (error) => {
        console.error('Error marking product as seen', error);
      }
    });
  }
  
  getTotalInStock(): number {
    return this.products.filter(p => {
      const sizes = this.getProductSizes(p.pid);
      return sizes.some(s => s.stock > 0);
    }).length;
  }
  
  getUpdatedCount(): number {
    return this.products.filter(p => p.updated_price).length;
  }
  
  getBrandCount(): number {
    const brands = new Set(this.products.map(p => this.getBrandFromName(p.name)));
    return brands.size;
  }
  
  getBrandFromName(name: string): string {
    const lowerName = name.toLowerCase();
    if (lowerName.includes('nike')) return 'Nike';
    if (lowerName.includes('adidas')) return 'Adidas';
    if (lowerName.includes('new balance')) return 'New Balance';
    if (lowerName.includes('asics')) return 'Asics';
    if (lowerName.includes('puma')) return 'Puma';
    if (lowerName.includes('jordan')) return 'Jordan';
    if (lowerName.includes('reebok')) return 'Reebok';
    if (lowerName.includes('converse')) return 'Converse';
    return 'Other';
  }
  
  getPopularBrands(): string[] {
    return ['Nike', 'Adidas', 'Jordan', 'New Balance', 'Asics'];
  }
  
  filterByUpdated(): void {
    this.showingUpdatedOnly = !this.showingUpdatedOnly;
    if (this.showingUpdatedOnly) {
      this.showingInStockOnly = false;
    }
  }
  
  filterByInStock(): void {
    this.showingInStockOnly = !this.showingInStockOnly;
    if (this.showingInStockOnly) {
      this.showingUpdatedOnly = false;
    }
  }
  
  filterByBrand(brand: string): void {
    if (this.selectedBrand === brand) {
      this.selectedBrand = null;
    } else {
      this.selectedBrand = brand;
    }
  }
  
  clearFilters(): void {
    this.showingUpdatedOnly = false;
    this.showingInStockOnly = false;
    this.selectedBrand = null;
  }
  
  showingFiltered(): boolean {
    return this.showingUpdatedOnly || this.showingInStockOnly || this.selectedBrand !== null;
  }
  
  getEmptyStateMessage(): string {
    if (this.searchTerm) {
      return `No products match your search for "${this.searchTerm}"`;
    }
    if (this.showingUpdatedOnly) {
      return 'No updated products found. All products are up to date!';
    }
    if (this.showingInStockOnly) {
      return 'No products currently in stock. Check back later!';
    }
    if (this.selectedBrand) {
      return `No ${this.selectedBrand} products found.`;
    }
    return 'No products available at the moment.';
  }
  
  get filteredProducts(): Product[] {
    let filtered = this.products;
    
    if (this.searchTerm) {
      const searchLower = this.searchTerm.toLowerCase();
      filtered = filtered.filter(product => 
        product.name.toLowerCase().includes(searchLower) || 
        product.sku.toLowerCase().includes(searchLower)
      );
    }
    
    if (this.showingUpdatedOnly) {
      filtered = filtered.filter(product => product.updated_price);
    }
    
    if (this.showingInStockOnly) {
      filtered = filtered.filter(product => {
        const sizes = this.getProductSizes(product.pid);
        return sizes.some(size => size.stock > 0);
      });
    }
    
    if (this.selectedBrand) {
      filtered = filtered.filter(product => 
        this.getBrandFromName(product.name) === this.selectedBrand
      );
    }
    
    return filtered;
  }
}