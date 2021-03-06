import { Injectable } from '@angular/core';
import { DataForUi, Currency } from 'app/api/models';
import * as moment from 'moment-mini-ts';
import { ApiConfiguration } from 'app/api/api-configuration';

import { environment } from 'environments/environment';
import { Messages } from 'app/messages/messages';
import { MatDateFormats } from '@angular/material';
import { BehaviorSubject } from 'rxjs';

import Big from 'big.js';
import { DataForUiHolder } from './data-for-ui-holder';
import { ObservableMedia } from '@angular/flex-layout';

/**
 * Names for week days or months, in several forms:
 * - long: Full name, such as 'December'
 * - short: 3-letter name, such as 'Dec'
 * - narrow: Single letter name, such as 'D'
 */
export type Names = {
  'long': string[],
  'short': string[],
  'narrow': string[]
};

/**
 * Holds a shared instance of DataForUi and knows how to format dates and numbers
 */
@Injectable()
export class FormatService {

  constructor(
    dataForUiHolder: DataForUiHolder,
    private apiConfiguration: ApiConfiguration,
    private messages: Messages,
    private media: ObservableMedia) {
    dataForUiHolder.subscribe(dataForUi => this.initialize(dataForUi));
    // If already loaded, initialize right away
    if (dataForUiHolder.dataForUi) {
      this.initialize(dataForUiHolder.dataForUi);
    }
  }

  dateFormat: string;
  timeFormat: string;
  groupingSeparator: string;
  decimalSeparator: string;
  dateParser: any;
  materialDateFormats = new BehaviorSubject<MatDateFormats>(null);

  private _dataForUi: DataForUi;
  private _monthNames: Names;
  private _dayNames: Names;

  get monthNames(): Names {
    if (this._monthNames == null) {
      this._monthNames = this.getNames(
        this.messages.monthsLong(),
        this.messages.monthsShort(),
        this.messages.monthsNarrow());
    }
    return this._monthNames;
  }

  get dayNames(): Names {
    if (this._dayNames == null) {
      this._dayNames = this.getNames(
        this.messages.daysLong(),
        this.messages.daysShort(),
        this.messages.daysNarrow());
    }
    return this._dayNames;
  }

  private getNames(long: string, short: string, narrow: string): Names {
    return {
      'long': long.split(','),
      'short': short.split(','),
      'narrow': narrow.split(',')
    };
  }

  initialize(dataForUi: DataForUi): void {
    if (dataForUi == null) {
      return;
    }
    // Cyclos uses Java format, such as dd/MM/yyyy. Moment uses all uppercase for those.
    this.dateFormat = (dataForUi.dateFormat || 'YYYY-MM-DD').toUpperCase();

    // The time format is consistent, except that we want uppercase AM/PM markers.
    this.timeFormat = (dataForUi.timeFormat || 'HH:mm').replace('a', 'A');
    this.groupingSeparator = dataForUi.groupingSeparator || ',';
    this.decimalSeparator = dataForUi.decimalSeparator || '.';

    this._dataForUi = dataForUi;

    this.materialDateFormats.next({
      parse: {
        dateInput: this.dateFormat
      },
      display: {
        dateInput: this.dateFormat,
        monthYearLabel: this.monthYearLabel,
        dateA11yLabel: this.dateFormat,
        monthYearA11yLabel: this.monthYearLabel
      }
    });

  }

  private get monthYearLabel(): string {
    const match = /\w+(.).+/.exec(this.dateFormat);
    if (!match) {
      return this.dateFormat;
    }
    const sep = match[1];
    // Remove the day part
    let fmt = this.dateFormat.replace('DD', '').replace(sep + sep, sep);
    if (fmt.startsWith(sep)) {
      fmt = fmt.substr(1);
    }
    return fmt;
  }

  /**
   * Returns the application title
   */
  public get appTitle(): string {
    return this.media.isActive('xs') ? environment.appTitleSmall : environment.appTitle;
  }

  /**
   * Returns the application title used inside the menu on small devices
   */
  public get appTitleMenu(): string {
    return environment.appTitleMenu || this.appTitle;
  }

