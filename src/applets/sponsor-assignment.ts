const node_xj = require("xls-to-json");
import * as path from "path";
import { User } from "../db/models/User";
import { initializeStore } from "../db/config";
import { capitalizeEachFirstLetter, getNowUtc } from "../utils";
import { IUser, ISponsorAssignment } from "../interfaces/users";
// var Mailchimp = require('mailchimp-api-v3');
import { find, slice, chunk, uniqBy, uniq, filter } from "lodash";
import { PatchByQueryOperation } from "ravendb";
import {
  getIdWithoutCollection,
  getAncestorsWithCollection,
  getAncestorsAsArray,
  appendUserIdToAncestors,
  getAncestorLevelsUp,
  getDepthFromAncestors
} from "../helpers/user";
import { UserSubscription } from "../db/models/UserSubscription";
import moment = require("moment");
import coinMd from "../resolvers/Mutations/coinMd";
import { moveAffiliate } from "../helpers/sponsorAssignment";

var api_key = "...";
var example_list_id = "...";

// var mailchimp = new Mailchimp('219bb27c95c1805b4035cd54492a884b-us12');

(async () => {
  try {
    const store = await initializeStore();
    const session = store.openSession();
    try {
      const sponsorAssignment = await session
        .query<ISponsorAssignment>({ collection: "SponsorAssignments" })
        .whereEquals("status", "In Queue")
        .orderBy("createdAt")
        .firstOrNull();
      if (!sponsorAssignment) {
        console.log("sponsorAssignment");
        process.exit(0);
      }
      const affiliate = await session.load<IUser>(sponsorAssignment.affiliate.id);

      if (!affiliate) {
        console.log("affiliate");
        process.exit(0);
      }
      let newSponsor = null;
      let isNoSponsor = false;
      if (sponsorAssignment.newSponsor === null) {
        isNoSponsor = true;
      } else newSponsor = await session.load<IUser>(sponsorAssignment.newSponsor.id);

      if (!newSponsor) {
        console.log("newSponsor");
        process.exit(0);
      }

      const requestor = await session.load<IUser>(sponsorAssignment.requestor.id);

      if (!requestor) {
        process.exit(0);
      }

      // create a query
      console.log("ancestors", affiliate);
      const query = session
        .query({ indexName: "Users" })
        .whereStartsWith("ancestors", affiliate.ancestry.ancestors || getIdWithoutCollection(affiliate.id))
        .orderBy("createdAt");

      let users: IUser[] = [];
      let stats;
      const queryStream = await session.advanced.stream(query, _ => (stats = _));

      queryStream.on("data", user => {
        users.push(user.document);
      });

      // get stats using an event listener
      queryStream.once("stats", stats => {
        console.log("stats", stats);
      });

      queryStream.on("error", err => {
        // handle errors
        console.log("error", err);
      });

      queryStream.on("end", async err => {
        // handle errors
        console.log("end");
        moveAffiliate(affiliate, newSponsor, users, store, sponsorAssignment, isNoSponsor);
        process.exit(0);
      });
    } catch (ex) {
      console.log(ex.message);
      process.exit(1);
    }
  } catch (ex) {
    console.log(ex.message);
    process.exit(1);
  }
})();
