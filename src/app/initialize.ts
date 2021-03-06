import { Provider, APP_INITIALIZER } from '@angular/core';
import { ApiConfiguration } from 'app/api/api-configuration';
import { environment } from 'environments/environment';
import { LightboxConfig } from 'ngx-lightbox';
import { DataForUiHolder } from 'app/core/data-for-ui-holder';

// Initializes the shared services
export function initialize(
  apiConfig: ApiConfiguration,
  lightboxConfig: LightboxConfig,
  dataForUiHolder: DataForUiHolder
): Function {
  return () => {
    // Initialize the API configuration
    let root = environment.apiRoot as string;
    if (root.endsWith('/')) {
      root = root.substr(0, root.length - 1);
    }
    apiConfig.rootUrl = root;

    // Initialize the Lightbox configuration
    lightboxConfig.centerVertically = true;
    lightboxConfig.fadeDuration = 0.4;
    lightboxConfig.resizeDuration = 0.4;
    lightboxConfig.disableScrolling = true;
    lightboxConfig.wrapAround = true;

    // Load the data for UI
    dataForUiHolder.reload();
  };
}
export const INITIALIZE: Provider = {
  provide: APP_INITIALIZER,
  useFactory: initialize,
  deps: [ApiConfiguration, LightboxConfig, DataForUiHolder],
  multi: true
};
