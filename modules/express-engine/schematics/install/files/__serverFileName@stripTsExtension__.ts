import 'zone.js/dist/zone-node';

import { ngExpressEngine } from '@nguniversal/express-engine';
import * as express from 'express';
import { join } from 'path';
import { APP_BASE_HREF } from '@angular/common';
import { addSSL } from './server-tools/add-ssl';
import { ServerSettings } from './server-tools/server-settings.interface';

import { existsSync } from 'fs';

/** Must be imported before AppServerModule to allow DOM mocks to initialize */
import './server-tools/windows-mocks-and-polyfills'

import { AppServerModule } from './src/<%= stripTsExtension(main) %>';


const serverSettings: ServerSettings = {
  /** if you don't want to use SSL, switch this setting to false */
  useSSL: true,
  sslKey: '',
  sslCert: '',
  hostName: 'localHost',
  port: Number.parseInt(process.env.PORT || '<%= serverPort %>' || '0', 10) || 4000,
};

// The Express app is exported so that it can be used by serverless Functions.
export function app(): express.Express {
  const server = express();
  const distFolder = join(process.cwd(), '<%= browserDistDirectory %>');
  const indexHtml = existsSync(join(distFolder, 'index.original.html')) ? 'index.original.html' : 'index';

  // Our Universal express-engine (found @ https://github.com/angular/universal/tree/master/modules/express-engine)
  server.engine('html', ngExpressEngine({
    bootstrap: AppServerModule,
  }));

  server.set('view engine', 'html');
  server.set('views', distFolder);

  // Example Express Rest API endpoints
  // server.get('/api/**', (req, res) => { });
  // Serve static files from /browser
  server.get('*.*', express.static(distFolder, {
    maxAge: '1y'
  }));

  // All regular routes use the Universal engine
  server.get('*', (req, res) => {
    res.render(indexHtml, { req, providers: [{ provide: APP_BASE_HREF, useValue: req.baseUrl }] });
  });

  return server;
}

function run() {
  // Start up the Node server
  const server = serverSettings.useSSL ? addSSL(app(),serverSettings) : app();
  server.listen(serverSettings.port, serverSettings.hostName, () => {
    console.log(
      `Node Express server listening on http${
        serverSettings.useSSL ? 's' : ''
      }://${serverSettings.hostName}:${serverSettings.port}`
    );
  });
}



// Webpack will replace 'require' with '__webpack_require__'
// '__non_webpack_require__' is a proxy to Node 'require'
// The below code is to ensure that the server is run only when not requiring the bundle.
declare const __non_webpack_require__: NodeRequire;
const mainModule = __non_webpack_require__.main;
const moduleFilename = mainModule && mainModule.filename || '';
if (moduleFilename === __filename || moduleFilename.includes('iisnode')) {
  run();
}

export * from './src/<%= stripTsExtension(main) %>';
