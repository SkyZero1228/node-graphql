import { GraphQLScalarType } from 'graphql';
import { Kind } from 'graphql/language';
import * as moment from 'moment-timezone';
import { DateTime } from 'luxon';

export const dateResolver = {
  Date: new GraphQLScalarType({
    name: 'Date',
    description: 'Date custom scalar type',
    parseValue(value: any): Date {
      let utc: Date;
      if (value instanceof Date) {
        utc = DateTime.fromJSDate(value)
          .toUTC(-value.getTimezoneOffset())
          .toJSDate();
      } else {
        const dateValue = new Date(value);
        utc = DateTime.fromJSDate(dateValue)
          .toUTC(-dateValue.getTimezoneOffset())
          .toJSDate();
      }
      return utc;
    },
    serialize(value: Date): string {
      if (value === null) {
        return '';
      } else {
        try {
          const utc = DateTime.fromJSDate(value)
            .toUTC(-value.getTimezoneOffset())
            .toISO();
          return utc; // value sent to the client
        } catch (e) {
          const utc = DateTime.fromJSDate(value).toISO();
          return utc; // value sent to the client
        }
      }
    },
    parseLiteral(ast) {
      if (ast.kind === Kind.INT) {
        return parseInt(ast.value, 10); // ast value is always in string format
      }
      return null;
    },
  }),
  EpochDate: new GraphQLScalarType({
    name: 'Date',
    description: 'EpochDate custom scalar type',
    parseValue(value): moment.Moment {
      return moment(value); // value from the client
    },
    serialize(value: number): Date {
      return moment.unix(value).toDate(); // value sent to the client
    },
    parseLiteral(ast) {
      if (ast.kind === Kind.INT) {
        return parseInt(ast.value, 10); // ast value is always in string format
      }
      return null;
    },
  }),
};
