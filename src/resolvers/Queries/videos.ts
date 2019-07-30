import { Context, verifyAccess } from '../../utils';
import * as VideoInterfaces from '../../interfaces/videos';
import { Video } from '../../db/models/Video';
import { QueryStatistics } from 'ravendb';
import Roles from '../../roles';

interface IVideoCategory {
  category: string;
}

class VideoCategory implements IVideoCategory {
  constructor(public category: string) {}
}

export default {
  async getVideos(_parent, { category, tag }: VideoInterfaces.IGetVideosArgs, { session, req }: Context): Promise<Video[]> {
    verifyAccess(req, [Roles.TVIPro, Roles.TVIPlus, Roles.TVIBasic]);
    return await session
      .query<Video>({ collection: 'Videos' })
      .whereEquals('category', category)
      .whereEquals('tag', tag)
      .all();
  },

  async getAllVideos(_parent, args, ctx: Context): Promise<VideoInterfaces.IVideoAndTotalRows> {
    verifyAccess(ctx.req, [Roles.TVIPro, Roles.TVIPlus, Roles.TVIBasic]);
    let stats: QueryStatistics;
    let videos = await ctx.session
      .query<Video>({ indexName: 'Videos/Search' })
      .statistics(s => (stats = s))
      .take(args.pageSize)
      .skip(args.skip)
      .all();

    return { videos, totalRows: stats.totalResults };
  },

  async getAllVideoCategories(_parent, args, ctx: Context): Promise<any[]> {
    // verifyAccess(ctx.req, [Roles.Administrator, Roles.Corporate]);
    let categories = await ctx.session
      .query<Video>({ collection: 'Videos' })
      .selectFields('category')
      .distinct()
      .all();
    return categories;
  },

  async getAllVideoTagsByCategory(_parent, args, ctx: Context): Promise<any[]> {
    // verifyAccess(ctx.req, [Roles.Administrator, Roles.Corporate]);
    let tags = await ctx.session
      .query<Video>({ collection: 'Videos' })
      .whereEquals('category', args.category)
      .selectFields('tag')
      .distinct()
      .all();
    return tags;
  },

  async getVideoById(_parent, args, ctx: Context): Promise<Video> {
    verifyAccess(ctx.req, [Roles.TVIPro, Roles.TVIPlus, Roles.TVIBasic]);
    return await ctx.session.load<Video>(args.id);
  },
};
