import * as semver from 'semver';

import {Config} from '../config';

import {BinaryUrl} from './binary';
import {XmlConfigSource} from './config_source';

export class StandaloneXml extends XmlConfigSource {
  constructor() {
    super('standalone', Config.cdnUrls()['selenium']);
  }

  getUrl(version: string, opt_proxy?: string, opt_ignoreSSL?: boolean): Promise<BinaryUrl> {
    this.opt_proxy = opt_proxy == undefined ? this.opt_proxy : opt_proxy;
    this.opt_ignoreSSL = opt_ignoreSSL == undefined ? this.opt_ignoreSSL : opt_ignoreSSL;
    if (version === 'latest') {
      return this.getLatestStandaloneVersion();
    } else {
      return this.getSpecificStandaloneVersion(version);
    }
  }

  getVersionList(): Promise<string[]> {
    return this.getXml().then(xml => {
      let versionPaths: string[] = [];

      for (let content of xml.ListBucketResult.Contents) {
        let contentKey: string = content.Key[0];

        // Filter the selenium-server-standalone.
        if (contentKey.includes('selenium-server-standalone')) {
          versionPaths.push(contentKey);
        }
      }
      return versionPaths;
    });
  }

  private getLatestStandaloneVersion(): Promise<BinaryUrl> {
    return this.getVersionList().then(list => {
      let standaloneVersion: string = null;
      let latest = '';
      let latestVersion = '';
      for (let item of list) {
        // Get a semantic version.
        let version = item.split('selenium-server-standalone-')[1].replace('.jar', '');

        // Do not do beta versions for latest.
        if (!version.includes('beta')) {
          if (standaloneVersion == null) {
            // First time: use the version found.
            standaloneVersion = version;
            latest = item;
            latestVersion = version;
          } else if (semver.gt(version, standaloneVersion)) {
            // Get the latest.
            standaloneVersion = version;
            latest = item;
            latestVersion = version;
          }
        }
      }
      return {url: Config.cdnUrls().selenium + latest, version: latestVersion};
    });
  }

  private getSpecificStandaloneVersion(inputVersion: string): Promise<BinaryUrl> {
    return this.getVersionList().then(list => {
      let itemFound = '';
      let standaloneVersion: string = null;

      for (let item of list) {
        // Get a semantic version.
        let version = item.split('selenium-server-standalone-')[1].replace('.jar', '');

        // Check to see if the specified version matches.
        let firstPath = item.split('/')[0];
        if (version === inputVersion) {
          // Check if the beta exists that we have the right version
          // Example: We will see that beta3 appears in the file and path
          // 3.0-beta3/selenium-server-standalone-3.0.0-beta3.jar
          // where this should not work:
          // 3.0-beta2/selenium-server-standalone-3.0.0-beta3.jar
          if (inputVersion.includes('beta')) {
            let betaInputVersion = inputVersion.replace('.jar', '').split('beta')[1];
            if (item.split('/')[0].includes('beta' + betaInputVersion)) {
              return {url: Config.cdnUrls().selenium + item, version: version};
            }
          } else {
            return {url: Config.cdnUrls().selenium + item, version: version};
          }
        }
      }
    });
  }
}
