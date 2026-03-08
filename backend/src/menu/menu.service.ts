import { Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import {
  IMenuRepository,
  MENU_REPOSITORY,
} from './interfaces/menu-repository.interface';
import { RedisService } from '../common/services/redis.service';
import type {
  GroupedMenu,
  MenuCategory,
  ProductPlain,
  ProductResponse,
} from './interfaces/menu.interfaces';

/**
 * Menu service — business logic for menu operations.
 * Depends on IMenuRepository abstraction, not the Mongoose implementation.
 * Uses Redis for caching with graceful degradation (works without Redis).
 */
@Injectable()
export class MenuService {
  private readonly logger = new Logger(MenuService.name);

  // Cache key and TTL — menu changes infrequently, so 5 min cache is safe
  private static readonly MENU_CACHE_KEY = 'menu:full';
  private static readonly MENU_CACHE_TTL = 300; // 5 minutes in seconds

  constructor(
    @Inject(MENU_REPOSITORY)
    private readonly menuRepository: IMenuRepository,
    private readonly redisService: RedisService,
  ) {}

  /**
   * Returns the full menu grouped by category.
   * Cache strategy: read-through with 5-minute TTL.
   * Graceful degradation: if Redis is unavailable, falls back to DB.
   */
  async getMenu(): Promise<GroupedMenu> {
    // Try cache first
    const cached = await this.tryGetCache<GroupedMenu>(
      MenuService.MENU_CACHE_KEY,
    );
    if (cached) {
      this.logger.debug('Menu served from cache');
      return cached;
    }

    // Cache miss — fetch from database
    const products =
      (await this.menuRepository.findAvailable()) as ProductPlain[];

    // Group products by category preserving insertion order
    const categoryMap = new Map<string, MenuCategory>();
    for (const product of products) {
      const categoryName = product.category;
      let category = categoryMap.get(categoryName);
      if (!category) {
        category = { name: categoryName, products: [] };
        categoryMap.set(categoryName, category);
      }
      category.products.push({
        id: String(product._id),
        name: product.name,
        description: product.description,
        basePrice: product.basePrice,
        modifierGroups: product.modifierGroups,
      });
    }

    const result: GroupedMenu = {
      categories: Array.from(categoryMap.values()),
    };

    // Write to cache — fire and forget, don't block response on cache write
    this.trySetCache(
      MenuService.MENU_CACHE_KEY,
      result,
      MenuService.MENU_CACHE_TTL,
    );

    return result;
  }

  /**
   * Returns a single product by ID or throws NotFoundException.
   */
  async getProductById(id: string): Promise<ProductResponse> {
    const product =
      (await this.menuRepository.findById(id)) as ProductPlain | null;
    if (!product) {
      throw new NotFoundException(`Product with ID "${id}" not found`);
    }
    return {
      id: String(product._id),
      name: product.name,
      description: product.description,
      category: product.category,
      basePrice: product.basePrice,
      available: product.available,
      modifierGroups: product.modifierGroups,
    };
  }

  /**
   * Graceful Redis read — returns null if Redis is unavailable.
   * This ensures the API works even if the cache layer is down.
   */
  private async tryGetCache<T>(key: string): Promise<T | null> {
    try {
      const data = await this.redisService.get(key);
      return data ? (JSON.parse(data) as T) : null;
    } catch {
      this.logger.warn('Redis read failed — falling back to database');
      return null;
    }
  }

  /** Graceful Redis write — logs warning on failure, never throws */
  private trySetCache(key: string, value: unknown, ttl: number): void {
    this.redisService.set(key, JSON.stringify(value), ttl).catch(() => {
      this.logger.warn('Redis write failed — cache not updated');
    });
  }
}
