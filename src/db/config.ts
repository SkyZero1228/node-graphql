import { IDocumentStore, DocumentStore, IndexFieldOptions } from 'ravendb';
import * as fs from 'fs';
import * as path from 'path';
import config from '../config';
import { Certificate } from 'crypto';
import models from './models';
import * as vars from '../../env/vars';
import { AppSettings, AppSettingsCountryList } from './models/AppSettings';
import Migrations from './migrations';
import moment = require('moment');
import { some } from 'lodash';
import { getAppSettings } from '../utils';

export async function initializeStore(): Promise<IDocumentStore> {
  const { DatabaseName, DatabaseUrl, pfxSecretKey, pfxName } = vars;

  let store: IDocumentStore;
  if (vars.DatabaseUrl.indexOf('localhost') < 0) {
    const certificate = path.resolve(`./env/${pfxName}`);

    console.log(`Certificate: ${pfxName}`);
    console.log(`DatabaseUrl: ${DatabaseUrl}`);
    console.log(`DatabaseName: ${DatabaseName}`);

    store = new DocumentStore(DatabaseUrl, DatabaseName, {
      certificate: fs.readFileSync(certificate),
      type: 'pfx',
      password: pfxSecretKey,
    });
  } else {
    console.log(`Running RavenDB via localhost...`);
    console.log(`DatabaseUrl: ${DatabaseUrl}`);
    console.log(`DatabaseName: ${DatabaseName}`);
    store = new DocumentStore(DatabaseUrl, DatabaseName);
  }

  store.conventions.storeDatesInUtc = true;

  store.conventions.registerEntityType(models.AppSettings);
  store.conventions.registerEntityType(models.Certificate);
  store.conventions.registerEntityType(models.ClickFunnelPurchase);
  store.conventions.registerEntityType(models.Conversion);
  store.conventions.registerEntityType(models.DumpBucket);
  store.conventions.registerEntityType(models.Exception);
  store.conventions.registerEntityType(models.FrequentlyAskedQuestion);
  store.conventions.registerEntityType(models.Prospect);
  store.conventions.registerEntityType(models.Reservation);
  store.conventions.registerEntityType(models.ReservationDeposit);
  store.conventions.registerEntityType(models.Trip);
  store.conventions.registerEntityType(models.User);
  store.conventions.registerEntityType(models.UserSubscription);
  store.conventions.registerEntityType(models.Video);

  store.conventions.registerEntityType(models.Product);
  store.conventions.registerEntityType(models.Funnel);
  store.conventions.registerEntityType(models.Lead);
  store.conventions.registerEntityType(models.LeadVisit);
  store.conventions.registerEntityType(models.Order);
  console.log('about to initialize');

  store.initialize();
  await migrate(store);
  console.log('Done with Migrations');

  return store;
}

export async function migrate(store: IDocumentStore): Promise<void> {
  console.log(`Checking For Migrations`);
  const session = store.openSession();
  const appSettings = await getAppSettings<AppSettings>(session, '1-A');
  if (appSettings) {
    if (!appSettings.migrations) appSettings.migrations = [];
    for (let migration of Object.keys(Migrations)) {
      try {
        const alreadyExecuted = some(appSettings.migrations, { migration });
        if (!alreadyExecuted) {
          console.log(`Executing Migration: ${migration}`);
          await Migrations[migration].up(store);
          appSettings.migrations.push({ executedOn: moment().toDate(), migration });
        }
      } catch (ex) {
        console.log(`Executing Migration: ${migration} Error > ${ex.message}`);
        await Migrations[migration].down(store);
      }
    }
    await session.saveChanges();
  }
}

export async function seed(store: IDocumentStore): Promise<void> {
  const session = store.openSession();
  // const initialized = await session.load('initialized');
  const initialized = false;

  if (initialized) {
    return;
  }

  let doh = await session.load('doh/1-A');
  const data = require('./seed/data.json');

  // seed collections
  Object.keys(data)
    .map(collection => data[collection])
    .forEach(async rows => {
      rows.map(async row => {
        await session.store(row);
      });
    });

  await session.saveChanges();
}
