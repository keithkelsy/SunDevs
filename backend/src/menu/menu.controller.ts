import { Controller, Get, Param } from '@nestjs/common';
import { MenuService } from './menu.service';

/**
 * Menu controller — handles HTTP requests for menu operations.
 * Controllers contain zero business logic; they delegate to MenuService.
 */
@Controller('menu')
export class MenuController {
  constructor(private readonly menuService: MenuService) {}

  /** GET /menu — returns the full menu grouped by category */
  @Get()
  getMenu() {
    return this.menuService.getMenu();
  }

  /** GET /menu/:productId — returns a single product with its modifier groups */
  @Get(':productId')
  getProductById(@Param('productId') productId: string) {
    return this.menuService.getProductById(productId);
  }
}
