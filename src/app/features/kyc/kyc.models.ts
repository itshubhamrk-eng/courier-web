export type KycSubjectType = 'USER' | 'BRANCH' | 'CUSTOMER';
export type KycStatus = 'PENDING' | 'COMPLETE';
export type KycChannel = 'email' | 'mobile';
/** `me` = the signed-in user's own KYC, `branch` = their branch's (branch managers). */
export type KycScope = 'me' | 'branch';

export interface KycUploaded { id: string; fileName: string; contentType: string; sizeBytes: number; uploadedAt: string; }
export interface KycSlot { code: string; label: string; hint: string; required: boolean; uploaded: KycUploaded | null; }

export interface KycView {
  subjectType: KycSubjectType;
  subjectId: string;
  subjectName: string;
  status: KycStatus;
  email: string | null;
  emailVerified: boolean;
  mobile: string | null;
  mobileVerified: boolean;
  requiredUploaded: number;
  requiredTotal: number;
  documents: KycSlot[];
  completedAt: string | null;
}

export interface KycSummary {
  subjectType: KycSubjectType;
  subjectId: string;
  subjectName: string;
  status: KycStatus;
  emailVerified: boolean;
  mobileVerified: boolean;
  requiredUploaded: number;
  requiredTotal: number;
  updatedAt: string;
  completedAt: string | null;
}

export const KYC_TYPE_LABELS: Record<KycSubjectType, string> = { USER: 'Users', BRANCH: 'Branches', CUSTOMER: 'Business customers' };
