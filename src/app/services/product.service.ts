import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, Subject } from 'rxjs';
import { io, Socket } from 'socket.io-client';
import { environment } from '../../environments/environment';
import { Product } from '../models/product';
import { Size } from '../models/size';

interface ProductData {
  products: Product[];
  sizes: Size[];
}

interface BuzzUpdate {
  event: string;
  data: any;
}

@Injectable({
  providedIn: 'root'
})
export class ProductService {
  private socket: Socket;
  private apiUrl = environment.apiUrl;

  private productsSubject = new BehaviorSubject<Product[]>([]);
  public products$ = this.productsSubject.asObservable();

  private sizesSubject = new BehaviorSubject<Size[]>([]);
  public sizes$ = this.sizesSubject.asObservable();

  private isLoadingSubject = new BehaviorSubject<boolean>(true);
  public isLoading$ = this.isLoadingSubject.asObservable();

  private connectionStatusSubject = new BehaviorSubject<boolean>(false);
  public connectionStatus$ = this.connectionStatusSubject.asObservable();

  private buzzUpdateSubject = new Subject<BuzzUpdate>();
  public buzzUpdate$ = this.buzzUpdateSubject.asObservable();

  constructor(private http: HttpClient) {
    this.socket = io(this.apiUrl);
    this.setupSocketListeners();
    this.loadInitialData();
  }

  private setupSocketListeners(): void {
    this.socket.on('connect', () => {
      console.log('Connected to server');
      this.connectionStatusSubject.next(true);
    });

    this.socket.on('product_update', (data: ProductData) => {
      console.log('Received product update');
      this.updateProductsAndSizes(data);
    });

    this.socket.on('initial_data', (data: ProductData) => {
      console.log('Received initial data');
      this.updateProductsAndSizes(data);
      this.isLoadingSubject.next(false);
    });

    this.socket.on('buzzsneakers_update', (update: BuzzUpdate) => {
      console.log('Received buzzsneakers update:', update.event);

      this.buzzUpdateSubject.next(update);

      switch (update.event) {
        case 'product_added':
          this.handleProductAdded(update.data);
          break;

        case 'price_changed':
          this.handlePriceChanged(update.data);
          break;

        case 'size_changed':
          this.handleSizeChanged(update.data);
          break;

        case 'product_deleted':
          this.handleProductDeleted(update.data);
          break;
      }
    });

    this.socket.on('disconnect', () => {
      console.log('Disconnected from server');
      this.connectionStatusSubject.next(false);
    });

    this.socket.on('connect_error', (err) => {
      console.log('Connection error:', err);
      this.connectionStatusSubject.next(false);
    });
  }

  private updateProductsAndSizes(data: ProductData): void {
    if (data.products) {
      this.productsSubject.next(data.products);
    }

    if (data.sizes) {
      this.sizesSubject.next(data.sizes);
    }
  }

  private handleProductAdded(productData: any): void {
    const currentProducts = this.productsSubject.value;

    if (!currentProducts.find(p => p.pid === productData.pid)) {
      this.productsSubject.next([...currentProducts, productData]);

      if (productData.sizes && productData.sizes.length > 0) {
        const currentSizes = this.sizesSubject.value;
        this.sizesSubject.next([...currentSizes, ...productData.sizes]);
      }
    }
  }
  private handlePriceChanged(updateData: any): void {
    const currentProducts = this.productsSubject.value;
    const updatedProducts = currentProducts.map(product => {
      if (product.pid === updateData.pid) {
        return {
          ...product,
          price: updateData.new_price,
          updated_price: true
        };
      }
      return product;
    });

    this.productsSubject.next(updatedProducts);
  }

  private handleSizeChanged(updateData: any): void {
    const currentProducts = this.productsSubject.value;
    const updatedProducts = currentProducts.map(product => {
      if (product.pid === updateData.pid) {
        return {
          ...product,
          quantity: updateData.new_quantity
        };
      }
      return product;
    });
    this.productsSubject.next(updatedProducts);

    const currentSizes = this.sizesSubject.value;
    let updatedSizes = [...currentSizes];

    updateData.size_updates.forEach((sizeUpdate: any) => {
      if (sizeUpdate.action === 'added') {
        if (!updatedSizes.find(s => s.comb_id === sizeUpdate.combId)) {
          updatedSizes.push({
            comb_id: sizeUpdate.combId,
            pid: updateData.pid,
            stock: sizeUpdate.stock,
            name: sizeUpdate.name,
            updated_size: true
          });
        }
      } else if (sizeUpdate.action === 'updated') {
        updatedSizes = updatedSizes.map(size => {
          if (size.comb_id === sizeUpdate.combId) {
            return {
              ...size,
              stock: sizeUpdate.new_stock,
              updated_size: true
            };
          }
          return size;
        });
      }
    });

    this.sizesSubject.next(updatedSizes);
  }

  private handleProductDeleted(updateData: any): void {
    const currentProducts = this.productsSubject.value;
    const updatedProducts = currentProducts.filter(p => p.pid !== updateData.pid);
    this.productsSubject.next(updatedProducts);

    const currentSizes = this.sizesSubject.value;
    const updatedSizes = currentSizes.filter(s => s.pid !== updateData.pid);
    this.sizesSubject.next(updatedSizes);
  }

  private loadInitialData(): void {
    this.http.get<ProductData>(`${this.apiUrl}/products`)
      .subscribe({
        next: (data) => {
          this.updateProductsAndSizes(data);
          this.isLoadingSubject.next(false);
        },
        error: (error) => {
          console.error('Error loading initial data', error);
          this.isLoadingSubject.next(false);
        }
      });
  }

  getProductDetail(pid: string): Observable<any> {
    return this.http.get(`${this.apiUrl}/product/${pid}`);
  }

  updatePrice(pid: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/update-price`, { pid });
  }

  updateSize(pid: string, sizeName: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/update-size`, { pid, sizeName });
  }

  getProductById(pid: string): Product | undefined {
    return this.productsSubject.value.find(p => p.pid === pid);
  }

  getSizesForProduct(pid: string): Size[] {
    return this.sizesSubject.value.filter(s => s.pid === pid);
  }

  reconnect(): void {
    if (!this.socket.connected) {
      this.socket.connect();
    }
  }
}