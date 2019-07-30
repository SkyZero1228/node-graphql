import { IVideo } from '../../interfaces/videos';

export class Video implements IVideo {
  public createdAt?: Date;
  public updatedAt?: Date;
  constructor(public id?: string, public videoId: string = '', public title: string = '', public description: string = '', public tag: string = '', public displayOrder: number = 1, public category: string = '') {}
}
