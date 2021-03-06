import { Component, ChangeDetectionStrategy, Injector } from '@angular/core';

import { BehaviorSubject } from 'rxjs';
import { BaseComponent } from 'app/shared/base.component';
import { AddressesService } from 'app/api/services';
import { UserAddressesListData, AddressResult, AddressFieldEnum, Address } from 'app/api/models';
import { ApiHelper } from 'app/shared/api-helper';
import { Action } from 'app/shared/action';
import { MatDialog } from '@angular/material';
import { AddressFormComponent } from 'app/users/addresses/address-form.component';
import { CountriesResolve } from 'app/countries.resolve';
import { LatLngBounds } from '@agm/core';
import { fitBounds, labelAddresses } from '../../shared/helper';
import { MapsService } from 'app/core/maps.service';

/**
 * Manages the addresses of a user.
 * Currently implemented only for the logged user's addresses
 */
@Component({
  selector: 'manage-addresses',
  templateUrl: 'manage-addresses.component.html',
  styleUrls: ['manage-addresses.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ManageAddressesComponent extends BaseComponent {

  loaded = new BehaviorSubject(false);

  data: UserAddressesListData;

  addressStreet = ApiHelper.addressStreet;

  enabledFields: string[];

  locatedAddresses: Address[];

  constructor(
    injector: Injector,
    private dialog: MatDialog,
    private addressesService: AddressesService,
    private countriesResolve: CountriesResolve,
    public maps: MapsService) {
    super(injector);
  }

  ngOnInit() {
    super.ngOnInit();
    this.addressesService.getUserAddressesListData({ user: ApiHelper.SELF })
      .subscribe(data => {
        this.data = data;

        this.enabledFields = [];
        for (const addr of this.data.addresses || []) {
          for (const prop in addr) {
            if (addr.hasOwnProperty(prop)) {
              this.enabledFields.push(prop);
            }
          }
        }

        // Label each address
        this.locatedAddresses = labelAddresses(this.data.addresses, this.messages);

        this.loaded.next(true);
      });
  }

  actions(address: AddressResult): Action[] {
    const actions: Action[] = [];
    actions.push(new Action('edit', this.messages.edit(), () => {
      this.edit(address);
    }));
    actions.push(new Action('delete', this.messages.remove(), () => {
      this.remove(address);
    }));
    return actions;
  }

  createNew() {
    this.addressesService.getAddressDataForNew({
      user: ApiHelper.SELF
    }).subscribe(forNew => {
      this.dialog.open(AddressFormComponent, this.layout.formDialogConfig(forNew)).afterClosed().subscribe(saved => {
        if (saved) {
          this.notification.snackBar(this.messages.addressCreated());
          this.reload();
        }
      });
    });
  }

  private remove(address: AddressResult) {
    this.addressesService.getPasswordInputForRemoveAddress({ id: address.id }).subscribe(passwordInput => {
      if (passwordInput == null) {
        // No confirmation password is required: just as yes / no
        this.notification.yesNo(this.messages.addressRemove(address.name))
          .subscribe(answer => {
            if (answer) {
              this.doRemove(address);
            }
          });
      } else {
        // Need to confirm with a password
        this.notification.confirmWithPassword(
          this.messages.addressRemove(address.name),
          passwordInput,
          this.messages.addressConfirmationPassword())
          .subscribe(confirmationPassword => {
            if (confirmationPassword) {
              this.doRemove(address, confirmationPassword);
            }
          });
      }
    });
  }

  private doRemove(address: AddressResult, confirmationPassword: string = null) {
    this.addressesService.deleteAddress({
      id: address.id,
      confirmationPassword: confirmationPassword
    }).subscribe(() => {
      this.notification.snackBar(this.messages.addressRemoved());
      this.reload();
    });
  }

  private edit(address: AddressResult) {
    this.addressesService.getAddressDataForEdit({
      id: address.id
    }).subscribe(forEdit => {
      forEdit['id'] = address.id;
      this.dialog.open(AddressFormComponent, this.layout.formDialogConfig(forEdit)).afterClosed().subscribe(saved => {
        if (saved) {
          this.notification.snackBar(this.messages.addressModified());
          this.reload();
        }
      });
    });
  }

  enabled(field: AddressFieldEnum): boolean {
    return this.enabledFields.includes(field);
  }

  private reload() {
    this.loaded.next(false);
    this.ngOnInit();
  }

  country(code: string): string {
    return this.countriesResolve.name(code);
  }

  get mapBounds(): LatLngBounds {
    return fitBounds(this.locatedAddresses);
  }
}
