import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { LoginComponent } from 'app/login/login.component';
import { HomeComponent } from 'app/home/home.component';
import { DashboardComponent } from 'app/home/dashboard.component';
import { NotFoundComponent } from 'app/shared/not-found.component';
import { SharedModule } from 'app/shared/shared.module';
import { LoggedUserGuard } from 'app/logged-user-guard';
import { Menu } from 'app/shared/menu';
import { SettingsComponent } from 'app/settings/settings.component';
import { ForgotPasswordComponent } from 'app/login/forgot-password.component';
import { ChangeForgottenPasswordComponent } from 'app/login/change-forgotten-password.component';

const rootRoutes: Routes = [
  {
    path: '',
    component: HomeComponent,
    pathMatch: 'full',
    data: {
      menu: Menu.HOME
    }
  },
  {
    path: 'home',
    component: HomeComponent,
    pathMatch: 'full',
    data: {
      menu: Menu.HOME
    }
  },
  {
    path: 'login',
    component: LoginComponent,
    data: {
      menu: Menu.LOGIN
    }
  },
  {
    path: 'forgot-password',
    component: ForgotPasswordComponent,
    data: {
      menu: Menu.LOGIN
    }
  },
  {
    path: 'forgot-password/:key',
    component: ChangeForgottenPasswordComponent,
    data: {
      menu: Menu.LOGIN
    }
  },
  {
    path: 'settings',
    component: SettingsComponent,
    data: {
      menu: Menu.SETTINGS
    }
  },
  {
    path: 'banking',
    loadChildren: 'app/banking/banking.module#BankingModule'
  },
  {
    path: 'users',
    loadChildren: 'app/users/users.module#UsersModule'
  },
  {
    path: 'marketplace',
    loadChildren: 'app/marketplace/marketplace.module#MarketplaceModule'
  },
  {
    path: 'personal',
    loadChildren: 'app/personal/personal.module#PersonalModule'
  },
  {
    path: '**',
    component: NotFoundComponent
  }
];

/**
 * Module that defines the application routing
 */
@NgModule({
  imports: [
    RouterModule.forRoot(rootRoutes, {
      onSameUrlNavigation: 'reload'
    }),
    SharedModule
  ],
  declarations: [
    HomeComponent,
    DashboardComponent
  ],
  exports: [
    RouterModule
  ],
  providers: [
    LoggedUserGuard
  ]
})
export class AppRoutingModule { }
