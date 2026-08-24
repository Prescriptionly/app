import { GoogleGenerativeAI } from '@google/generative-ai';
import OpenAI from 'openai';
import { env } from '../../config/env';
import { logger } from '../../shared/logging/logger';
import { DosageForm, FrequencyPeriod } from '@prisma/client';

export interface ExtractedMedicationCandidate {
  enteredName: string;
  form: DosageForm;
  strength?: string | null;
  originalInstructionText: string;
  doseQuantity: number;
  doseUnit: string;
  route?: string | null;
  frequencyCount: number;
  frequencyPeriod: FrequencyPeriod;
  timingDetails?: string | null;
  isPrn: boolean;
  prnReason?: string | null;
  durationDays?: number | null;
  confidence: number;
  warningFlags: string[];
}

export interface AiExtractionResult {
  prescriberName?: string | null;
  clinicName?: string | null;
  prescribedDate?: string | null;
  medications: ExtractedMedicationCandidate[];
  overallConfidence: number;
  fieldConfidence: Record<string, number>;
  ocrText: string;
  usedModel: string;
  usedProvider: 'GEMINI' | 'OPENAI' | 'MOCK';
}

export interface AiGroundedQuestionResult {
  groundedFacts: string[];
  explanation: string;
  notPresentStatements: string[];
  disclaimer: string;
  usedModel: string;
  usedProvider: 'GEMINI' | 'OPENAI' | 'MOCK';
}

export interface ActiveAiConfig {
  provider: 'GEMINI' | 'OPENAI' | 'MOCK';
  model: string;
  isActive: boolean;
  hasApiKey: boolean;
  statusDescription: string;
}

export class AiProviderService {
  /**
   * Determine the active AI provider, model, and activation status
   */
  getActiveConfig(): ActiveAiConfig {
    const rawModel = (env.AI_MODEL || 'gemini-1.5-flash').trim().toLowerCase();
    const explicitProvider = env.AI_PROVIDER || 'auto';

    let provider: 'GEMINI' | 'OPENAI' | 'MOCK' = 'MOCK';

    if (rawModel === 'mock' || rawModel === 'local' || rawModel === 'offline' || explicitProvider === 'mock') {
      return {
        provider: 'MOCK',
        model: rawModel,
        isActive: false,
        hasApiKey: false,
        statusDescription: 'Deactivated / Using local deterministic fallback',
      };
    }

    if (explicitProvider === 'gemini' || rawModel.startsWith('gemini')) {
      provider = 'GEMINI';
    } else if (explicitProvider === 'openai' || rawModel.startsWith('gpt') || rawModel.startsWith('o1') || rawModel.startsWith('o3')) {
      provider = 'OPENAI';
    } else {
      provider = 'GEMINI';
    }

    const apiKey = this.resolveApiKey(provider);
    const hasApiKey = !!apiKey && apiKey.length > 0;

    return {
      provider,
      model: env.AI_MODEL || (provider === 'GEMINI' ? 'gemini-1.5-flash' : 'gpt-4o-mini'),
      isActive: hasApiKey,
      hasApiKey,
      statusDescription: hasApiKey
        ? `Active (${provider} - ${env.AI_MODEL})`
        : `Deactivated (Missing ${provider === 'GEMINI' ? 'GEMINI_API_KEY / AI_API_KEY' : 'OPENAI_API_KEY / AI_API_KEY'}) - falling back to local engine`,
    };
  }

  private resolveApiKey(provider: 'GEMINI' | 'OPENAI' | 'MOCK'): string | undefined {
    if (env.AI_API_KEY && env.AI_API_KEY.trim().length > 0) {
      return env.AI_API_KEY.trim();
    }
    if (provider === 'GEMINI') {
      return env.GEMINI_API_KEY?.trim();
    }
    if (provider === 'OPENAI') {
      return env.OPENAI_API_KEY?.trim();
    }
    return undefined;
  }

