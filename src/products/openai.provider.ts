import { Injectable } from '@nestjs/common';
import OpenAI from 'openai';

@Injectable()
export class OpenAIProvider {
  private openai: OpenAI;

  constructor() {
    this.openai = new OpenAI({
      apiKey: 'sk-PuwjX2r7Y6xB4i57QUqO_jALg4aTL8KwB8MuGGa6UhT3BlbkFJBCU6Pdy6fM-5cMhnhVTkYRpjlOZM2CPaJDOmGuqoQA'
    });
  }

  async createCompletion(params: any): Promise<any> {
    return await this.openai.completions.create(params);
  }
}
