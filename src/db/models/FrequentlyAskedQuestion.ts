export interface IFrequentlyAskedQuestion {
  id?: string;
  question: string;
  answer: string;
}

export class FrequentlyAskedQuestion implements IFrequentlyAskedQuestion {
  constructor(public id?: string, public question: string = '', public answer: string = '') {}
}
