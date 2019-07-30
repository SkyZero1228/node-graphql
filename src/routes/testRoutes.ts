import { Router, Request, Response } from 'express';
import * as sgMail from '@sendgrid/mail';
import * as path from 'path';

import { sendInvitation, sendTripValetIncentivesWelcome, sendBitcoinTransactionAlert } from '../utils';
import { sorGetMemberByEmail, SorClubs } from '../helpers/sor';
import { CustomRequest } from '../utils';
import { processZapier, ClickFunnelsZapier } from '../helpers/zapier';
import { ISorMember } from '../interfaces/sor';
import * as vars from '../../env/vars';
import * as xlsxj from 'xlsx-to-json';
import { pathMatch } from 'tough-cookie';
import { User } from '../db/models/User';
import { AwaitableMaintenanceOperation } from 'ravendb';
import { requestCertificate } from '../helpers/sfx';
import { get } from 'http';
import { find } from 'lodash';
import { v1, v4 } from 'uuid';
import { Funnel, FunnelReference, FunnelStepReference } from '../db/models/Funnel';
import { IFunnelStep } from '../interfaces/funnel';
import { Lead, LeadVisit } from '../db/models/Lead';
import { DomainReference } from '../db/models/Domain';
import * as LeadInterface from '../interfaces/lead';

let routes = Router();

