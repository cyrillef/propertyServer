//
// Copyright (c) Autodesk, Inc. All rights reserved
//
// Permission to use, copy, modify, and distribute this software in
// object code form for any purpose and without fee is hereby granted,
// provided that the above copyright notice appears in all copies and
// that both that copyright notice and the limited warranty and
// restricted rights notice below appear in all supporting
// documentation.
//
// AUTODESK PROVIDES THIS PROGRAM "AS IS" AND WITH ALL FAULTS.
// AUTODESK SPECIFICALLY DISCLAIMS ANY IMPLIED WARRANTY OF
// MERCHANTABILITY OR FITNESS FOR A PARTICULAR USE.  AUTODESK, INC.
// DOES NOT WARRANT THAT THE OPERATION OF THE PROGRAM WILL BE
// UNINTERRUPTED OR ERROR FREE.
//
// Forge Property Server
// by Cyrille Fauvel - Autodesk Developer Network (ADN)
//
'use strict'; // http://www.w3schools.com/js/js_strict.asp

var express =require ('express') ;
var path =require ('path') ;
var fs =require ('fs') ;
var zlib = require('zlib') ;
var mkdirp =require ('mkdirp') ;
var moment =require ('moment') ;
var ForgeSDK =require ('forge-apis') ;
var config =require ('./config') ;
var utils =require ('./utils') ;
var forgeToken =require ('./forge-token') ;

var router =express.Router () ;

var propertiesDict ={} ;
setInterval (
	function () {
		Object.keys (propertiesDict).forEach (function (key) {
			if ( !propertiesDict.hasOwnProperty (key) || !propertiesDict [key].hasOwnProperty ('tm') )
				return ;
			if ( propertiesDict [key].tm.isBefore (moment ()) )
				delete propertiesDict [key] ;
		}) ;
	},
	10000 // 10 seconds
) ;

class JsonProperties {

	constructor (urn) {
		this.urn =urn ;
		this.offs =null ;
		this.avs =null ;
		this.vals =null ;
		this.attrs =null ;
		this.ids =null ;
	}

	static get dbs () {
		return (['objects_offs', 'objects_avs', 'objects_vals', 'objects_attrs', 'objects_ids']) ;
	}

	static get iNAME () { return (0) ; }
	static get iCATEGORY () { return (1) ; }
	static get iTYPE () { return (2) ; } // Type (1 = Boolean, 2 = Color, 3 = Numeric, 11 = ObjectReference, 20 = String)
	static get iUNIT () { return (3) ; }
	// The PropertyDB use GNU Units to specify units of properties. For compound units, like for density,
	// which don’t have an atomic name you can for expressions like kg/m^3
	static get DESCRIPTION () { return (4) ; }
	static get iDISPLAYNAME () { return (5) ; }
	static get iFLAGS () { return (6) ; }
	static get iDISPLAYPRECISION( ) { return (7) ; }

	static get tBoolean () { return (1) ; }
	static get tColor () { return (2) ; }
	static get tNumeric () { return (3) ; }
	static get tObjectReference () { return (11) ; }
	static get tString () { return (20) ; }
	static get tString2 () { return (21) ; }

	load (dbPath) {
		var self =this ;
		return (new Promise (function (fulfill, reject) {
			if ( propertiesDict.hasOwnProperty (dbPath) ) {
				self =propertiesDict [self.urn] ;
				propertiesDict [self.urn].tm =moment ().add (1, 'minutes') ;
				fulfill (self) ;
				return ;
			}
			self._load (dbPath)
				.then (function (results) {
					propertiesDict [self.urn] =self ;
					propertiesDict [self.urn].tm =moment ().add (1, 'minutes') ;
					JsonProperties.dbs.map (function (elt, index) {
						var name =elt.substring (8) ;
						self [name] =results [index] ;
					}) ;
					fulfill (self) ;
				})
				.catch (function (error) {
					reject (error) ;
				}) ;
		})) ;
	}

