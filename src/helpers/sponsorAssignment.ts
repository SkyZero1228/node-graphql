import { IUser, ISponsorAssignment } from "../interfaces/users";
import { appendUserIdToAncestors } from "./user";
import { filter } from "lodash";
import { IDocumentStore } from "ravendb";
function fixChildren(users, sponsor) {
  console.log("sponsor", sponsor.id, sponsor.firstName, sponsor.lastName);
  const children = filter(users, user => {
    //Skip Affiliate itself
    if (user.sponsor === null || user.id === sponsor.id) return false;
    return user.sponsor.id === sponsor.id;
  });
  console.log("children", children.length);
  const length = children.length;
  let i = 0;
  //No Sponsor
  if (sponsor.sponsor === null) {
    for (i = 0; i < length; i++) {
      const user = children[i];
      if (user.sponsor !== null)
        console.log("*BEFORE* depth and ancestors: ", user.ancestry.depth, user.ancestry.ancestors, user.sponsor.email);
      user.ancestry.ancestors = "";
      user.ancestry.depth = 1;
      user.ancestry.parentUserId = "";
      user.sponsor = null;
      console.log("*AFTER* depth and ancestors: ", user.ancestry.depth, user.ancestry.ancestors, user.sponsor);
      fixChildren(users, user);
    }
  } else {
    for (i = 0; i < length; i++) {
      const user = children[i];
      console.log("*BEFORE* depth and ancestors: ", user.ancestry.depth, user.ancestry.ancestors, user.sponsor.email);
      user.ancestry.ancestors = appendUserIdToAncestors(sponsor.id, sponsor.ancestry.ancestors);
      user.ancestry.depth = sponsor.ancestry.depth + 1;
      user.ancestry.parentUserId = sponsor.id;
      user.sponsor.id = sponsor.id;
      user.sponsor.email = sponsor.email;
      user.sponsor.firstName = sponsor.firstName;
      user.sponsor.lastName = sponsor.lastName;
      console.log("*AFTER* depth and ancestors: ", user.ancestry.depth, user.ancestry.ancestors, user.sponsor.email);
      fixChildren(users, user);
    }
  }
}
export async function moveAffiliate(
  affiliate: IUser,
  newSponsor: IUser,
  users: IUser[],
  store: IDocumentStore,
  sponsorAssignment: ISponsorAssignment,
  isNoSponsor: Boolean = false
): Promise<void> {
  //No Sponsor
  if (isNoSponsor === true) {
    affiliate.ancestry.ancestors = "";
    affiliate.ancestry.depth = 1;
    affiliate.ancestry.parentUserId = "";
    affiliate.sponsor = null;
    fixChildren(users, affiliate);
  } else {
    affiliate.ancestry.ancestors = appendUserIdToAncestors(newSponsor.id, newSponsor.ancestry.ancestors);
    affiliate.ancestry.depth = newSponsor.ancestry.depth + 1;
    affiliate.ancestry.parentUserId = newSponsor.id;
    affiliate.sponsor = { id: newSponsor.id, email: newSponsor.email, firstName: newSponsor.firstName, lastName: newSponsor.lastName };
    fixChildren(users, affiliate);
  }

  console.log("for/of done");
  console.log("Starting to tryBulkUpdate", users.length);
  const tryBulkUpdate = store.bulkInsert();
  for (const user of users) {
    await tryBulkUpdate.store(user, user.id);
  }
  console.log("Wrapping Up tryBulkUpdate", users.length);
  //setting task as done
  sponsorAssignment.status = "Done";
  await tryBulkUpdate.store(sponsorAssignment);
  await tryBulkUpdate.finish();
}
