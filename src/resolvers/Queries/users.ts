import { Context, formatSearchTerm, verifyAccess } from '../../utils';
import { User, UserBasics, GenealogyItem, GenealogyItemPerson, SponsorAssignment, Address } from '../../db/models/User';
import Roles from '../../roles';
import * as UserInterfaces from '../../interfaces/users';
import { IAppSettings, AppSettings, IAppSettingsData } from '../../db/models/AppSettings';
import { QueryStatistics } from 'ravendb';
import { DumpBucket } from '../../db/models/DumpBucket';
import { rawRequest } from 'graphql-request';
import { remove, filter } from 'lodash';
import { appendUserIdToAncestors, getProductFromUserRoles, generateAffiliateLinks } from '../../helpers/user';
import { ILinks, IFunnel } from '../../interfaces/funnel';
import { Funnel } from '../../db/models/Funnel';
import * as Utils from '../../utils';
import { IAffiliateReference } from '../../interfaces/users';

export default {
  async me(_parent, _args, { session, req }: Context): Promise<UserInterfaces.IMe> {
    if (req.user) {
      const roleLevel = getProductFromUserRoles(req.user.roles, [Roles.TVIBasic, Roles.TVIPlus, Roles.TVIPro]);

      const threeForFree = await session
        .query<User>({ indexName: 'Users' })
        .whereEquals('sponsorId', req.user.id)
        .whereEquals('active', true)
        .whereIn('roles', [roleLevel])
        .count();

      const escapeBucks = await session
        .query<UserInterfaces.IEscapeBucksByUserId>({ indexName: 'TotalEscapeBucksByUserId' })
        .whereEquals('userId', req.user.id)
        .firstOrNull();

      const user = await session.load<User>(req.user.id);
      if (!user.address) {
        user.address = new Address('', '', '', '', 'United States');
        await session.saveChanges();
      }

      return { user, threeForFreeCount: threeForFree, escapeBucks: escapeBucks ? escapeBucks.bucks : 0 };
    } else return null;
  },

  async users(_parent, args: UserInterfaces.IUsersQuery, ctx: Context): Promise<UserInterfaces.IUserCount> {
    verifyAccess(ctx.req, [Roles.Administrator]);
    let user;
    let stats: QueryStatistics;
    let searchTerm = formatSearchTerm(args.searchText.split(' '));
    if (args.searchText) {
      user = await ctx.session
        .query<User>({ indexName: 'Users' })
        .statistics(s => (stats = s))
        .search('Query', searchTerm, 'AND')
        .orderBy('firstName')
        .take(args.pageSize)
        .skip(args.skip)
        .all();
    } else {
      user = await ctx.session
        .query<User>({ indexName: 'Users' })
        .statistics(s => (stats = s))
        .orderBy('firstName')
        .take(args.pageSize)
        .skip(args.skip)
        .all();
    }
    return { user, totalRows: stats.totalResults };
  },

  async userByResetToken(_parent, args, { session, req }: Context): Promise<UserInterfaces.IUser> {
    return await session
      .query<User>({ collection: 'Users' })
      .whereEquals('resetToken', args.resetToken)
      .firstOrNull();
  },

  async validatePasswordResetToken(_parent, args, { session, req }: Context): Promise<UserInterfaces.IUser> {
    return await session
      .query<User>({ collection: 'Users' })
      .whereEquals('resetToken', args.resetToken)
      .firstOrNull();
  },
  async getUserById(_parent, args, { session, req }: Context): Promise<UserInterfaces.UserAndRoles> {
    verifyAccess(req, [Roles.TVIPro, Roles.TVIPlus, Roles.TVIBasic, Roles.Administrator]);
    let user = await session.load<User>(args.id);
    let appSettings = <IAppSettingsData>(<unknown>await session.load<AppSettings>('AppSettings/Roles'));
    return { user, roles: appSettings.data };
  },

  async getUserByEmail(_parent, args, { session, req }: Context): Promise<Array<UserInterfaces.IUserBasics>> {
    return await session
      .query<User>({ indexName: 'Users' })
      .whereStartsWith('email', args.email)
      .selectFields(['id', 'firstName', 'lastName', 'email', 'uuid'])
      .ofType<UserBasics>(UserBasics)
      .all();
  },

  async getAffiliate(_parent, args, { session, req }: Context): Promise<UserInterfaces.IUserBasics> {
    // console.log('getAffiliate');
    // verifyAccess(req, [Roles.TVIPro, Roles.TVIPlus, Roles.TVIBasic, Roles.Administrator]);
    let url = req.headers['origin'] ? <string>req.headers['origin'] : <string>req.headers['referer'];
    if (!url) {
      const dumpBucket = new DumpBucket(null, null, {
        url: req.url,
        baseUrl: req.baseUrl,
        originalUrl: req.originalUrl,
        hostname: req.hostname,
        headers: req.headers,
      });
      await session.store(dumpBucket);
      await session.saveChanges();
      return null;
    }

    let match = /^(https?):\/\//;
    url = url.replace(match, '');
    let segments: string[] = url.split('.');
    remove(segments, segment => {
      return segment.toLowerCase() === 'www';
    });

    if (segments[0] === 'localhost:3000') segments[0] = 'troyzargerrrrrrrrr';
    let user = await session
      .query<User>({ indexName: 'Users' })
      .whereEquals('username', segments[0])
      .selectFields(['id', 'firstName', 'lastName', 'email', 'uuid'])
      .ofType<UserBasics>(UserBasics)
      .firstOrNull();

    const dumpBucket = new DumpBucket(null, null, {
      segments,
      username: segments[0],
      user,
    });
    await session.store(dumpBucket);
    await session.saveChanges();

    return user;
  },

  async getGenealogy(_parent, args, { session, req }: Context): Promise<UserInterfaces.IGenealogyItem> {
    verifyAccess(req, [Roles.TVIPro, Roles.TVIPlus, Roles.TVIBasic, Roles.Affiliate]);

    const user = await session.load<UserInterfaces.IUser>(req.user.id);

    let genealogy = new GenealogyItem(user.id, new GenealogyItemPerson(user.firstName, `${user.lastName} - YOU`, user.email), []);
    const userChildren = await session
      .query<User>({ indexName: 'Users' })
      .whereStartsWith('ancestors', appendUserIdToAncestors(user.id, user.ancestry.ancestors))
      .andAlso()
      .whereBetween('depth', user.ancestry.depth, user.ancestry.depth + 3)
      .selectFields(['id', 'firstName', 'lastName', 'email', 'sponsor.id', 'ancestry.depth', 'active'])
      // .ofType<GenealogyItem>(GenealogyItem)
      .all();
    const level1 = filter(userChildren, child => {
      return child['ancestry.depth'] === user.ancestry.depth + 1;
    });
    const level2 = filter(userChildren, child => {
      return child['ancestry.depth'] === user.ancestry.depth + 2;
    });

    level1.forEach(child => {
      let newChild = new GenealogyItem(
        child.id,
        new GenealogyItemPerson(child.firstName, `${child.lastName} - ${child.active ? 'Active' : 'Inactive'}`, child.email),
        []
      );
      const children = filter(level2, level2Child => {
        return level2Child['sponsor.id'] === child.id;
      });
      children.forEach(c => {
        newChild.children.push(
          new GenealogyItem(c.id, new GenealogyItemPerson(c.firstName, `${c.lastName} - ${c.active ? 'Active' : 'Inactive'}`, c.email), [])
        );
      });
      newChild.person.totalReports = newChild.children.length;
      genealogy.children.push(newChild);
    });
    genealogy.person.totalReports = genealogy.children.length;
    if (user.sponsor) {
      let sponsor = new GenealogyItem(
        user.sponsor.id,
        new GenealogyItemPerson(user.sponsor.firstName, `${user.sponsor.lastName} - YOUR SPONSOR`, user.sponsor.email),
        [genealogy]
      );
      return sponsor;
    } else {
      let noSponsor = new GenealogyItem('NoSponsorId', new GenealogyItemPerson('No', 'Sponsor', ''), [genealogy]);
      return noSponsor;
    }
  },

  async getAllLinks(_parent, args, ctx: Context): Promise<Array<ILinks>> {
    verifyAccess(ctx.req, [Roles.Administrator, Roles.Affiliate]);
    return await generateAffiliateLinks(ctx.req.user.id, ctx.session);
  },

  async getNewAffiliateUrl(_parent, args, { session, req }: Context): Promise<UserInterfaces.INewAffiliateUrl> {
    // verifyAccess(req, [Roles.TVIPro, Roles.TVIPlus, Roles.TVIBasic]);

    const user = await session
      .query<UserInterfaces.IUser>({ indexName: 'Users' })
      .search('clickFunnels', `*${args.path}* *${args.qs}*`)
      .firstOrNull();

    const funnel = await session
      .query<IFunnel>({ indexName: 'Funnels' })
      .whereIn('pastUrls', [args.path])
      .firstOrNull();

    if (funnel && user) {
      return {
        redirectUrl: `https://${user.username}.mytripvalet.com${funnel.funnelSteps[0].url}`.toLowerCase(),
      };
    } else {
      return { redirectUrl: 'https://www.mytripvalet.com' };
    }
  },

  async getAllSponsorAssignments(_parent, _args, { session, req }: Utils.Context): Promise<Array<UserInterfaces.ISponsorAssignment>> {
    verifyAccess(req, [Roles.Administrator]);
    return await session
      .query<SponsorAssignment>({ collection: 'SponsorAssignments' })
      .orderBy('createdAt')
      .all();
  },
  async getAffiliateBySearchText(_parent, args, { session, req }: Utils.Context): Promise<Array<UserInterfaces.IAffiliateReference>> {
    let searchTerm = formatSearchTerm(args.searchText.split(' '));
    return await session
      .query<IAffiliateReference>({ indexName: 'Users' })
      .selectFields(['id', 'firstName', 'lastName', 'email'])
      .search('Query', searchTerm, 'AND')
      .take(20)
      .skip(0)
      .all();
  },

  async getThreeForFreeCount(_parent, args, { session, req }: Utils.Context): Promise<number> {
    return await session
      .query<User>({ indexName: 'Users' })
      .whereEquals('sponsorId', req.user.id)
      .whereEquals('active', true)
      .count();
  },
};
