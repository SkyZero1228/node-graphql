import { Router, Response } from 'express';
import { CustomRequest } from '../utils';
import * as PDFDocument from 'pdfkit';
import * as certs from '../helpers/certificates';
import { findIndex } from 'lodash';

const SVGtoPDF = require('svg-to-pdfkit');
let routes = Router();

const CertificateIdTranslation = {
  '1-A': 'certificate1A',
  '3-A': 'certificate3A',
  '4-A': 'certificate4A',
  '5-A': 'certificate5A',
  '6-A': 'certificate6A',
  '34-A': 'certificate34A',
  '35-A': 'certificate35A',
  '36-A': 'certificate36A',
  '37-A': 'certificate37A',
  '38-A': 'certificate38A',
};

routes.get('/certificates/:id', async (req: CustomRequest, res: Response) => {
  var doc = new PDFDocument();
  res.statusCode = 200;
  res.setHeader('Content-type', 'application/pdf');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-disposition', 'attachment; filename=Untitled.pdf');
  console.log(req.params.id, CertificateIdTranslation[req.params.id]);
  const certificate = certs[CertificateIdTranslation[req.params.id]];
  console.log(certificate.certificateId);
  doc.image(certificate.base64, -2, 0, { fit: [640, 791] });

  SVGtoPDF(doc, certificate.svg, 25, 590, { width: 390, preserveAspectRatio: 'xMinYMin meet' });
  doc
    .text(`Referral Code: ${req.user.userName}`, 25, 740, {
      height: 10,
    })

    .text(`Certificate Code: ${req.params.id}`, 25, 760, {
      height: 10,
    })

    .text(`Go Redeem: http://redeem.tripvalet.com`, 25, 705, {
      height: 10,
    });

  doc.pipe(res);
  doc.end();
});

export default routes;
