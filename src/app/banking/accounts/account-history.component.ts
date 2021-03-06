import { Component, ChangeDetectionStrategy, Injector } from '@angular/core';
import {
  DataForAccountHistory, Currency, EntityReference, PreselectedPeriod,
  AccountHistoryResult, AccountKind, AccountHistoryStatus, TransferFilter, Image
} from 'app/api/models';
import { AccountsService } from 'app/api/services';

import { BehaviorSubject } from 'rxjs';
import { BaseComponent } from 'app/shared/base.component';
import { TableDataSource } from 'app/shared/table-datasource';
import { ApiHelper } from 'app/shared/api-helper';
import { FormGroup, FormBuilder } from '@angular/forms';
import { tap } from 'rxjs/operators';
import { debounceTime } from 'rxjs/operators';

/** Information for an account status element shown on top */
export type StatusIndicator = {
  label: string,
  amount: string,
  alwaysNegative: boolean
};

/** Fields fetched when getting the account status */
const STATUS_FIELDS = { fields: ['status'] };

/**
 * Displays the account history of a given account
 */
@Component({
  selector: 'account-history',
  templateUrl: 'account-history.component.html',
  styleUrls: ['account-history.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AccountHistoryComponent extends BaseComponent {
  constructor(
    injector: Injector,
    private accountsService: AccountsService,
    private formBuilder: FormBuilder
  ) {
    super(injector);
    this.form = formBuilder.group({
      transferFilter: null,
      preselectedPeriod: null,
      periodBegin: null,
      periodEnd: null
    });
    this.stateManager.manage(this.form);
    this.subscriptions.push(this.form.valueChanges.pipe(
      debounceTime(ApiHelper.DEBOUNCE_TIME)
    ).subscribe(value => {
      this.update(value);
    }));
  }

  data = new BehaviorSubject<DataForAccountHistory>(null);

  form: FormGroup;

  get type(): EntityReference {
    const data = this.data.value;
    if (data) {
      return data.account.type;
    }
    return null;
  }

  get number(): string {
    const data = this.data.value;
    if (data) {
      return data.account.number;
    }
    return null;
  }

  get currency(): Currency {
    const data = this.data.value;
    if (data) {
      return data.account.currency;
    }
    return null;
  }

  get preselectedPeriods(): PreselectedPeriod[] {
    const data = this.data.value;
    if (data) {
      return data.preselectedPeriods;
    }
    return [];
  }

  get transferFilters(): TransferFilter[] {
    const data = this.data.value;
    if (data) {
      return data.transferFilters;
    }
    return [];
  }

  query: any;
  dataSource = new TableDataSource<AccountHistoryResult>();
  status = new BehaviorSubject<StatusIndicator[]>([]);
  loaded = new BehaviorSubject<boolean>(false);
  private dataLoaded = false;
  private statusLoaded = false;

  get displayedColumns(): string[] {
    if (this.layout.xs) {
      return ['avatar', 'aggregated', 'amount'];
    } else {
      const data = this.data.value;
      if (data && data.account.currency.transactionNumberPattern) {
        return ['avatar', 'date', 'transactionNumber', 'subject', 'amount'];
      } else {
        return ['avatar', 'date', 'subject', 'amount'];
      }
    }
  }

  get title(): string {
    const type = this.type;
    if (type == null) {
      return null;
    }
    const number = this.layout.xs ? null : this.number;
    return number == null ? type.name : type.name + ' - ' + number;
  }

  get typeId(): string {
    return this.route.snapshot.params.type;
  }

  get maxIndicators(): number {
    const width = this.layout.width;
    if (width < 350) {
      return 2;
    } else if (width < 450) {
      return 3;
    } else if (width < 1100) {
      return 4;
    } else {
      return 5;
    }
  }

  ngOnInit() {
    super.ngOnInit();

    // Resolve the account type
    const type = this.typeId;
    if (type == null) {
      // No account type given - get the first one
      const firstType = this.firstAccountType;
      if (firstType == null) {
        this.notification.error(this.messages.accountErrorNoAccounts());
      } else {
        this.router.navigateByUrl('/banking/account/' + this.firstAccountType);
      }
    }

    // Get the account history data
    this.stateManager.cache('data',
      this.accountsService.getAccountHistoryDataByOwnerAndType({
        owner: ApiHelper.SELF, accountType: type
      }))
      .subscribe(data => {
        this.data.next(data);

        // Initialize the query
        this.query = this.stateManager.get('query', () => {
          const query: any = data.query;
          query.owner = ApiHelper.SELF;
          query.accountType = data.account.type.id;
          query.datePeriod = [null, null];
          // Select the default preselected period
          if ((data.preselectedPeriods || []).length === 0) {
            // No preselected periods? Create one, so we don't break the logic
            data.preselectedPeriods = [
              { defaultOption: true }
            ];
          }
          for (const preselectedPeriod of data.preselectedPeriods) {
            if (preselectedPeriod.defaultOption) {
              this.form.setControl('preselectedPeriod', this.formBuilder.control(preselectedPeriod));
              break;
            }
          }
          return query;
        });

        // Fetch the account history
        this.update();
      });
  }

  // TODO this method can be improved by using the merge() rxjs operator,
  // so a single subscription is enough for both calls, and there would ne no need
  // for the dataLoaded, statusLoaded and loaded attributes.
  update(value?: any) {
    if (value == null) {
      value = this.form.value;
    }
    if (value) {
      // Update the query from the current form value
      const filter = value.transferFilter as TransferFilter;
      this.query.transferFilters = filter == null ? [] : [filter.id];

      const period = (value.preselectedPeriod || {}) as PreselectedPeriod;
      this.query.datePeriod = [
        period.begin || value.periodBegin,
        period.end || value.periodEnd,
      ];
    }

    // Update the results
    const results = this.accountsService.searchAccountHistoryResponse(this.query).pipe(
      tap(response => {
        this.dataLoaded = true;
        this.notifyLoaded();
      }));
    this.dataSource.subscribe(results);

    // Update the status
    const statusParams = Object.assign({}, this.query, STATUS_FIELDS);
    this.accountsService.getAccountStatusByOwnerAndType(statusParams)
      .subscribe(account => {
        this.statusLoaded = true;
        this.status.next(this.toIndicators(account.status));
        this.notifyLoaded();
      });
  }

  private notifyLoaded() {
    if (this.dataLoaded && this.statusLoaded && !this.loaded.value) {
      this.loaded.next(true);
    }
  }

  private toIndicators(status: AccountHistoryStatus): StatusIndicator[] {
    const result: StatusIndicator[] = [];
    const add = (amount: string, label: string, alwaysNegative: boolean = false) => {
      if (amount) {
        result.push({ amount: amount, label: label, alwaysNegative: alwaysNegative });
      }
    };
    if (status.availableBalance !== status.balance) {
      add(status.availableBalance, this.messages.accountAvailableBalance());
    }
    add(status.balance, this.messages.accountBalance());
    if (status.reservedAmount && !this.format.isZero(status.reservedAmount)) {
      add(status.reservedAmount, this.messages.accountReservedAmount(), true);
    }
    if (status.creditLimit && !this.format.isZero(status.creditLimit)) {
      add(status.creditLimit, this.messages.accountCreditLimit());
    }
    if (status.upperCreditLimit && !this.format.isZero(status.upperCreditLimit)) {
      add(status.upperCreditLimit, this.messages.accountUpperCreditLimit());
    }
    if (status.balanceAtBegin != null) {
      const date = this.format.formatAsDate(this.query.datePeriod[0]);
      add(status.balanceAtBegin, this.messages.accountBalanceOn(date));
    }
    if (status.balanceAtEnd != null) {
      const date = this.format.formatAsDate(this.query.datePeriod[1]);
      add(status.balanceAtEnd, this.messages.accountBalanceOn(date));
    }
    if (status.netInflow != null) {
      add(status.netInflow, this.messages.accountNetInflow());
    }
    return result;
  }

  private get firstAccountType(): string {
    const accounts = ((this.login.auth || {}).permissions || {}).banking.accounts;
    if (accounts && accounts.length > 0) {
      return ApiHelper.internalNameOrId(accounts[0].account.type);
    } else {
      return null;
    }
  }

  subjectName(row: AccountHistoryResult): string {
    if (row.relatedAccount.kind === AccountKind.USER) {
      // Show the user display
      return row.relatedAccount.user.display;
    } else {
      if (row.type && row.type.from) {
        // Show the system account type name
        return this.format.isNegative(row.amount)
          ? row.type.to.name
          : row.type.from.name;
      } else {
        // Some older cyclos versions didn't send from / to
        return this.messages.system();
      }
    }
  }

  /**
   * Returns the route components for the given row
   * @param row The row
   */
  path(row: AccountHistoryResult): string[] {
    return ['/banking', 'transfer', ApiHelper.transactionNumberOrId(row)];
  }

  /**
   * Returns the icon used on the given row's avatar
   * @param row The row
   */
  avatarIcon(row: AccountHistoryResult): string {
    return row.relatedAccount.kind === 'user' ? 'account_circle' : 'account_balance_circle';
  }

  /**
   * Returns the image used on the given row's avatar
   * @param row The row
   */
  avatarImage(row: AccountHistoryResult): Image {
    return row.relatedAccount.kind === 'user' ? row.relatedAccount.user.image : null;
  }
}
