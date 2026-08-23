import { prisma } from '../../infrastructure/database/prisma';
import { DosageForm, MedicationConcept } from '@prisma/client';

const INITIAL_MEDICATIONS = [
  { name: 'Metformin', genericName: 'Metformin Hydrochloride', form: 'TABLET' as DosageForm, defaultStrength: '500 mg', defaultRoute: 'Oral' },
  { name: 'Amoxicillin', genericName: 'Amoxicillin', form: 'CAPSULE' as DosageForm, defaultStrength: '500 mg', defaultRoute: 'Oral' },
  { name: 'Lisinopril', genericName: 'Lisinopril', form: 'TABLET' as DosageForm, defaultStrength: '10 mg', defaultRoute: 'Oral' },
  { name: 'Atorvastatin', genericName: 'Atorvastatin Calcium', form: 'TABLET' as DosageForm, defaultStrength: '20 mg', defaultRoute: 'Oral' },
  { name: 'Omeprazole', genericName: 'Omeprazole', form: 'CAPSULE' as DosageForm, defaultStrength: '20 mg', defaultRoute: 'Oral' },
  { name: 'Paracetamol', genericName: 'Acetaminophen', form: 'TABLET' as DosageForm, defaultStrength: '500 mg', defaultRoute: 'Oral' },
  { name: 'Ibuprofen', genericName: 'Ibuprofen', form: 'TABLET' as DosageForm, defaultStrength: '400 mg', defaultRoute: 'Oral' },
  { name: 'Albuterol Inhaler', genericName: 'Salbutamol', form: 'INHALER' as DosageForm, defaultStrength: '90 mcg/actuation', defaultRoute: 'Inhalation' },
  { name: 'Insulin Glargine', genericName: 'Insulin Glargine', form: 'INJECTION' as DosageForm, defaultStrength: '100 units/mL', defaultRoute: 'Subcutaneous' },
  { name: 'Cetirizine', genericName: 'Cetirizine Hydrochloride', form: 'TABLET' as DosageForm, defaultStrength: '10 mg', defaultRoute: 'Oral' },
];

export class MedicationService {
  async ensureSeeded(): Promise<void> {
    const count = await prisma.medicationConcept.count();
    if (count === 0) {
      for (const med of INITIAL_MEDICATIONS) {
        await prisma.medicationConcept.create({
          data: {
            name: med.name,
            genericName: med.genericName,
            form: med.form,
            defaultStrength: med.defaultStrength,
            defaultRoute: med.defaultRoute,
            isCustom: false,
          },
        });
      }
    }
  }

  async search(query?: string, form?: DosageForm): Promise<MedicationConcept[]> {
    await this.ensureSeeded();

    const where: Record<string, unknown> = {};
    if (query && query.trim()) {
      where.OR = [
        { name: { contains: query.trim() } },
        { genericName: { contains: query.trim() } },
      ];
    }
    if (form) {
      where.form = form;
    }

    return prisma.medicationConcept.findMany({
      where,
      take: 50,
      orderBy: { name: 'asc' },
    });
  }

  async createCustom(data: {
    name: string;
    genericName?: string | null;
    form: DosageForm;
    defaultStrength?: string | null;
    defaultRoute?: string | null;
    code?: string | null;
  }): Promise<MedicationConcept> {
    return prisma.medicationConcept.create({
      data: {
        name: data.name.trim(),
        genericName: data.genericName?.trim() || null,
        form: data.form,
        defaultStrength: data.defaultStrength?.trim() || null,
        defaultRoute: data.defaultRoute?.trim() || null,
        code: data.code?.trim() || null,
        isCustom: true,
      },
    });
  }
}

export const medicationService = new MedicationService();