	readFull (dbId, includeParents) {
		includeParents =includeParents || false ;
		dbId =parseInt (dbId) ;
		var result ={
			objectid: dbId,
			guid: this.ids [dbId],
			properties: {},
			parents: []
		} ;
		var parent =this._readFull (dbId, result) ;
		while ( includeParents === true && parent !== null && parent !== 1 )
			parent =this._readFull (parent, result, includeParents) ;
		result.properties =Object.keys (result.properties).map (function (elt) { return (result.properties [elt]) ; }) ;
		return (result) ;
	}

	read (dbId) {
		dbId =parseInt (dbId) ;
		var result ={
			objectid: dbId,
			name: '',
			externalId: this.ids [dbId],
			properties: {}
		} ;
		var parent =this._read (dbId, result) ;
		//while ( parent !== null && parent !== 1 )
		//	parent =this._read (parent, result) ;
		//result.properties =Object.keys (result.properties).map (function (elt) { return (result.properties [elt]) ; }) ;
		return (result) ;
	}

	_load (dbPath) {
		var prs =JsonProperties.dbs.map (function (elt) {
			return (utils.jsonGzRoot (path.join (dbPath, elt + '.json.gz'))) ;
		}) ;
		return (Promise.all (prs)) ;
	}

	_readFull (dbId, result, includeParents) {
		includeParents =includeParents || false ;
		var parent =null ;
		var propStart =2 * this.offs [dbId] ;
		var propStop =(this.offs.length <= dbId + 1) ? this.avs.length : 2 * this.offs [dbId + 1] ;
		for ( var i =propStart ; i < propStop ; i +=2 ) {
			var attr =this.attrs [this.avs [i]] ;
			var key =attr [JsonProperties.iCATEGORY] + '/' + attr [JsonProperties.iNAME] ;
			if ( key === '__parent__/parent' ) {
				parent =parseInt (this.vals [this.avs [i + 1]]) ;
				result.parents.push (parent) ;
				continue ;
			}
			if ( result.properties.hasOwnProperty (key) )
				continue ;
			result.propertiess [key] ={
				category: attr [JsonProperties.iCATEGORY],
				name: attr [JsonProperties.iNAME],
				displayName: attr [JsonProperties.iDISPLAYNAME],
				type: attr [JsonProperties.iTYPE],
				value: this.vals [this.avs [i + 1]],
				unit: attr [JsonProperties.iUNIT],
				hidden: ((attr [JsonProperties.iFLAGS] & 1) == 1),
				//id: dbId,
			} ;
		}
		return (parent) ;
	}

	_read (dbId, result) {
		var parent =null ;
		var propStart =2 * this.offs [dbId] ;
		var propStop =(this.offs.length <= dbId + 1) ? this.avs.length : 2 * this.offs [dbId + 1] ;
		for ( var i =propStart ; i < propStop ; i +=2 ) {
			var attr =this.attrs [this.avs [i]] ;
			var category =attr [JsonProperties.iCATEGORY] ;
			var key =attr [JsonProperties.iCATEGORY] + '/' + attr [JsonProperties.iNAME] ;
			// if ( key === '__parent__/parent' ) {
			// 	parent =parseInt (this.vals [this.avs [i + 1]]) ;
			// 	result.parents.push (parent) ;
			// 	continue ;
			// }
			if ( key === '__instanceof__/instanceof_objid' ) {
				// Allright, we need to read teh definition
				this._read (parseInt (this.vals [this.avs [i + 1]]), result) ;
				continue ;
			}
			if (   key === '__viewable_in__/viewable_in'
				|| key === '__parent__/parent'
				|| key === '__child__/child'
				|| key === '__node_flags__/node_flags'
				//|| key === '__instanceof__/instanceof_objid'
			) {
				continue ;
			}
			//console.log (key) ;
			if ( key === '__name__/name' ) {
				if ( result.name === '' )
					result.name =this.vals [this.avs [i + 1]] ;
				continue ;
			}
			if ( !result.properties.hasOwnProperty (category) )
				result.properties [category] ={} ;

			key =attr [JsonProperties.iDISPLAYNAME] ;
			var value ='' ;
			if ( attr [JsonProperties.iTYPE] === JsonProperties.tBoolean )
				value =this.vals [this.avs [i + 1]] === 0 ? 'No' : 'Yes' ;
			else if ( attr [JsonProperties.iTYPE] === JsonProperties.tColor )
				value =this.vals [this.avs [i + 1]].toString () ;
			else if ( attr [JsonProperties.iTYPE] === JsonProperties.tNumeric )
				value =Number.parseFloat (this.vals [this.avs [i + 1]]).toFixed (3) ;
			else
				value =this.vals [this.avs [i + 1]] ;
			//result.properties [category] [key] =value ;
			if ( result.properties [category].hasOwnProperty (key) ) {
				if ( !Array.isArray (result.properties [category] [key]) ) {
					result.properties [category] [key] =[ result.properties [category] [key]] ;
				}
				result.properties [category] [key].push (value) ;
			} else {
				result.properties [category] [key] =value ;
			}
		}
		return (parent) ;
	}

}