  /**
   * Returns the full URL to the configuration image (logo) with the given id
   */
  getLogoUrl(id: string): string {
    return this.apiConfiguration.rootUrl
      + '/../content/images/currentConfiguration/'
      + id + '?' + this._dataForUi.resourceCacheKey;
  }

  /**
   * Formats the given date (or ISO-8601 string) as date according to the current settings
   * @param date The input date or string
   */
  formatAsDate(date: Date | string): string {
    return this.doFormat(date, this.dateFormat);
  }

  /**
   * Formats the given date (or ISO-8601 string) as time according to the current settings
   * @param date The input date or string
   */
  formatAsTime(date: Date | string): string {
    return this.doFormat(date, this.timeFormat);
  }

  /**
   * Formats the given date (or ISO-8601 string) as date / time according to the current settings
   * @param date The input date or string
   */
  formatAsDateTime(date: Date | string): string {
    return this.doFormat(date, this.dateFormat + ' ' + this.timeFormat);
  }

  private doFormat(date: Date | string, format: string): string {
    if (date == null) {
      return '';
    }
    return moment(date).parseZone().format(format);
  }

  /**
   * Returns a string representing a number with a fixed number of decimals
   * @param num The number (or string)
   * @param scale The number of decimal digits
   */
  numberToFixed(num: number | string, scale: number): string {
    if (num == null) {
      return null;
    }

    let bignum: any;
    try {
      bignum = Big(num);
    } catch (Error) {
      return null;
    }

    return bignum.toFixed(scale);
  }

  /**
   * Returns whether the given number (or string) represents a positive number
   * @param num The input number or string representation of a number
   */
  isPositive(num: number | string): boolean {
    if (num == null) {
      return false;
    }
    if (typeof (num) === 'number') {
      return num > 0;
    }
    return !num.startsWith('-');
  }

  /**
   * Returns whether the given number (or string) represents a negative number
   * @param num The input number or string representation of a number
   */
  isNegative(num: number | string): boolean {
    if (num == null) {
      return false;
    }
    if (typeof (num) === 'number') {
      return num < 0;
    }
    return num.startsWith('-');
  }

  /**
   * Returns whether the given number (or string) represents zero
   * @param num The input number or string representation of a number
   */
  isZero(num: number | string): boolean {
    if (num == null) {
      return false;
    }
    return this.numberToFixed(num, 6) === '0.000000';
  }

  /**
   * Formats the given number (or string) as number according to the current settings
   * @param num The input number or string representation of a number
   * @param scale The number of decimal digits
   * @param forceSign If true will output + for positive numbers
   */
  formatAsNumber(num: number | string, scale: number, forceSign: boolean = false): string {
    const fixed = this.numberToFixed(num, scale);
    if (fixed == null) {
      return '';
    }

    const parts = fixed.split('.');
    let intPart = parts[0];
    const decPart = parts.length === 1 ? null : parts[1];

    const wasNegative = intPart.startsWith('-');
    if (wasNegative) {
      intPart = intPart.substring(1);
    }

    const integers: string[] = [];
    while (intPart.length > 0) {
      let part: string;
      if (intPart.length < 3) {
        part = intPart;
        intPart = '';
      } else {
        part = intPart.substring(intPart.length - 3);
        intPart = intPart.substring(0, intPart.length - 3);
      }
      integers.splice(0, 0, part);
    }
    let intFmt = integers.join(this.groupingSeparator);
    if (wasNegative) {
      intFmt = '-' + intFmt;
    } else if (forceSign) {
      intFmt = '+' + intFmt;
    }
    if (decPart) {
      return intFmt + this.decimalSeparator + decPart;
    } else {
      return intFmt;
    }
  }

  /**
   * Formats a number as currency
   * @param currency The currency to format
   * @param num The number to format
   * @param forceSign If true will output + for positive numbers
   */
  formatAsCurrency(currency: Currency, num: number | string, forceSign: boolean = false): string {
    if (num == null || num === '') {
      return '';
    }
    currency = (currency || {});
    const decimals = currency.decimalDigits || 2;
    const prefix = currency.prefix || '';
    const suffix = currency.suffix || '';
    return prefix + this.formatAsNumber(num, decimals, forceSign) + suffix;
  }
}
