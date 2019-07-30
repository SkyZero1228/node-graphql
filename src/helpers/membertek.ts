import * as fs from 'fs';
import * as path from 'path';
import { IUser } from '../interfaces/users';
import { IProspect } from '../interfaces/prospects';
import { User } from '../db/models/User';
import { ICertificate } from '../interfaces/certificates';
import * as gravatar from 'gravatar';
import * as moment from 'moment';
import { find } from 'lodash';

export function getTemplateHtml(prospect: IProspect, certificate: ICertificate, user: IUser): string {
  const filePath = path.resolve(`./EmailTemplates/ProspectInvitation.html`);

  var email = fs.readFileSync(filePath, { encoding: 'utf8' });
  let gravatarUrl = gravatar.url(user.email, { s: '80', d: 'mp' }, false);

  email = email
    .replace(/{{gravatarUrl}}/gi, gravatarUrl)
    .replace(/{{ gravatarUrl }}/gi, gravatarUrl)
    .replace(/{{ memberName }}/gi, `${user.firstName} ${user.lastName}`)
    .replace(/{{memberName}}/gi, `${user.firstName} ${user.lastName}`)
    .replace(/{{url}}/gi, `https://incentives.tripvalet.com/gift/${prospect.uuid}`)
    .replace(/{{message}}/gi, prospect.personalizedMessage)
    .replace(/{{ message }}/gi, prospect.personalizedMessage)
    .replace(/{{certImageUrl}}/gi, find(certificate.images, { type: 'Email', displayOrder: 1 }).url)
    .replace(/{{ certImageUrl }}/gi, find(certificate.images, { type: 'Email', displayOrder: 1 }).url)
    .replace(/{{title}}/gi, certificate.title)
    .replace(/{{ title }}/gi, certificate.title)
    .replace(/{{destinations}}/gi, certificate.destinations.toString())
    .replace(/{{ destinations }}/gi, certificate.destinations.toString())
    .replace(/{{year}}/gi, new Date().getFullYear().toString())
    .replace(/{{ year }}/gi, new Date().getFullYear().toString())
    .replace(/\t/gi, '')
    .replace(/\n/gi, '')
    .replace(/  /gi, '')
    .replace(
      /{{expires}}/gi,
      moment()
        .add(30, 'days')
        .format('MM/DD/YYYY')
    )
    .replace(
      /{{ expires }}/gi,
      moment()
        .add(30, 'days')
        .format('MM/DD/YYYY')
    );

  return email;
}