class BubbleAccess {

	static getManifest (urn, _forgeToken) {
		_forgeToken =_forgeToken || forgeToken ;
		// Verify the required parameter 'urn' is set
		if ( urn === undefined || urn === null )
			return (Promise.reject ("Missing the required parameter 'urn' when calling getManifest")) ;
		var ModelDerivative =new ForgeSDK.DerivativesApi () ;
		return (ModelDerivative.apiClient.callApi (
			'/derivativeservice/v2/manifest/{urn}', 'GET',
			{ 'urn': urn }, {}, { /*'Accept-Encoding': 'gzip, deflate'*/ },
			{}, null,
			[], [ 'application/vnd.api+json', 'application/json' ], null,
			_forgeToken, _forgeToken.credentials
		)) ;
	}

	static extractPathsFromGraphicsUrn (urn, result) {
		// This needs to be done for encoded OSS URNs, because the paths
		// in there are url encoded and lose the / character.
		urn =decodeURIComponent (urn) ;
		var basePath =urn.slice (0, urn.lastIndexOf ('/') + 1) ;
		var localPath =basePath.slice (basePath.indexOf ('/') + 1) ;
		var urnBase =basePath.slice (0, basePath.indexOf ('/')) ;
		localPath =localPath.replace (/^output\//, '') ;
		// For supporting compound bubbles, we need to prefix
		// by sub-urn as well, otherwise files might clash.
		// var localPrefix = urnBase ? crypto.createHash('md5').update(urnBase).digest("hex") + "/" : "";
		var localPrefix ='' ;
		result.urn =urn ;
		result.basePath =basePath ;
		result.localPath =localPrefix + localPath ;
		result.rootFileName =urn.slice (urn.lastIndexOf ('/') + 1) ;
	}

	static listAllDerivativeFiles (bubble, callback) {
		var self =this ;
		var modelURN =bubble.urn ;
		// First get all the root derivative files from the bubble
		var res =[] ;
		(function traverse (node, parent) {
			if ( node.role === 'Autodesk.CloudPlatform.PropertyDatabase' ) {
				var item ={ mime: node.mime } ;
				BubbleAccess.extractPathsFromGraphicsUrn (node.urn, item) ;
				node.urn ='$file$/' + item.localPath + item.rootFileName ;
				item.modelURN =modelURN ;
				res.push (item) ;
				return ;
			}
			if ( node.children && res.length === 0 ) {
				node.children.forEach (function (child) {
					if ( res.length === 0 )
						traverse (child, node) ;
				}) ;
			}
		}) (bubble, null) ;

		if ( res.length === 0 )
			return (callback ('DB not found', null)) ;

		var current =0 ;
		var done =0 ;
		var processOne =function () {
			function onProgress () {
				done++ ;
				//console.log ('Manifests done ', done) ;
				if ( done === res.length ) {
					var result ={
						list: res
					} ;
					callback (null, result) ;
				} else {
					setTimeout (processOne, 0) ;
				}
			}

			if ( current >= res.length )
				return ;
			var rootItem =res [current++] ;
			var files =rootItem.files =[] ;
			if ( rootItem.mime === 'application/autodesk-db' ) {
				// The file list for property database files is fixed,
				// no need to go to the server to find out
				files.push ('objects_attrs.json.gz') ;
				files.push ('objects_vals.json.gz') ;
				files.push ('objects_avs.json.gz') ;
				files.push ('objects_offs.json.gz' );
				files.push ('objects_ids.json.gz') ;
				onProgress () ;
			}
		} ;
		// Kick off 6 parallel jobs
		for ( var k =0 ; k < 6 ; k++ )
			processOne () ;
	}

	static downloadAllDerivativeFiles (fileList, destDir, _forgeToken, callback) {
		var self =this ;
		var succeeded =0 ;
		var failed =0 ;
		var flatList =[] ;
		for ( var i =0 ; i < fileList.length ; i++ ) {
			var item =fileList [i] ;
			for (var j =0 ; j < item.files.length ; j++ ) {
				var flatItem ={
					basePath: item.basePath,
					localPath: destDir, // + item.localPath,
					fileName: item.files [j],
					modelURN: item.modelURN
				} ;
				if ( item.name )
					flatItem.name =item.name ;
				if ( item.urn ) {
					flatItem.urn =item.urn ;
					flatItem.guid =item.guid ;
					flatItem.mime =item.mime ;
				}
				flatList.push (flatItem) ;
			}
		}
		if ( flatList.length === 0 )
			return (callback (failed, succeeded)) ;
		var current =0 ;
		var done =0 ;
		var downloadOneItem =function () {
			if ( current >= flatList.length )
				return ;
			var fi =flatList [current++] ;
			var downloadComplete =function (error, success) {
				done++ ;
				if ( error ) {
					console.error ('Failed to download file:', fi.fileName, fi.modelURN, error) ;
				} else {
					console.log ('Downloaded:', fi.fileName, fi.modelURN) ;
				}
				if ( done === flatList.length )
					callback (flatList) ;
				else
					setTimeout (downloadOneItem, 0) ;
			} ;
			BubbleAccess.getItem (path.join (fi.basePath, fi.fileName), path.join (fi.localPath, fi.modelURN, fi.fileName), _forgeToken, downloadComplete) ;
		} ;
		// Kick off 10 parallel jobs
		for ( var k =0 ; k < 10 ; k++ )
			downloadOneItem () ;
	}

	static downloadItem (urn, _forgeToken) {
		_forgeToken =_forgeToken || forgeToken ;
		// Verify the required parameter 'urn' is set
		if ( urn === undefined || urn === null )
			return (Promise.reject ("Missing the required parameter 'urn' when calling downloadItem")) ;
		var ModelDerivative =new ForgeSDK.DerivativesApi () ;
		return (ModelDerivative.apiClient.callApi (
			'/derivativeservice/v2/derivatives/{urn}', 'GET',
			{ 'urn': urn }, {}, { 'Accept-Encoding': 'gzip, deflate' },
			{}, null,
			[], [], null,
			_forgeToken, _forgeToken.credentials
		)) ;
	}

	static openWriteStream (outFile) {
		var wstream ;
		if ( outFile ) {
			try {
				mkdirp.sync (path.dirname (outFile)) ;
				wstream =fs.createWriteStream (outFile) ;
			} catch ( e ) {
				console.error ('Error:', e.message) ;
			}
		}
		return (wstream) ;
	}

	static getItem (itemUrn, outFile, _forgeToken, callback) {
		var self =this ;
		//console.log ('-> ' + itemUrn) ;
		BubbleAccess.downloadItem (itemUrn)
			.then (function (response) {
				if ( response.statusCode !== 200 )
					return (callback (response.statusCode)) ;
				// Skip unzipping of items to make the downloaded content compatible with viewer debugging
				var wstream =BubbleAccess.openWriteStream (outFile) ;
				if ( wstream ) {
					wstream.write (typeof response.body == 'object' && path.extname (outFile) === '.json' ? JSON.stringify (response.body) : response.body) ;
					wstream.end () ;
					callback (null, response.statusCode) ;
				} else {
					callback (null, response.body) ;
				}
			})
			.catch (function (error) {
				console.error ('Error:', error.message) ;
				self._errors.push ('Error: ' + error.message) ;
				callback (error, null) ;
			})
		;
	}

}

var jobs ={} ;
router.get ('/:urn/load/progress', function (req, res) {
	var urn =utils._safeBase64encode (req.params.urn) ;
	if ( jobs.hasOwnProperty (urn) )
		return (res.status (201).json ({ status: 'pending' })) ;
	var outPath =utils.dataPath (urn, '') ;
	utils.fileexists (outPath)
		.then (function (bExists) {
			if ( bExists === true )
				res.status (200).json ({ status: 'completed' }) ;
			else
				res.status (404).end () ;
		})
		.catch (function (err) {
			res.status (500).end () ;
		}) ;
}) ;

router.get ('/:urn/load', function (req, res) {
	var urn =utils._safeBase64encode (req.params.urn) ;
	if ( jobs.hasOwnProperty (urn) )
		return (res.status (201).json ({ status: 'pending' })) ;
	var bearer =utils.authorization (req) ;
	var localForgeToken =forgeToken ;
	if ( bearer !== null ) {
		localForgeToken =new ForgeSDK.AuthClientTwoLegged (config.credentials.client_id, config.credentials.client_secret, config.credentials.scope) ;
		localForgeToken.credentials.token_type ='Bearer' ;
		localForgeToken.credentials.expires_in =3599 ;
		localForgeToken.credentials.access_token =bearer ;
	}
	var outPath =utils.dataPath ('', '') ;
	BubbleAccess.getManifest (urn, localForgeToken)
		.then (function (bubble) {
			//console.log (JSON.stringify (manifest, null, 2)) ;
			res.status (201).json ({ status: 'accepted' }) ;

			BubbleAccess.listAllDerivativeFiles (bubble.body, function (error, result) {
				if ( error !== null || result === null ) {
					delete jobs [urn] ;
					return ;
				}
				BubbleAccess.downloadAllDerivativeFiles (result.list, outPath, localForgeToken, function (flatList) {
					delete jobs [urn] ;
				}) ;
			}) ;
		})
		.catch (function (err) {
			console.error (err) ;
			res.status (500).end () ;
		}) ;
}) ;

router.delete ('/:urn', function (req, res) {
	var urn =utils._safeBase64encode (req.params.urn) ;
	if ( jobs.hasOwnProperty (urn) )
		delete jobs [urn] ;
	var outPath =utils.dataPath (urn, '') ;
	utils.rimraf (outPath)
		.then (function (pathname) {
			res.status (200).end () ;
		})
		.catch (function (err) {
			res.status (500).end () ;
		}) ;
}) ;

// Request Object(s)' properties
// set the structure to be equal to the metadata MD payload
router.get ('/:urn/properties/*', function (req, res) {
	var urn =utils._safeBase64encode (req.params.urn) ;
	var outPath =utils.dataPath (urn, '') ;
	var dbIds =utils.csv (req.params [0]) ; // csv format
	var compMethod =utils.accepts (req) ;

	var props =new JsonProperties (urn) ;
	//props.dbIds =dbIds ;
	props.load (outPath)
		.then (function (result) {
			var json ={
				data: {
					type: "properties",
					collection: []
				}
			} ;
			//result.dbIds.map (function (elt) {
			dbIds.map (function (elt) {
				var obj =result.read (elt) ;
				if ( obj != null )
					json.data.collection.push (obj) ;
			}) ;
			//res.json (json) ;

			switch ( compMethod ) {
				default:
					res.json (json) ;
					//utils.logTimeStamp (req.params.urn) ;
					break ;
				case 'gzip':
				case 'deflate':
					res.setHeader ('Content-Type', 'application/json') ;
					res.setHeader ('Content-Encoding', compMethod) ;

					var buf =new Buffer (JSON.stringify (json), 'utf-8') ;
					if ( compMethod == 'gzip' ) {
						zlib.gzip (buf, function (_, result) {
							res.setHeader ('Content-Length', result.length) ;
							res.end (result) ;
						}) ;
					} else {
						zlib.deflate (buf, function (_, result) {
							res.setHeader ('Content-Length', result.length) ;
							res.end (result) ;
						}) ;
					}
					break ;
			}
		})
		.catch (function (err) {
			console.error (err) ;
			//res.status (err.code || err.statusCode).end (err.message | err.statusMessage) ;
			utils.returnResponseError (res, err) ;
		}) ;
}) ;

module.exports =router ;