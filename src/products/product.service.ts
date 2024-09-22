import { ForbiddenException, Inject, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as csv from 'csv-parser';
import * as fs from 'fs';
import { Product, Variant } from './product.schema';
const { nanoid } = require('nanoid');
import * as path from 'path';
import { Cron } from '@nestjs/schedule';
import { Vendor } from './vendor.schema';
import { OpenAIProvider } from './openai.provider';
import { CSVRow } from './interface/csv-row.interface'; // Importing the CSVRow interface
import { BadRequestError } from 'openai';
const  pLimit  = require('p-limit');









@Injectable()
export class ProductService {
  constructor(
    @InjectModel(Product.name) private productModel: Model<Product>,
    @InjectModel(Vendor.name) private vendorModel: Model<Vendor>,
    private readonly openaiProvider: OpenAIProvider,
  ) {

    this.limit= pLimit(100);
  }
  public limit;

  @Cron('0 0 * * *') // This runs once a day at midnight
  async handleCron() {
    console.log('Running daily product import');
    const filePath = path.join(__dirname, '../../images40.txt');
    await this.importCSV(filePath);
  }

  async delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * @param filePath 
   */
  async importCSV(filePath: string, shouldDelete: boolean = false): Promise<void> {
    const stream = fs.createReadStream(filePath).pipe(csv({ separator: '\t' }));
    const productsBatch: any[] = [];
    const BATCH_SIZE = 20; // Adjust batch size as needed
    const MAX_CONCURRENCY = 10; // Maximum number of concurrent promises
    const promises: Promise<any>[] = [];
    const taskArray = [];
    
    // Map to group products by ProductID and their associated ItemID variants
    const productsMap = new Map<string, { variants: CSVRow[] }>();
    const vendorsSet = new Set<string>();
    
    // Step 1: Read all rows from CSV and group by productId
    for await (const row of stream) {
      const typedRow = row as CSVRow;
      const productId = typedRow.ProductID;
  
      if (!productsMap.has(productId)) {
        productsMap.set(productId, { variants: [] });
      }
  
      const productGroup = productsMap.get(productId)!;
      productGroup.variants.push(typedRow); // Add the variant (ItemID) to the product's variant list
      vendorsSet.add(typedRow.Vendor);
    }
  
    const vendorIds = await this.updateVendors(Array.from(vendorsSet));
    console.log(productsMap.size, 'totalProducts');
    
    // Step 3: Iterate through unique product groups and process each product with its variants
    const existingProductIds = new Set<string>();
  
    for (const [productId, productGroup] of productsMap) {
      const task = this.limit(async () => {
        // Check if the product already exists in the database (regardless of variants)
        const existingProduct = await this.productModel.findOne({ productId });
  
        if (!existingProduct) {
          // Transform the product and include all its variants
          const productData = await this.transformToProductWithVariants(productGroup.variants, vendorIds);
          // productsBatch.push(productData);
  
          // If batch size is reached, insert into the database
          // if (productsBatch.length >= BATCH_SIZE) {
          //   await this.productModel.insertMany(productsBatch);
          //   productsBatch.length = 0; // Clear the batch
          // }
          await this.productModel.create(productData);
        } else {
          // Check if any fields have changed and update the existing product
          const updatedProductData = await this.transformToProductWithVariants(productGroup.variants, vendorIds);
          await this.productModel.updateOne({ productId }, { $set: updatedProductData });
          existingProductIds.add(productId); // Track updated products
        }
      });
      taskArray.push(task);
    }
  
    console.log("tasks are ready______");
    await Promise.all(taskArray);
    console.log("tasks finished______");
  
    // Step 4: Handle deletion of products not in the new import if the flag is true
    if (shouldDelete) {
      const productIdsToDelete = await this.productModel.find({}).distinct('productId');
      const idsToRemove = productIdsToDelete.filter(id => !existingProductIds.has(id));
      if (idsToRemove.length > 0) {
        await this.productModel.deleteMany({ productId: { $in: idsToRemove } });
        console.log(`${idsToRemove.length} products deleted.`);
      }
    }
  
    // If too many promises are pending, wait for them to complete
    /* if (promises.length >= MAX_CONCURRENCY) {
        await Promise.all(promises);
        promises.length = 0;
    } */
  
    // Step 4: Insert remaining products in batch if any
    // if (productsBatch.length > 0) {
    //   await this.productModel.insertMany(productsBatch);
    // }
    
    console.log('Product import completed.');
  }
  
  

  /**
   * @param variants 
   * @param vendorIds 
   */
  private async transformToProductWithVariants(variants: CSVRow[], vendorIds: Map<string, string>) {
    const row = variants[0]; 
  
    // if (!row.ProductID || !row.ProductName) {
    //   console.error('Missing required fields in row:', row);
    //   throw new Error('ProductID and ProductName are required');
    // }
  
    const productDescription = row.ItemDescription || 'No description available';
    const enhancedDescription = await this.enhanceDescription(row.ProductName, productDescription, row.PrimaryCategoryName);
  
    const [vendorId, manufacturerId] = await Promise.all([
      this.getVendorId(row.Vendor),
      this.getManufacturerId(row.Manufacturer),
    ]);
  
    const product = {
      productId: row.ProductID,
      itemId:row.ItemID,
      name: row.ProductName,
      description: enhancedDescription,
      vendorId,
      manufacturerId,
      category: row.PrimaryCategoryName,
      docId: nanoid(),
      variants: [] as Variant[], 
  
    };
  
    for (const variant of variants) {
      product.variants.push({
        itemId: variant.ItemID,
        packaging: variant.Packaging || 'Default packaging',
        price: variant["UnitPrice"], 
      });
    }
  
    return product;
  }
  

  /**
   * @param name 
   * @param description 
   * @param category 
   */
  private async enhanceDescription(name: string, description: string, category: string): Promise<string> {
    const prompt = `You are an expert in medical sales. Enhance the description for a product based on the following information:
    Product name: ${name}
    Product description: ${description}
    Category: ${category}
    New Description:`;

    try {
      const response = await this.openaiProvider.createCompletion({
        model: 'gpt-3.5-turbo-instruct',
        prompt,
        max_tokens: 100,
      });

      if (response && response.choices && response.choices.length > 0) {
        return response.choices[0].text.trim();
      } else {
        throw new Error('No response from OpenAI or invalid response format');
      }
    } catch (error) {
      return description;
    }
  }

  /**
   * @param vendors 
   */
  private async updateVendors(vendors: string[]): Promise<Map<string, string>> {
    const vendorIds = new Map<string, string>();

    for (const vendor of vendors) {
      const existingVendor = await this.vendorModel.findOne({ name: vendor }).exec();

      if (existingVendor) {
        vendorIds.set(vendor, existingVendor._id.toString()); 
      } else {
        const newVendor = await this.vendorModel.create({ name: vendor });
        vendorIds.set(vendor, newVendor._id.toString()); 
      }
    }

    return vendorIds; 
  }

  private async getVendorId(vendorName: string): Promise<string> {
    return nanoid();
  }

  private async getManufacturerId(manufacturerName: string): Promise<string> {
    return nanoid();
  }
}