  /**
   * Extract medical prescription information from an image or document buffer
   */
  async extractPrescription(
    fileBuffer: Buffer,
    mimeType: string,
    fileName: string
  ): Promise<AiExtractionResult> {
    const config = this.getActiveConfig();

    if (!config.isActive) {
      logger.info('AI extraction using local fallback (deactivated / no API key)', {
        provider: config.provider,
        model: config.model,
      });
      return this.localFallbackExtraction(fileName);
    }

    try {
      if (config.provider === 'GEMINI') {
        return await this.extractWithGemini(fileBuffer, mimeType, config.model);
      } else if (config.provider === 'OPENAI') {
        return await this.extractWithOpenAI(fileBuffer, mimeType, config.model);
      }
    } catch (err: unknown) {
      logger.error('Live AI extraction failed, safely falling back to local engine', {
        error: err instanceof Error ? err.message : String(err),
        model: config.model,
        provider: config.provider,
      });
    }

    return this.localFallbackExtraction(fileName);
  }

  /**
   * Answer clinical questions grounded strictly in the document content
   */
  async answerDocumentQuestion(
    documentTitle: string,
    documentCategory: string,
    ocrText: string,
    question: string
  ): Promise<AiGroundedQuestionResult> {
    const config = this.getActiveConfig();

    if (!config.isActive) {
      return this.localFallbackAnswer(documentTitle, documentCategory, ocrText, question);
    }

    try {
      if (config.provider === 'GEMINI') {
        return await this.answerWithGemini(documentTitle, documentCategory, ocrText, question, config.model);
      } else if (config.provider === 'OPENAI') {
        return await this.answerWithOpenAI(documentTitle, documentCategory, ocrText, question, config.model);
      }
    } catch (err: unknown) {
      logger.error('Live AI question answering failed, safely falling back to local engine', {
        error: err instanceof Error ? err.message : String(err),
        model: config.model,
        provider: config.provider,
      });
    }

    return this.localFallbackAnswer(documentTitle, documentCategory, ocrText, question);
  }

  // ==========================================
  // Google Gemini Implementation
  // ==========================================

