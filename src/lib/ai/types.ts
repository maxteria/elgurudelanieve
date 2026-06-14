export type GuruMood =
  | 'excited'
  | 'confident'
  | 'cautious'
  | 'warning'
  | 'neutral';

export type GuruCertainty = 'alta' | 'media' | 'baja';

export type GuruSource = 'ai' | 'fallback';

export interface GuruNpcOutput {
  mood: GuruMood;
  certainty: GuruCertainty;
  message: string;
  tip: string | null;
  source: GuruSource;
}
