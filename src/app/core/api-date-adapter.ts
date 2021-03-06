import { DateAdapter } from '@angular/material';
import * as moment from 'moment-mini-ts';
import { Injectable } from '@angular/core';
import { FormatService } from 'app/core/format.service';
import { ApiHelper } from 'app/shared/api-helper';
import { LengthValidation } from 'app/shared/length-validation';

const DATE_NAMES = [];
for (let i = 0; i < 31; i++) {
  DATE_NAMES.push(String(i + 1));
}

/**
 * Interface for Angular Material's date picker
 */
@Injectable()
export class ApiDateAdapter extends DateAdapter<string> {
  constructor(private formatService: FormatService) {
    super();
  }

  getYear(date: string): number {
    return moment(date).year();
  }
  getMonth(date: string): number {
    return moment(date).month();
  }
  getDate(date: string): number {
    return moment(date).date();
  }
  getDayOfWeek(date: string): number {
    return moment(date).day();
  }
  getMonthNames(style: 'long' | 'short' | 'narrow'): string[] {
    return this.formatService.monthNames[style];
  }
  getDateNames(): string[] {
    return DATE_NAMES;
  }
  getDayOfWeekNames(style: 'long' | 'short' | 'narrow'): string[] {
    return this.formatService.dayNames[style];
  }
  getYearName(date: string): string {
    return String(this.getYear(date));
  }
  getFirstDayOfWeek(): number {
    // For now we always handle sunday as first day of week
    return 0;
  }
  getNumDaysInMonth(date: string): number {
    return moment(date).daysInMonth();
  }
  clone(date: string): string {
    // Strings are immutable
    return date;
  }
  createDate(year: number, month: number, date: number): string {
    return moment({ year: year, month: month, date: date }).format();
  }
  today(): string {
    return moment().format();
  }
  parse(value: any, parseFormat: any): string {
    const length = this.length(parseFormat);
    if (!length.valid(value)) {
      return ApiHelper.INVALID_DATE;
    }
    return moment(value, parseFormat).format();
  }
  format(date: string, displayFormat: any): string {
    return moment(date).format(displayFormat);
  }
  addCalendarYears(date: string, years: number): string {
    return moment(date).add(years, 'years').format();
  }
  addCalendarMonths(date: string, months: number): string {
    return moment(date).add(months, 'months').format();
  }
  addCalendarDays(date: string, days: number): string {
    return moment(date).add(days, 'days').format();
  }
  toIso8601(date: string): string {
    // Already in ISO-8601
    return date;
  }
  fromIso8601(iso8601String: string): string {
    // Already in ISO-8601
    return iso8601String;
  }
  isDateInstance(obj: any): boolean {
    return typeof obj === 'string' && this.isValid(obj);
  }
  isValid(date: string): boolean {
    if (date === ApiHelper.INVALID_DATE) {
      return false;
    }
    return moment(date).isValid();
  }
  invalid(): string {
    return ApiHelper.INVALID_DATE;
  }

  private length(parseFormat?: string): LengthValidation {
    if (parseFormat == null || parseFormat === '') {
      parseFormat = this.formatService.dateFormat;
    }
    const noInputs = parseFormat.replace(/[a-z|A-Z]/g, '');
    const max = parseFormat.length;
    const min = max - noInputs.length;
    return new LengthValidation(min, max);
  }
}
