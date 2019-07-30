import { Context, verifyAccess, getNowUtc } from '../../utils';
import { Video } from '../../db/models/Video';
import * as VideoInterfaces from '../../interfaces/videos';
import * as moment from 'moment';
import { createAndSendException } from '../../utils';
import Roles from '../../roles';

export default {
  async addVideo(_parent, args: VideoInterfaces.IAddVideoArgs, { session, req }: Context): Promise<VideoInterfaces.IVideo> {
    try {
      verifyAccess(req, [Roles.TVIPro, Roles.TVIPlus, Roles.TVIBasic]);
      const { video: videoInput } = args;
      const video = new Video(null, videoInput.videoId, videoInput.title, videoInput.description, videoInput.tag, videoInput.displayOrder, videoInput.category);
      video.createdAt = getNowUtc();
      video.updatedAt = getNowUtc();
      await session.store(video);
      await session.saveChanges();
      return video;
    } catch (ex) {
      await session.store(await createAndSendException(null, new Error(ex.message).stack, ex.message, args));
      await session.saveChanges();
      throw new Error('There was an error. Please try again. The Tech Team has been notified.');
    }
  },

  async editVideo(_parent, args: VideoInterfaces.IEditVideoArgs, { session, req }: Context): Promise<VideoInterfaces.IVideo> {
    verifyAccess(req, [Roles.TVIPro, Roles.TVIPlus, Roles.TVIBasic]);
    try {
      let video = await session.load<Video>(args.id);

      if (!video) {
        return null;
      }

      video = Object.assign(video, { ...args, updatedAt: getNowUtc() });
      await session.saveChanges();
      return video;
    } catch (ex) {
      await session.store(await createAndSendException(null, new Error(ex.message).stack, ex.message, args));
      await session.saveChanges();
      throw new Error('There was an error. Please try again. The Tech team has been notified.');
    }
  },

  async removeVideo(_parent, args, { session, req, store }: Context): Promise<VideoInterfaces.IDeleteVideo> {
    try {
      verifyAccess(req, [Roles.Administrator]);
      await session.delete(args.videoId);
      await session.saveChanges();

      return { success: true, message: 'deleted' };
    } catch (e) {
      // console.log(e);
      return { success: false, message: e };
    }
  },
};