routes
  .get('/test/', async (req: CustomRequest, res: Response) => {
    const session = req.db.openSession();
    let certificates = session.query({ collection: 'Products' }).whereEquals('active', true);

    certificates.search('title', `*las*`);

    const result = await certificates.all();
    res.json(result);
  })
  .post('/test/send-invitation', (req, res) => {
    try {
      // const { data } = req.body;
      const data = {
        email: 'troy.zarger@wonder7global.com',
        type: 'VIP',
        event: {
          title: 'LA Influencer Bootcamp',
        },
      };
      sgMail.setApiKey(vars.SendgridApiKey);

      let fileName = '';
      switch (data.type) {
        case 'VIP':
          fileName = 'VIPInfluencerWelcomeEmail';
          break;
        case 'Regular':
          fileName = 'InfluencerWelcomeEmail';
          break;
        default:
          // 'Streaming'
          fileName = 'LiveStreamWelcomeEmail';
          break;
      }

      var fs = require('fs');
      var path = process.cwd();
      var email = fs.readFileSync(`${path}//static//emails//${fileName}.txt`);

      const msg = {
        to: data.email,
        bcc: ['troy.zarger@tripvalet.com', 'jimmy@tripvalet.com', 'julia@tripvalet.com'],
        //bcc: ['troy.zarger@tripvalet.com'],
        from: { email: 'julia@tripvalet.com', name: 'TripValet Registrations' },
        subject: `TripValet Registration: ${data.event.title}`,
        // text: 'and easy to do anywhere, even with Node.js',
        html: email.toString('utf8'),
      };
      sgMail.send(msg);
      return res.json({ success: true });
    } catch (ex) {
      return res.json({ success: false, err: ex.message });
    }
  })
  .get('/test/send-invitation', (req, res) => {
    return res.json(
      sendInvitation(
        {
          firstName: 'Troy',
          lastName: 'Zarger',
          email: 'troy.zarger@tripvalet.com',
        },
        {
          title: '2 Night Hotel Stay',
          destinations: '50',
        },
        {
          firstName: 'Troy',
          lastName: 'Zarger',
          username: 'troyzarger',
          email: 'troy.zarger@tripvalet.com',
        }
      )
    );
  })
  .post('/zap/tvi/purchase', async (req: CustomRequest, res: Response) => {
    const session = req.db.openSession();
    const dump = await processZapier(session, req.body);
    res.sendStatus(200);
  })
  .get('/test/json/parse', (req, res) => {
    // let pString =
    //   "[{u'billing_integration': u'stripe_account-13944', u'ontraport_invoice_id': None, u'name': u'TVI - VIP', u'bump': False, u'updated_at': u'2018-07-10T16:47:12.000Z', u'braintree_cancel_after_payments': None, u'infusionsoft_subscription_id': None, u'ontraport_unit': None, u'braintree_plan': None, u'thank_you_page_id': 28601630, u'statement_descriptor': u'TVI - VIP', u'ontraport_payment_type': None, u'stripe_cancel_after_payments': 50000000, u'ontraport_product_id': None, u'commissionable': True, u'ontraport_payment_count': None, u'cart_product_id': u'', u'created_at': u'2018-07-10T16:47:12.000Z', u'ontraport_gateway_id': None, u'id': 1459595, u'amount': {u'currency': {u'iso_numeric': u'840', u'html_entity': u'$', u'name': u'United States Dollar', u'alternate_symbols': [u'US$'], u'subunit_to_unit': 100, u'symbol_first': True, u'thousands_separator': u',', u'decimal_mark': u'.', u'priority': 1, u'disambiguate_symbol': None, u'id': u'usd', u'smallest_denomination': 1, u'iso_code': u'USD', u'subunit': u'Cent', u'symbol': u'$'}, u'bank': {u'rounding_method': None, u'last_updated': u'2018-07-12T18:08:52.404+00:00', u'rates_updated_at': u'2018-07-12T00:00:00.000+00:00', u'mutex': {}, u'rates': {u'EUR_TO_IDR': u'16766.54', u'EUR_TO_HUF': u'325.28', u'EUR_TO_PHP': u'62.378', u'EUR_TO_RUB': u'72.4169', u'EUR_TO_CZK': u'25.938', u'EUR_TO_MYR': u'4.7089', u'EUR_TO_ZAR': u'15.6488', u'EUR_TO_PLN': u'4.3272', u'EUR_TO_TRY': u'5.6364', u'EUR_TO_ILS': u'4.2559', u'EUR_TO_JPY': u'131.13', u'EUR_TO_KRW': u'1312.52', u'EUR_TO_INR': u'79.8805', u'EUR_TO_ISK': u'125.4', u'EUR_TO_RON': u'4.6588', u'EUR_TO_NZD': u'1.724', u'EUR_TO_BGN': u'1.9558', u'EUR_TO_BRL': u'4.5049', u'EUR_TO_THB': u'38.775', u'EUR_TO_HKD': u'9.1494', u'EUR_TO_MXN': u'22.0857', u'EUR_TO_GBP': u'0.88263', u'EUR_TO_CAD': u'1.5369', u'EUR_TO_NOK': u'9.4443', u'EUR_TO_HRK': u'7.3975', u'EUR_TO_SGD': u'1.5889', u'EUR_TO_SEK': u'10.335', u'EUR_TO_AUD': u'1.5778', u'EUR_TO_USD': u'1.1658', u'EUR_TO_CHF': u'1.1642', u'EUR_TO_DKK': u'7.4554', u'EUR_TO_CNY': u'7.778', u'EUR_TO_EUR': 1}}, u'fractional': u'0.0'}, u'stripe_plan': u'plan_DCob1bM2Ue8qMH', u'amount_currency': u'USD', u'subject': u'Thank you for your purchase', u'infusionsoft_product_id': None, u'html_body': u'<p>Thank you for your purchase</p><p>You may access your Thank You Page here anytime:</p><p>#PRODUCT_THANK_YOU_PAGE#</p>'}]";
    // pString = pString.replace(new RegExp("u'", 'g'), '"');
    // pString = pString.replace(new RegExp("':", 'g'), '":');
    // pString = pString.replace(new RegExp("',", 'g'), '",');
    // pString = pString.replace(new RegExp('False', 'g'), 'false');
    // pString = pString.replace(new RegExp('True', 'g'), 'true');
    // pString = pString.replace(new RegExp('None,', 'g'), 'null,');
    // pString = pString.replace(new RegExp("'],", 'g'), '"],');
    // pString = pString.replace(new RegExp("'}", 'g'), '"}');

    const payload = {
      stripe_customer_token: 'tok_1CnB3zBoNKcVzRvkKP2YIvkX',
      updated_at: '2018-07-12T20:06:55.000Z',
      oap_customer_id: '',
      ctransreceipt: '',
      fulfillment_id: '',
      taxamo_amount: '',
      id: '26968392',
      nmi_customer_vault_id: '',
      original_amount_currency: 'USD',
      contact: {
        aff_sub: '',
        last_name: 'Ezzell ',
        ip: '75.87.134.106',
        updated_at: '2018-07-12T20:06:55.000Z',
        vat_number: 'abcd1234',
        additional_info: {
          purchase: {
            stripe_customer_token: 'tok_1CnB3zBoNKcVzRvkKP2YIvkX',
            taxamo_transaction_key: '',
            product_ids: "[u'1459595']",
            payment_method_nonce: '',
          },
          utm_campaign: '',
          utm_content: '',
          utm_term: '',
          webinar_delay: '-63698624085385',
          time_zone: 'Central Time (US & Canada)',
          utm_source: '',
          cf_affiliate_id: '',
          utm_medium: '',
          cf_uvid: 'null',
        },
        city: 'Shawnee',
        first_name: 'Jimmy ',
        zip: '66226',
        cart_affiliate_id: '',
        id: '604206476',
        contact_profile: {
          last_name: 'Ezzell ',
          known_ltv: '0.00',
          age_range_upper: '',
          location_general: '',
          vat_number: 'abcd1234',
          id: '288650707',
          city: 'Shawnee',
          age_range_lower: '',
          middle_name: '',
          zip: '66226',
          normalized_location: '',
          state: 'KS',
          email: 'jimmy@tripvalet.com',
          cf_uvid: 'afb1205650cd519de7bae44e4b04b222',
          deduced_location: '',
          shipping_city: '',
          tags: '[]',
          shipping_address: '',
          unsubscribed_at: '',
          first_name: 'Jimmy ',
          updated_at: '2018-07-12T20:06:55.000Z',
          phone: '9132072264',
          shipping_state: '',
          address: '5423 Noble St',
          shipping_zip: '',
          gender: '',
          age: '',
          action_score: '25',
          websites: '',
          shipping_country: '',
          country: 'United States',
          created_at: '2018-05-31T16:26:39.000Z',
        },
        state: 'KS',
        page_id: '21828918',
        email: 'jimmy@tripvalet.com',
        cf_uvid: 'null',
        shipping_city: '',
        webinar_ext: 'KrYrUm6o',
        unsubscribed_at: '',
        phone: '9132072264',
        cf_affiliate_id: '',
        shipping_state: '',
        address: '5423 Noble St',
        webinar_at: '',
        affiliate_id: '1163040',
        funnel_id: '4769038',
        name: 'Jimmy Ezzell',
        shipping_zip: '',
        country: 'United States',
        created_at: '2018-07-12T20:06:55.000Z',
        time_zone: 'Central Time (US & Canada)',
        shipping_country: '',
        webinar_last_time: '',
        aff_sub2: '',
        shipping_address: '',
        funnel_step_id: '28564254',
      },
      infusionsoft_ccid: '',
      subscription_id: 'sub_DDcIG8x1DFzyUe',
      original_amount: {
        currency: {
          priority: '1',
          html_entity: '$',
          name: 'United States Dollar',
          alternate_symbols: "[u'US$']",
          subunit_to_unit: '100',
          symbol_first: 'True',
          symbol: '$',
          thousands_separator: ',',
          decimal_mark: '.',
          iso_numeric: '840',
          disambiguate_symbol: '',
          smallest_denomination: '1',
          iso_code: 'USD',
          subunit: 'Cent',
          id: 'usd',
        },
        bank: {
          rates: {
            EUR_TO_IDR: '16766.54',
            EUR_TO_HUF: '325.28',
            EUR_TO_PHP: '62.378',
            EUR_TO_RUB: '72.4169',
            EUR_TO_CZK: '25.938',
            EUR_TO_MYR: '4.7089',
            EUR_TO_ZAR: '15.6488',
            EUR_TO_PLN: '4.3272',
            EUR_TO_TRY: '5.6364',
            EUR_TO_ILS: '4.2559',
            EUR_TO_JPY: '131.13',
            EUR_TO_KRW: '1312.52',
            EUR_TO_INR: '79.8805',
            EUR_TO_ISK: '125.4',
            EUR_TO_RON: '4.6588',
            EUR_TO_NZD: '1.724',
            EUR_TO_BGN: '1.9558',
            EUR_TO_BRL: '4.5049',
            EUR_TO_THB: '38.775',
            EUR_TO_HKD: '9.1494',
            EUR_TO_MXN: '22.0857',
            EUR_TO_GBP: '0.88263',
            EUR_TO_CAD: '1.5369',
            EUR_TO_NOK: '9.4443',
            EUR_TO_HRK: '7.3975',
            EUR_TO_SGD: '1.5889',
            EUR_TO_SEK: '10.335',
            EUR_TO_AUD: '1.5778',
            EUR_TO_USD: '1.1658',
            EUR_TO_CHF: '1.1642',
            EUR_TO_DKK: '7.4554',
            EUR_TO_CNY: '7.778',
            EUR_TO_EUR: '1',
          },
          rates_updated_at: '2018-07-12T00:00:00.000+00:00',
          last_updated: '2018-07-12T18:08:52.404+00:00',
          rounding_method: '',
        },
        fractional: '9700.0',
      },
      taxamo_tax_rate: '0',
      original_amount_cents: '9700',
      status: 'paid',
      charge_id: '',
      payment_instrument_type: '',
      braintree_customer_id: '',
      funnel_id: '4769038',
      created_at: '2018-07-12T20:06:55.000Z',
      error_message: '',
      manual: 'False',
      fulfillment_status: '',
      payments_count: '1',
      products:
        "[{u'billing_integration': u'stripe_account-13944', u'ontraport_invoice_id': None, u'name': u'TVI - VIP', u'bump': False, u'updated_at': u'2018-07-10T16:47:12.000Z', u'braintree_cancel_after_payments': None, u'infusionsoft_subscription_id': None, u'ontraport_unit': None, u'braintree_plan': None, u'thank_you_page_id': 28601630, u'id': 1459595, u'ontraport_payment_type': None, u'subject': u'Thank you for your purchase', u'ontraport_product_id': None, u'commissionable': True, u'ontraport_payment_count': None, u'cart_product_id': u'', u'created_at': u'2018-07-10T16:47:12.000Z', u'ontraport_gateway_id': None, u'statement_descriptor': u'TVI - VIP', u'amount': {u'currency': {u'priority': 1, u'html_entity': u'$', u'name': u'United States Dollar', u'alternate_symbols': [u'US$'], u'subunit_to_unit': 100, u'symbol_first': True, u'symbol': u'$', u'thousands_separator': u',', u'decimal_mark': u'.', u'iso_numeric': u'840', u'disambiguate_symbol': None, u'smallest_denomination': 1, u'iso_code': u'USD', u'subunit': u'Cent', u'id': u'usd'}, u'bank': {u'mutex': {}, u'rates_updated_at': u'2018-07-12T00:00:00.000+00:00', u'last_updated': u'2018-07-12T18:08:52.404+00:00', u'rates': {u'EUR_TO_IDR': u'16766.54', u'EUR_TO_HUF': u'325.28', u'EUR_TO_PHP': u'62.378', u'EUR_TO_RUB': u'72.4169', u'EUR_TO_CZK': u'25.938', u'EUR_TO_MYR': u'4.7089', u'EUR_TO_ZAR': u'15.6488', u'EUR_TO_PLN': u'4.3272', u'EUR_TO_TRY': u'5.6364', u'EUR_TO_ILS': u'4.2559', u'EUR_TO_ISK': u'125.4', u'EUR_TO_KRW': u'1312.52', u'EUR_TO_INR': u'79.8805', u'EUR_TO_JPY': u'131.13', u'EUR_TO_RON': u'4.6588', u'EUR_TO_NZD': u'1.724', u'EUR_TO_BGN': u'1.9558', u'EUR_TO_BRL': u'4.5049', u'EUR_TO_THB': u'38.775', u'EUR_TO_HKD': u'9.1494', u'EUR_TO_MXN': u'22.0857', u'EUR_TO_GBP': u'0.88263', u'EUR_TO_CAD': u'1.5369', u'EUR_TO_NOK': u'9.4443', u'EUR_TO_HRK': u'7.3975', u'EUR_TO_SGD': u'1.5889', u'EUR_TO_SEK': u'10.335', u'EUR_TO_AUD': u'1.5778', u'EUR_TO_USD': u'1.1658', u'EUR_TO_CHF': u'1.1642', u'EUR_TO_DKK': u'7.4554', u'EUR_TO_EUR': 1, u'EUR_TO_CNY': u'7.778'}, u'rounding_method': None}, u'fractional': u'0.0'}, u'stripe_plan': u'plan_DCob1bM2Ue8qMH', u'amount_currency': u'USD', u'stripe_cancel_after_payments': 50000000, u'infusionsoft_product_id': None, u'html_body': u'<p>Thank you for your purchase</p><p>You may access your Thank You Page here anytime:</p><p>#PRODUCT_THANK_YOU_PAGE#</p>'}]",
      member_id: '',
    };

    let productsParsed: ClickFunnelsZapier.Products[] = JSON.parse(
      payload.products
        .replace(new RegExp("u'", 'g'), '"')
        .replace(new RegExp("':", 'g'), '":')
        .replace(new RegExp("',", 'g'), '",')
        .replace(new RegExp('False', 'g'), 'false')
        .replace(new RegExp('True', 'g'), 'true')
        .replace(new RegExp(': None', 'g'), ': "None"')
        // .replace(new RegExp('None,', 'g'), 'null,')
        // .replace(new RegExp('None}', 'g'), 'null,')
        .replace(new RegExp("'],", 'g'), '"],')
        .replace(new RegExp("'}", 'g'), '"}')
    );
    const parsedData = {
      ...payload,
      products: productsParsed,
    };

    console.log('pString', parsedData, JSON.stringify(parsedData));
    res.json(parsedData);
  })
  .get('/test/get/sor/member/by/email/:email', async (req, res) => {
    res.json(await sorGetMemberByEmail(SorClubs.TripValetVip.apiCredentials, req.params.email));
  })
  .get('/test/bitcoin/transaction/alert', async (req: CustomRequest, res) => {
    const session = req.db.openSession();
    const user = await session.load<User>('users/183425-A');
    const memberlevel = 'Annual - $997/year';
    await sendBitcoinTransactionAlert(user, memberlevel);
    res.json({ success: true });
  })
  .post('/test/get/cert', async (req, res) => {
    try {
      res.json(await requestCertificate(req.body));
    } catch (ex) {
      res.json({ message: ex.message });
    }
  })
  .get('/test/coinmd/welcome/email', async (req: CustomRequest, res) => {
    const session = req.db.openSession();
    const user = await session.load<User>('Users/1-A');
    // user.roles.push('CoinMD Member');
    session.advanced.evict(user);
    await sendTripValetIncentivesWelcome(user, 'test', session);
    res.sendStatus(200);
  })
  .post('/test/raven', async (req: CustomRequest, res) => {
    const session = req.db.openSession();
    const user = await session.load<User>(req.body.aid);

    const funnel = await session.load<Funnel>(req.body.fid);
    if (!funnel) return null;
    const funnelStep: IFunnelStep = find<IFunnelStep>(funnel.funnelSteps, (step: IFunnelStep) => {
      return step.stepOrder === req.body.step;
    });

    let lead: LeadInterface.ILead;
    if (req.body.luid) {
      lead = await session
        .query<Lead>({ indexName: 'Leads' })
        .whereEquals('uuid', req.body.luid)
        .firstOrNull();
    }

    if (!lead) {
      lead = new Lead(
        new FunnelReference(funnel.id, funnel.title),
        new FunnelStepReference(funnelStep.stepOrder, funnelStep.url),
        new DomainReference(funnel.domain.id, funnel.domain.tld),
        <string>req.headers['x-forwarded-for'],
        v4(),
        req.body.email,
        null,
        user ? user.id : null
      );
      await session.store(lead);
    }

    lead.email = req.body.email;

    const visit = new LeadVisit(
      lead.id,
      new FunnelReference(funnel.id, funnel.title),
      new FunnelStepReference(funnelStep.stepOrder, funnelStep.url),
      new DomainReference(funnel.domain.id, funnel.domain.tld),
      req.ip,
      user ? user.id : null
    );
    await session.store(visit);
    await session.saveChanges();

    res.json({ next: funnelStep.nextFunnelStepUrl });
  })
  .get('/test/coinmd/parse', (req, res) => {
    let users = [];
    try {
      xlsxj(
        {
          input: path.resolve('./env/NetQube Data Dump v5.xlsx'),
          output: path.resolve('./env/users.json'),
          sheet: 'NetQube Data Dump',
        },
        function(err, result) {
          if (err) {
            console.error(err);
            return res.sendStatus(404);
          } else {
            console.log(result.length, result[0]);
            return res.sendStatus(200);
          }
        }
      );
    } catch (ex) {
      console.log(ex.message);
      return res.sendStatus(500);
    }
  })
  .get('/test/coinmd/parse/2', async (req: CustomRequest, res) => {
    let users = [];
    try {
      const node_xj = require('xls-to-json');
      node_xj(
        {
          input: path.resolve('./env/NetQube Data Dump v5.xlsx'),
          output: null, //path.resolve('./env/users.json'),
          sheet: 'NetQube Data Dump',
        },
        async function(err, result) {
          if (err) {
            console.error(err);
            return res.sendStatus(500);
          } else {
            let users = [];
            // const session = req.db.openSession();
            // const user = new User(null, 'test', 'test', 'test', 'test@example.com', 'abcd1234', true, [], null, true, '123-123-1234', ['TVI PLUS', 'TV Plus'], null, null, null);
            // await session.store(user);
            // await session.saveChanges();

            // const session = req.db.openSession();
            console.log(result.length, result[0]);
            for (let coin of result) {
              users.push(
                new User(
                  null,
                  v1(),
                  coin.FirstName,
                  coin.LastName,
                  coin.Username,
                  coin['Email Address'],
                  'abcd1234',
                  true,
                  [],
                  [],
                  null,
                  true,
                  coin['Phone Number'],
                  ['TVI PLUS', 'TV Plus'],
                  null,
                  null,
                  null
                )
              );
            }
            console.log('user.length', users.length);
            const bulkInsert = req.db.bulkInsert();
            for (let user of users) {
              await bulkInsert.store(user);
            }
            console.log('wrapping up', users.length);
            await bulkInsert.finish();
            return res.sendStatus(200);
          }
        }
      );
      // xlsxj(
      //   {
      //     input: path.resolve('./env/NetQube Data Dump v5.xlsx'),
      //     output: path.resolve('./env/users.json'),
      //     sheet: 'NetQube Data Dump',
      //   },
      //   function(err, result) {
      //     if (err) {
      //       console.error(err);
      //       return res.sendStatus(404);
      //     } else {
      //       console.log(result.length, result[0]);
      //       return res.sendStatus(200);
      //     }
      //   }
      // );
    } catch (ex) {
      console.log(ex.message);
      return res.sendStatus(500);
    }
  });

export default routes;
