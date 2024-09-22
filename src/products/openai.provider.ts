import { Injectable } from '@nestjs/common';
import OpenAI from 'openai';
require('dotenv').config();

@Injectable()
export class OpenAIProvider {
  private openai: OpenAI;

  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });
  }

  async createCompletion(params: any): Promise<any> {
    return await this.openai.completions.create(params);
  }
}