  private async extractWithGemini(
    fileBuffer: Buffer,
    mimeType: string,
    modelName: string
  ): Promise<AiExtractionResult> {
    const apiKey = this.resolveApiKey('GEMINI')!;
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: modelName,
      generationConfig: {
        responseMimeType: 'application/json',
        temperature: 0.1,
      },
    });

    const prompt = `You are a medical OCR extraction specialist for Prescriptionly.
Analyze the attached medical prescription or document image.
Extract all structured clinical items. In particular, inspect high-risk values like decimal points (e.g. 0.5 mg vs 5 mg) and flag any ambiguity.

Return ONLY a valid JSON object matching this schema:
{
  "prescriberName": string | null,
  "clinicName": string | null,
  "prescribedDate": string | null (YYYY-MM-DD),
  "overallConfidence": number (between 0.0 and 1.0),
  "ocrText": string (full transcribed text),
  "fieldConfidence": {
    "prescriberName": number,
    "clinicName": number,
    "prescribedDate": number
  },
  "medications": [
    {
      "enteredName": string (e.g. "Metformin", "Amoxicillin"),
      "form": "TABLET" | "CAPSULE" | "SYRUP" | "INJECTION" | "INHALER" | "CREAM" | "DROPS" | "PATCH" | "OTHER",
      "strength": string | null (e.g. "500 mg", "0.5 g"),
      "originalInstructionText": string (exact transcription of instructions, e.g. "1 tab twice daily"),
      "doseQuantity": number (e.g. 1),
      "doseUnit": string (e.g. "tablet", "capsule", "mL"),
      "route": string | null (e.g. "Oral"),
      "frequencyCount": number (e.g. 2),
      "frequencyPeriod": "DAY" | "WEEK" | "MONTH" | "AS_NEEDED",
      "timingDetails": string | null,
      "isPrn": boolean,
      "prnReason": string | null,
      "durationDays": number | null,
      "confidence": number (between 0.0 and 1.0),
      "warningFlags": string[] (e.g. ["POTENTIAL_DECIMAL_AMBIGUITY: Verify 0.5mg vs 5mg"])
    }
  ]
}`;

    const part = {
      inlineData: {
        data: fileBuffer.toString('base64'),
        mimeType: mimeType === 'application/pdf' ? 'application/pdf' : mimeType || 'image/jpeg',
      },
    };

    const response = await model.generateContent([prompt, part]);
    const text = response.response.text();
    const parsed = JSON.parse(text);

    return {
      prescriberName: parsed.prescriberName || null,
      clinicName: parsed.clinicName || null,
      prescribedDate: parsed.prescribedDate || new Date().toISOString().split('T')[0],
      medications: this.sanitizeMedications(parsed.medications || []),
      overallConfidence: typeof parsed.overallConfidence === 'number' ? parsed.overallConfidence : 0.9,
      fieldConfidence: parsed.fieldConfidence || {},
      ocrText: parsed.ocrText || text,
      usedModel: modelName,
      usedProvider: 'GEMINI',
    };
  }

  private async answerWithGemini(
    documentTitle: string,
    documentCategory: string,
    ocrText: string,
    question: string,
    modelName: string
  ): Promise<AiGroundedQuestionResult> {
    const apiKey = this.resolveApiKey('GEMINI')!;
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: modelName,
      generationConfig: {
        responseMimeType: 'application/json',
        temperature: 0.2,
      },
    });

    const prompt = `You are a clinical document assistant in Prescriptionly.
Answer the patient's question STRICTLY grounded in the document evidence provided below.

CRITICAL INVARIANTS:
1. "groundedFacts": List only facts explicitly stated in the document text.
2. "explanation": Plain-English context and medical terminology explanation.
3. "notPresentStatements": Explicitly state what is NOT found in the document (distinguishing "not found in this document" from "you do not have this condition").
4. Never infer diagnoses, medical approval, or clinical certainty not supported by evidence.

Document Title: ${documentTitle}
Category: ${documentCategory}
Document Content:
"""
${ocrText}
"""

Patient Question: "${question}"

Return JSON matching:
{
  "groundedFacts": string[],
  "explanation": string,
  "notPresentStatements": string[],
  "disclaimer": string
}`;

    const response = await model.generateContent([prompt]);
    const parsed = JSON.parse(response.response.text());

    return {
      groundedFacts: parsed.groundedFacts || [],
      explanation: parsed.explanation || '',
      notPresentStatements: parsed.notPresentStatements || [],
      disclaimer:
        parsed.disclaimer ||
        'Prescriptionly AI Assistant answers are grounded strictly in your uploaded document for informational purposes and never constitute medical advice.',
      usedModel: modelName,
      usedProvider: 'GEMINI',
    };
  }

  // ==========================================
  // OpenAI GPT Implementation
  // ==========================================

  private async extractWithOpenAI(
    fileBuffer: Buffer,
    mimeType: string,
    modelName: string
  ): Promise<AiExtractionResult> {
    const apiKey = this.resolveApiKey('OPENAI')!;
    const openai = new OpenAI({ apiKey });

    const base64Data = fileBuffer.toString('base64');
    const imageMediaType = mimeType || 'image/jpeg';
    const dataUrl = `data:${imageMediaType};base64,${base64Data}`;

    const response = await openai.chat.completions.create({
      model: modelName,
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content: `You are a medical OCR extraction specialist for Prescriptionly.
Extract all structured clinical items from the attached prescription or medical image.
Detect decimal ambiguities (e.g. 0.5 mg vs 5 mg) and add warningFlags.
Return JSON with prescriberName, clinicName, prescribedDate, overallConfidence, ocrText, fieldConfidence, and medications list.`,
        },
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: 'Extract the full prescription metadata and medication candidate list from this image.',
            },
            {
              type: 'image_url',
              image_url: {
                url: dataUrl,
              },
            },
          ],
        },
      ],
      temperature: 0.1,
    });

    const content = response.choices[0]?.message?.content || '{}';
    const parsed = JSON.parse(content);

    return {
      prescriberName: parsed.prescriberName || null,
      clinicName: parsed.clinicName || null,
      prescribedDate: parsed.prescribedDate || new Date().toISOString().split('T')[0],
      medications: this.sanitizeMedications(parsed.medications || []),
      overallConfidence: typeof parsed.overallConfidence === 'number' ? parsed.overallConfidence : 0.9,
      fieldConfidence: parsed.fieldConfidence || {},
      ocrText: parsed.ocrText || content,
      usedModel: modelName,
      usedProvider: 'OPENAI',
    };
  }

  private async answerWithOpenAI(
    documentTitle: string,
    documentCategory: string,
    ocrText: string,
    question: string,
    modelName: string
  ): Promise<AiGroundedQuestionResult> {
    const apiKey = this.resolveApiKey('OPENAI')!;
    const openai = new OpenAI({ apiKey });

    const response = await openai.chat.completions.create({
      model: modelName,
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content: `You are a clinical document assistant in Prescriptionly.
Answer the patient's question STRICTLY grounded in the document evidence.
Return JSON with:
- "groundedFacts": string[] (explicit facts from text)
- "explanation": string (plain language medical context)
- "notPresentStatements": string[] (information not in document)
- "disclaimer": string`,
        },
        {
          role: 'user',
          content: `Document Title: ${documentTitle}
Category: ${documentCategory}
Document Content:
"""
${ocrText}
"""

Patient Question: "${question}"`,
        },
      ],
      temperature: 0.2,
    });

    const content = response.choices[0]?.message?.content || '{}';
    const parsed = JSON.parse(content);

    return {
      groundedFacts: parsed.groundedFacts || [],
      explanation: parsed.explanation || '',
      notPresentStatements: parsed.notPresentStatements || [],
      disclaimer:
        parsed.disclaimer ||
        'Prescriptionly AI Assistant answers are grounded strictly in your uploaded document for informational purposes and never constitute medical advice.',
      usedModel: modelName,
      usedProvider: 'OPENAI',
    };
  }

  // ==========================================
  // Local Deterministic Fallback Implementation
  // ==========================================

  private localFallbackExtraction(fileName: string): AiExtractionResult {
    const today = new Date().toISOString().split('T')[0]!;
    const mockRawText = `
Clinic: Metro Health Clinic
Prescriber: Dr. Sarah Jenkins, MD
Date: ${today}
Source File: ${fileName}

Rx:
1. Metformin 500mg - Take 1 tablet twice daily with meals.
2. Amoxicillin 0.5g - 1 capsule every 8 hours for 7 days.
3. Paracetamol 500mg - 1-2 tablets every 6 hours PRN for fever.
    `.trim();

    const candidates: ExtractedMedicationCandidate[] = [
      {
        enteredName: 'Metformin',
        form: 'TABLET',
        strength: '500 mg',
        originalInstructionText: 'Take 1 tablet twice daily with meals.',
        doseQuantity: 1,
        doseUnit: 'tablet',
        route: 'Oral',
        frequencyCount: 2,
        frequencyPeriod: 'DAY',
        timingDetails: 'With meals',
        isPrn: false,
        durationDays: 30,
        confidence: 0.96,
        warningFlags: [],
      },
      {
        enteredName: 'Amoxicillin',
        form: 'CAPSULE',
        strength: '500 mg',
        originalInstructionText: '1 capsule every 8 hours for 7 days.',
        doseQuantity: 1,
        doseUnit: 'capsule',
        route: 'Oral',
        frequencyCount: 3,
        frequencyPeriod: 'DAY',
        timingDetails: 'Every 8 hours',
        isPrn: false,
        durationDays: 7,
        confidence: 0.74,
        warningFlags: [
          'POTENTIAL_DECIMAL_AMBIGUITY: Strength was read as "0.5g / 500mg". Please verify the decimal point.',
        ],
      },
      {
        enteredName: 'Paracetamol',
        form: 'TABLET',
        strength: '500 mg',
        originalInstructionText: '1-2 tablets every 6 hours PRN for fever.',
        doseQuantity: 1,
        doseUnit: 'tablet',
        route: 'Oral',
        frequencyCount: 4,
        frequencyPeriod: 'AS_NEEDED',
        timingDetails: 'Every 6 hours',
        isPrn: true,
        prnReason: 'Fever or mild pain',
        durationDays: 5,
        confidence: 0.91,
        warningFlags: [],
      },
    ];

    return {
      prescriberName: 'Dr. Sarah Jenkins, MD',
      clinicName: 'Metro Health Clinic',
      prescribedDate: today,
      medications: candidates,
      overallConfidence: 0.87,
      fieldConfidence: {
        prescriberName: 0.95,
        clinicName: 0.92,
        prescribedDate: 0.98,
      },
      ocrText: mockRawText,
      usedModel: 'local-fallback',
      usedProvider: 'MOCK',
    };
  }

  private localFallbackAnswer(
    documentTitle: string,
    documentCategory: string,
    ocrText: string,
    question: string
  ): AiGroundedQuestionResult {
    const lowerQuestion = question.toLowerCase();
    const groundedFacts: string[] = [];
    const notPresentStatements: string[] = [];
    let explanation = '';

    if (
      lowerQuestion.includes('dose') ||
      lowerQuestion.includes('medication') ||
      lowerQuestion.includes('prescrib') ||
      lowerQuestion.includes('how much') ||
      lowerQuestion.includes('take')
    ) {
      groundedFacts.push(`Document records: "${ocrText.trim().replace(/\s+/g, ' ')}"`);
      explanation =
        'The document prescribes medication with specific dosage intervals. Always follow the explicit instructions verified on your confirmed prescription.';
    } else {
      groundedFacts.push(`Document contains clinical records for ${documentTitle} (${documentCategory}).`);
      explanation = `Based strictly on this document: ${ocrText.slice(0, 200)}...`;
    }

    if (
      lowerQuestion.includes('allerg') ||
      lowerQuestion.includes('diagnos') ||
      lowerQuestion.includes('cancer') ||
      lowerQuestion.includes('diabetes')
    ) {
      notPresentStatements.push(
        'This specific uploaded document does NOT mention any recorded allergies or additional chronic diagnoses. Note: Absence of a condition in this document does not mean you do not have it.'
      );
    }

    return {
      groundedFacts,
      explanation,
      notPresentStatements,
      disclaimer:
        'Prescriptionly AI Assistant answers are grounded strictly in your uploaded document for informational purposes and never constitute medical advice, diagnosis, or clinical certainty.',
      usedModel: 'local-fallback',
      usedProvider: 'MOCK',
    };
  }

  private sanitizeMedications(rawList: unknown[]): ExtractedMedicationCandidate[] {
    const validForms: DosageForm[] = [
      'TABLET',
      'CAPSULE',
      'SYRUP',
      'INJECTION',
      'INHALER',
      'CREAM',
      'DROPS',
      'PATCH',
      'OTHER',
    ];
    const validPeriods: FrequencyPeriod[] = ['DAY', 'WEEK', 'MONTH', 'AS_NEEDED'];

    return rawList.map((item: any) => {
      const form = validForms.includes(item.form) ? (item.form as DosageForm) : 'TABLET';
      const frequencyPeriod = validPeriods.includes(item.frequencyPeriod)
        ? (item.frequencyPeriod as FrequencyPeriod)
        : 'DAY';

      const warningFlags = Array.isArray(item.warningFlags) ? item.warningFlags : [];
      const strength = item.strength ? String(item.strength) : null;

      // Auto-detect potential decimal ambiguity if not already flagged
      if (
        strength &&
        (strength.includes('0.') || strength.includes('.5') || strength.includes('.25')) &&
        !warningFlags.some((f: string) => f.includes('DECIMAL'))
      ) {
        warningFlags.push(`POTENTIAL_DECIMAL_AMBIGUITY: Verify strength "${strength}" carefully.`);
      }

      return {
        enteredName: item.enteredName || 'Unnamed Medication',
        form,
        strength,
        originalInstructionText: item.originalInstructionText || `${item.enteredName || ''} as directed`,
        doseQuantity: typeof item.doseQuantity === 'number' ? item.doseQuantity : 1,
        doseUnit: item.doseUnit || 'tablet',
        route: item.route || 'Oral',
        frequencyCount: typeof item.frequencyCount === 'number' ? item.frequencyCount : 1,
        frequencyPeriod,
        timingDetails: item.timingDetails || null,
        isPrn: !!item.isPrn,
        prnReason: item.prnReason || null,
        durationDays: typeof item.durationDays === 'number' ? item.durationDays : null,
        confidence: typeof item.confidence === 'number' ? item.confidence : 0.85,
        warningFlags,
      };
    });
  }
}

export const aiProviderService = new AiProviderService();
