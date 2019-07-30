import { Context, verifyAccess } from '../../utils';
import Roles from '../../roles';
import * as CertificateInterfaces from '../../interfaces/certificates';
import { Certificate } from '../../db/models/Certificate';
import { filter } from 'lodash';
import { ICertificate } from '../../interfaces/certificates';

export default {
  async getCertificates(
    _parent,
    { skip, pageSize, membershipLevel }: CertificateInterfaces.IGetCertificates,
    { session, req }: Context
  ): Promise<Array<ICertificate>> {
    verifyAccess(req, [Roles.TVIPro, Roles.TVIPlus, Roles.TVIBasic]);
    return await session
      .query<Certificate>({ collection: 'Certificates' })
      .skip(skip ? skip : 0)
      .take(pageSize ? pageSize : 25)
      .whereIn('membershipLevel', membershipLevel ? [membershipLevel] : ['TVI PLUS', 'TVI PRO'])
      .andAlso()
      .whereEquals('active', true)
      .orderByDescending('displayOrder', 'Double')
      .all();
  },

  async getCertificatesForProspect(
    _parent,
    { searchTerm }: CertificateInterfaces.IGetCertificatesForProspect,
    { session, req }: Context
  ): Promise<Array<ICertificate>> {
    let certificates = session.query<Certificate>({ collection: 'Certificates' }).whereEquals('active', true);

    if (searchTerm) {
      certificates.search('title', `*${searchTerm}*`);
    }

    return await certificates.orderBy('displayOrder', 'Double').all();
  },

  async getCertificateDocuments(
    _parent,
    { type }: CertificateInterfaces.IGetDocuments,
    { session, req }: Context
  ): Promise<Array<ICertificate>> {
    verifyAccess(req, [Roles.TVIPro, Roles.TVIPlus, Roles.TVIBasic]);

    let certificates = await session
      .query<Certificate>({ collection: 'Certificates' })
      .whereEquals('active', true)
      .andAlso()
      .whereEquals('documents.type', type)
      .orderBy('displayOrder', 'Double')
      .all();

    const documents = certificates.map(cert => {
      if (type) {
        cert.documents = filter(cert.documents, { active: true, type: type });
        // console.log('cert.documents', JSON.stringify(cert.documents));
        return cert;
      } else return cert;
    });
    // console.log('documents', documents);
    return documents;
  },
};
