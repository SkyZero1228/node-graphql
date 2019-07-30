export interface IVideo {
  id?: string;
  videoId: string;
  title: string;
  description: string;
  displayOrder: number;
  category: string;
  tag: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface IVideoTag {
  tag: string;
  children: string[];
}

export interface IGetVideosArgs {
  category: string;
  tag: string;
}

export interface IAddVideoArgs {
  video: IVideo;
}

export interface IEditVideoArgs {
  id?: string;
  videoId: string;
  title: string;
  description: string;
  category: string;
  tag: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface IVideoAndTotalRows {
  videos: IVideo[];
  totalRows: number;
}

export interface IDeleteVideo {
  success: boolean;
  message: string;
}
