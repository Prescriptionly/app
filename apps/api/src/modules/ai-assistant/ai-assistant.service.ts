import { documentService } from '../documents/document.service';
import { aiProviderService } from '../../infrastructure/ai/ai-provider';

export interface GroundedAssistantResponse {
  documentId: string;
  documentTitle: string;
  query: string;
  groundedFacts: string[];
  explanation: string;
  notPresentStatements: string[];
  disclaimer: string;
  usedModel?: string;
  usedProvider?: string;
}

export class AiAssistantService {
  async askDocument(documentId: string, accountId: string, question: string): Promise<GroundedAssistantResponse> {
    const document = await documentService.getDocumentById(documentId, accountId);
    const version = document.versions[0];
    const extraction = version?.extractions[0];

    const ocrText = extraction?.ocrText || `Document Title: ${document.title} (${document.category})`;

    const result = await aiProviderService.answerDocumentQuestion(
      document.title,
      document.category,
      ocrText,
      question
    );

    return {
      documentId: document.id,
      documentTitle: document.title,
      query: question,
      groundedFacts: result.groundedFacts,
      explanation: result.explanation,
      notPresentStatements: result.notPresentStatements,
      disclaimer: result.disclaimer,
      usedModel: result.usedModel,
      usedProvider: result.usedProvider,
    };
  }
}

export const aiAssistantService = new AiAssistantService();
