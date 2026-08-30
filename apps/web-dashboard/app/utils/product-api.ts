import axios from 'axios';

export interface Product {
  id: string;
  name: string;
  sku: string;
  category: 'Laptops' | 'Phones' | 'Tablets' | 'Wearables' | 'Audio' | 'Accessories';
  price: number;
  description: string;
  inStock: boolean;
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api/v1';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 5000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// export const FALLBACK_PRODUCTS: Product[] = [
//   {
//     id: 'prod-macbook-pro',
//     name: 'MacBook Pro M3 Max 16"',
//     sku: 'PROD-SKU-001',
//     category: 'Laptops',
//     price: 3499.99,
//     description: 'M3 Max chip with 36GB unified memory and 1TB SSD storage.',
//     inStock: true,
//   },
//   {
//     id: 'prod-iphone-15',
//     name: 'iPhone 15 Pro Max 256GB',
//     sku: 'PROD-SKU-002',
//     category: 'Phones',
//     price: 1299.00,
//     description: 'Titanium design with A17 Pro chip and 5x Telephoto camera.',
//     inStock: true,
//   },
//   {
//     id: 'prod-ipad-air',
//     name: 'iPad Air M2 11"',
//     sku: 'PROD-SKU-003',
//     category: 'Tablets',
//     price: 799.00,
//     description: 'Liquid Retina display powered by M2 chip.',
//     inStock: true,
//   },
//   {
//     id: 'prod-watch-ultra',
//     name: 'Apple Watch Ultra 2',
//     sku: 'PROD-SKU-004',
//     category: 'Wearables',
//     price: 799.00,
//     description: 'Rugged titanium case with precision dual-frequency GPS.',
//     inStock: true,
//   },
//   {
//     id: 'prod-airpods-max',
//     name: 'AirPods Max Headphones',
//     sku: 'PROD-SKU-005',
//     category: 'Audio',
//     price: 549.00,
//     description: 'High-fidelity audio with active noise cancellation.',
//     inStock: true,
//   },
//   {
//     id: 'prod-mac-studio',
//     name: 'Mac Studio M2 Ultra',
//     sku: 'PROD-SKU-006',
//     category: 'Laptops',
//     price: 3999.00,
//     description: 'M2 Ultra chip with 24-core CPU and 60-core GPU workstation.',
//     inStock: true,
//   },
//   {
//     id: 'prod-ipad-pro',
//     name: 'iPad Pro 13" M4 OLED',
//     sku: 'PROD-SKU-007',
//     category: 'Tablets',
//     price: 1299.00,
//     description: 'Ultra Retina XDR OLED display with M4 chip architecture.',
//     inStock: true,
//   },
//   {
//     id: 'prod-airpods-pro',
//     name: 'AirPods Pro 2nd Gen',
//     sku: 'PROD-SKU-008',
//     category: 'Audio',
//     price: 249.00,
//     description: 'H2 chip active noise cancellation with USB-C charging case.',
//     inStock: true,
//   },
//   {
//     id: 'prod-pro-display',
//     name: 'Pro Display XDR 32"',
//     sku: 'PROD-SKU-009',
//     category: 'Accessories',
//     price: 4999.00,
//     description: '6K Retina display with 1600 nits peak brightness.',
//     inStock: true,
//   },
//   {
//     id: 'prod-magic-keyboard',
//     name: 'Magic Keyboard Touch ID',
//     sku: 'PROD-SKU-010',
//     category: 'Accessories',
//     price: 199.00,
//     description: 'Wireless rechargeable keyboard with integrated Touch ID.',
//     inStock: true,
//   },
// ];

export const FALLBACK_PRODUCTS: Product[] = [];

/**
 * Fetch all active products from product-service via API Gateway / Axios
 */
export async function getProducts(): Promise<{ data: Product[]; isLiveApi: boolean }> {
  try {
    const response = await apiClient.get('/products');
    if (Array.isArray(response.data) && response.data.length > 0) {
      const liveProducts: Product[] = response.data.map((item: any) => ({
        id: item.id || crypto.randomUUID(),
        name: item.name || 'Unnamed Product',
        sku: item.sku || 'SKU-000',
        category: item.category || 'Laptops',
        price: typeof item.price === 'number' ? item.price : parseFloat(item.price) || 0,
        description: item.description || '',
        inStock: item.isActive !== false,
      }));
      return { data: liveProducts, isLiveApi: true };
    }
  } catch (error: any) {
    console.warn('Unable to fetch live products from product-service:', error?.message || error);
  }

  // Fallback to pre-populated products if API Gateway / DB is offline
  return { data: FALLBACK_PRODUCTS, isLiveApi: false };
}

export async function getProductBySku(sku: string): Promise<Product | null> {
  const { data } = await getProducts();
  return data.find((p) => p.sku.toLowerCase() === sku.toLowerCase()) || null;
}

export async function createProductApi(payload: Partial<Product> & { initialStock?: number }): Promise<Product> {
  const res = await apiClient.post('/products', payload);
  const item = res.data;
  return {
    id: item.id,
    name: item.name,
    sku: item.sku,
    category: item.category,
    price: typeof item.price === 'number' ? item.price : parseFloat(item.price) || 0,
    description: item.description || '',
    inStock: item.isActive !== false,
  };
}

export async function updateProductApi(id: string, payload: Partial<Product>): Promise<Product> {
  const res = await apiClient.patch(`/products/${id}`, payload);
  const item = res.data;
  return {
    id: item.id,
    name: item.name,
    sku: item.sku,
    category: item.category,
    price: typeof item.price === 'number' ? item.price : parseFloat(item.price) || 0,
    description: item.description || '',
    inStock: item.isActive !== false,
  };
}

export async function deleteProductApi(id: string): Promise<Product> {
  const res = await apiClient.delete(`/products/${id}`);
  const item = res.data;
  return {
    id: item.id,
    name: item.name,
    sku: item.sku,
    category: item.category,
    price: typeof item.price === 'number' ? item.price : parseFloat(item.price) || 0,
    description: item.description || '',
    inStock: false,
  };
}
