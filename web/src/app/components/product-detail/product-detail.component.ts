import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { ProductService } from '../../services/product.service';
import { Product } from '../../models/product';
import { Size } from '../../models/size';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-product-detail',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './product-detail.component.html',
  styleUrls: ['./product-detail.component.scss']
})
export class ProductDetailComponent implements OnInit, OnDestroy {
  product: Product | undefined;
  sizes: Size[] = [];
  isLoading = true;
  private destroy$ = new Subject<void>();
  private pid: string = '';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private productService: ProductService
  ) { }

  ngOnInit(): void {
    this.productService.isLoading$
      .pipe(takeUntil(this.destroy$))
      .subscribe(isLoading => {
        this.isLoading = isLoading;
      });

    this.getProductDetails();

    this.productService.buzzUpdate$
      .pipe(takeUntil(this.destroy$))
      .subscribe(update => {
        if (update.data &&
          (update.data.pid === this.pid ||
            (update.data.product && update.data.product.pid === this.pid))) {
          this.getProductDetails();
        }
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  getProductDetails(): void {
    this.pid = this.route.snapshot.paramMap.get('id') || '';
    if (!this.pid) return;

    this.productService.getProductDetail(this.pid).subscribe({
      next: (data) => {
        this.product = data.product;
        this.sizes = data.sizes || [];
      }
    });
  }

  updatePrice(): void {
    if (!this.pid) return;
    this.productService.updatePrice(this.pid).subscribe({
      next: () => {
        if (this.product) {
          this.product.updated_price = false;
        }
      }
    });
  }

  updateSize(sizeName: string): void {
    if (!this.pid) return;
    this.productService.updateSize(this.pid, sizeName).subscribe({
      next: () => {
        const size = this.sizes.find(s => s.name === sizeName);
        if (size) {
          size.updated_size = false;
        }
      }
    });
  }

  getTotalInStock(): number {
    return this.sizes.filter(size => size.stock > 0).length;
  }

  goBack(): void {
    this.router.navigate(['/']);
  }
}