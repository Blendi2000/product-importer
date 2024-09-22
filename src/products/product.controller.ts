import { Controller, Post, Body, HttpException, HttpStatus } from '@nestjs/common';
import { ProductService } from './product.service'; // Assuming you have ProductService

@Controller('products')
export class ProductController {
  constructor(private readonly productService: ProductService) {}

  @Post('import')
  async importProducts(@Body() body: { filePath: string }) {
    const { filePath } = body;

    if (!filePath) {
      throw new HttpException('File path is required', HttpStatus.BAD_REQUEST);
    }

    try {
      console.log('Starting product import from:', filePath);
      await this.productService.importCSV(filePath);

      return { message: 'Product import started successfully' };
    } catch (error) {
      console.error('Error during product import:', error);
      throw new HttpException('Internal server error', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
}
