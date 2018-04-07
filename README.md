# propertyServer sample

[![Node.js](https://img.shields.io/badge/Node.js-9.5.0-blue.svg)](https://nodejs.org/)
[![npm](https://img.shields.io/badge/npm-5.6.0-blue.svg)](https://www.npmjs.com/)
![Platforms](https://img.shields.io/badge/platform-windows%20%7C%20osx%20%7C%20linux-lightgray.svg)
[![License](http://img.shields.io/:license-mit-blue.svg)](http://opensource.org/licenses/MIT)


*Forge API*:
[![oAuth2](https://img.shields.io/badge/oAuth2-v1-green.svg)](http://developer-autodesk.github.io/)
[![Model-Derivative](https://img.shields.io/badge/Model%20Derivative-v2-green.svg)](http://developer-autodesk.github.io/)


<b>Note:</b> For using this sample, you need a valid oAuth credential for accessing resources on Autodesk Forge.
Visit this [page](https://developer.autodesk.com) for instructions to get on-board.


## Description

The propertyServer server exercises ais a workaround to the Forge Model Derivative API limitations to [request properties](https://developer.autodesk.com/en/docs/model-derivative/v2/reference/http/urn-metadata-guid-properties-GET/).
It also demonstrates how to parse the bubble json.gz property files.

In order to make use of this sample, you need to register your consumer and secret keys:

* https://developer.autodesk.com > My Apps

This provides the credentials to supply to the http requests to the Autodesk server endpoints.


## Dependencies

This sample is dependent on the server part on Node.js and couple of Node.js extensions
which would update/install automatically via 'npm':


## Setup/Usage Instructions

### Deploy on Heroku

[![Deploy](https://www.herokucdn.com/deploy/button.svg)](https://heroku.com/deploy)


<a name="setupSample"></a>
### Setup
1. Download and install [Node.js](http://nodejs.org/) (that will install npm as well)
2. Download this repo anywhere you want (the server will need to write files, so make sure you install in
   a location where you have write permission, at least the 'tmp', 'data' and '/www/extracted' folders)
3. Execute 'npm install', this command will download and install the required node modules automatically for you. <br />
   ```
   npm install
   ```
4. Install your credential keys: <br />
   Use system environment variables (This is actually the option you need to use for the tests suite
   which runs on [Travis-CI](https://travis-ci.org/)). Replace keys placeholder xxx with your own keys.

          * Windows<br />
            ```
            set FORGE_CLIENT_ID=xxx

            set FORGE_CLIENT_SECRET=xxx

            [set PORT=<port>]

			node start.js
            ```
          * OSX/Linux<br />
            ```
            [sudo] [PORT=<port>] FORGE_CLIENT_ID=xxx FORGE_CLIENT_SECRET=xxx node start.js
            ```
   <br />
   <b>Note:</b> the port argument can be omitted and default to port 80. If port 80 is already in use by another
   application (like Skype, or IIS, or Apache, ...), you can use any other free port such as 8000, 3000, etc...
   But in the next section you would need to specify the port to use, i.e. http://localhost[:port]/


<a name="UseOfTheSample"></a>
### Use of the sample

1. Get resources from your file<br />
  ```
  curl -X GET http://localhost:3000/data/dXJuO...Lm53ZA/load
  ```
  Note the server, use a 2 legged definition by default, but you can override the Authorization by adding an header to the request in order
  to use your own.
  ```
  curl -X GET http://localhost:3000/data/dXJuO...Lm53ZA/load -H "Authorization: Bearer ey9f...ks7A"
  ```
2. Verify resources are ready<br />
  ```
  curl -X GET http://localhost:3000/data/dXJuO...Lm53ZA/load/progress
  ```
3. Get properties<br />
  ```
  # Get all properties
  curl -X GET http://localhost:3000/data/dXJuO...Lm53ZA/properties/*

  # Get properties for 1 object with Id == 1789
  curl -X GET http://localhost:3000/data/dXJuO...Lm53ZA/properties/1789

  # Get properties for several objects with Id == 1066, 1515, 1789
  curl -X GET http://localhost:3000/data/dXJuO...Lm53ZA/properties/1066,1515,1789
  ```
  Note you can add the -H "Accept-Encoding: gzip" or -H "Accept-Encoding: deflate" or -H "Accept-Encoding: gzip, deflate" to compress the JSON reply.
4. Free the resources<br />
  ```
  curl -X DELETE http://localhost:3000/data/dXJuO...Lm53ZA
  ```



--------

## License

This sample is licensed under the terms of the [MIT License](http://opensource.org/licenses/MIT).
Please see the [LICENSE](LICENSE) file for full details.


## Written by

Cyrille Fauvel <br />
Forge Partner Development <br />
http://developer.autodesk.com/ <br />
http://around-the-corner.typepad.com <br />
