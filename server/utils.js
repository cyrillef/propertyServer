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
// by Cyrille Fauvel - Autodesk Developer Network (ADN)
//
'use strict' ;

var fs =require ('fs') ;
var path =require ('path') ;
var zlib =require ('zlib') ;
var rimraf =require ('rimraf') ;
var mkdirp =require ('mkdirp') ;

var utils ={

	clearUrn: function (urn) {
		urn =urn.replace ('urn:', '') ;
		return (urn) ;
	},

	safeUrnEncode: function (urn, padding) {
		padding =(padding === undefined ? true : padding) ;
		urn =urn.replace ('urn:', '').replace (/\+/g, '-').replace (/=/g, '_') ;
		while ( (urn.length % 4) != 0 )
			urn +='_' ;
		return (urn) ;
	},

	safeUrnDecode: function (urn) {
		urn =urn.replace (/-/g, '+').replace (/_/g, '=') ;
		return (urn) ;
	},

	getVersion: function (versionId) {
		var results =versionId.match (/^urn:(.+)\?version=(\d+)$/) ;
		if ( !results || results.length != 3 )
			return (1) ;
		return (results [2]) ;
	},

	path: function (pathname, closingSlash) {
		closingSlash =closingSlash || '/' ;
		return (path.normalize (path.join (__dirname, '/../', pathname)) + closingSlash) ;
	},

	dataPath: function (pathname, closingSlash) {
		closingSlash =closingSlash || '/' ;
		return (path.normalize (path.join (__dirname, '/../data/', pathname)) + closingSlash) ;
	},

	data: function (name, ext) {
		ext =ext || '.json' ;
		return (path.normalize (path.join (__dirname, '/../data/', name) + ext)) ;
	},

	readFile: function (filename, enc) {
		return (new Promise (function (fulfill, reject) {
			fs.readFile (filename, enc, function (err, res) {
				if ( err )
					reject (err) ;
				else
					fulfill (res) ;
			}) ;
		})) ;
	},

	writeFile: function (filename, content, enc, bRaw) {
		return (new Promise (function (fulfill, reject) {
			var pathname =path.dirname (filename) ;
			utils.mkdirp (pathname)
				.then (function (pathname) {
					fs.writeFile (filename, !bRaw && typeof content !== 'string' ? JSON.stringify (content) : content, enc, function (err) {
						if ( err )
							reject (err) ;
						else
							fulfill (content) ;
					}) ;
				})
			;
		})) ;
	},

	json: function (name) {
		var filename =path.normalize (__dirname + '/../data/' + name + '.json') ;
		return (new Promise (function (fulfill, reject) {
				utils.readFile (filename, 'utf8')
					.then (function (res) {
						try {
							fulfill (JSON.parse (res)) ;
						} catch ( ex ) {
							console.error (ex.message, name) ;
							reject (ex) ;
						}
					}, reject) ;
			})
		) ;
	},

	jsonRoot: function (name) {
		var filename =path.normalize (name) ;
		return (new Promise (function (fulfill, reject) {
				utils.readFile (filename, 'utf8')
					.then (function (res) {
						try {
							fulfill (JSON.parse (res)) ;
						} catch ( ex ) {
							console.error (ex.message, name) ;
							reject (ex) ;
						}
					}, reject) ;
			})
		) ;
	},

	jsonGzRoot: function (name) {
		var filename =path.normalize (name) ;
		return (new Promise (function (fulfill, reject) {
				utils.readFile (filename)
					.then (function (res) {
						zlib.gunzip (res, function (err, dezipped) {
							try {
								fulfill (JSON.parse (dezipped.toString ('utf-8'))) ;
							} catch ( ex ) {
								console.error (ex.message, name) ;
								reject (ex) ;
							}
						}) ;
					}, reject) ;
			})
		) ;
	},

	filesize: function (filename) {
		return (new Promise (function (fulfill, reject) {
			fs.stat (filename, function (err, stat) {
				if ( err )
					reject (err) ;
				else
					fulfill (stat.size) ;
			}) ;
		})) ;
	},

	fileexists: function (filename) {
		return (new Promise (function (fulfill, reject) {
			fs.stat (filename, function (err, stat) {
				if ( err ) {
					if ( err.code === 'ENOENT' )
						fulfill (false) ;
					else
						reject (err) ;
				} else {
					fulfill (true) ;
				}
			}) ;
		})) ;
	},

	findFiles: function (dir, filter) {
		return (new Promise (function (fulfill, reject) {
			fs.readdir (dir, function (err, files) {
				if ( err ) {
					reject (err) ;
					return ;
				}
				if ( filter !== undefined && typeof filter === 'string' )
					files =files.filter (function (file) { return (path.extname (file) === filter) ; }) ;
				else if ( filter !== undefined && typeof filter === 'object' )
					files =files.filter (function (file) { return (filter.test (file)) ; }) ;
				fulfill (files) ;
			}) ;
		})) ;
	},

	walkDirs: function (dir, done) {
		var results =[];
		fs.readdir (dir, function (err, list) {
			if ( err )
				return (done (err)) ;
			var pending =list.length ;
			if ( !pending )
				return (done (null, results)) ;
			list.forEach (function (file) {
				file =path.resolve (dir, file) ;
				fs.stat (file, function (err, stat) {
					if ( stat && stat.isDirectory () ) {
						utils.walkDirs (file, function (err, res) {
							results =results.concat (res) ;
							if ( !--pending )
								done (null, results) ;
						}) ;
					} else {
						results.push (file) ;
						if ( !--pending )
							done (null, results) ;
					}
				}) ;
			}) ;
		}) ;
	},

	findFilesRecursive: function (dir, filter) {
		return (new Promise (function (fulfill, reject) {
			utils.walkDirs (dir, function (err, results) {
				if ( err )
					return (reject (err)) ;
				results =results.map (function (file) { return (file.substring (dir.length)) ; }) ;
				if ( filter !== undefined && typeof filter === 'string' )
					results =results.filter (function (file) { return (path.extname (file) === filter) ; }) ;
				else if ( filter !== undefined && typeof filter === 'object' )
					results =results.filter (function (file) { return (filter.test (file)) ; }) ;
				fulfill (results) ;
			}) ;
		})) ;
	},

	unlink: function (filename) {
		return (new Promise (function (fulfill, reject) {
			fs.stat (filename, function (err, stat) {
				if ( err ) {
					if ( err.code === 'ENOENT' )
						fulfill (false) ;
					else
						reject (err) ;
				} else {
					fs.unlink (filename, function (err) {}) ;
					fulfill (true) ;
				}
			}) ;
		})) ;
	},

	mv: function (oldname, newname) {
		return (new Promise (function (fulfill, reject) {
			fs.stat (oldname, function (err, stat) {
				if ( err ) {
					if ( err.code === 'ENOENT' )
						fulfill (false) ;
					else
						reject (err) ;
				} else {
					fs.rename (oldname, newname, function (err) {}) ;
					fulfill (true) ;
				}
			}) ;
		})) ;
	},

	isCompressed: function (filename) {
		return (   path.extname (filename).toLowerCase () == '.zip'
			|| path.extname (filename).toLowerCase () == '.rar'
			|| path.extname (filename).toLowerCase () == '.gz'
		) ;
	},

	_safeBase64encode: function (st) {
		return (st
				.replace (/\+/g, '-') // Convert '+' to '-'
				.replace (/\//g, '_') // Convert '/' to '_'
				.replace (/=+$/, '')
		) ;
	},

	safeBase64encode: function (st) {
		return (new Buffer (st).toString ('base64')
				.replace (/\+/g, '-') // Convert '+' to '-'
				.replace (/\//g, '_') // Convert '/' to '_'
				.replace (/=+$/, '')
		) ;
	},

	_safeBase64decode: function (base64) {
		// Add removed at end '='
		base64 +=Array (5 - base64.length % 4).join('=') ;
		base64 =base64
			.replace (/\-/g, '+')   // Convert '-' to '+'
			.replace (/\_/g, '/') ; // Convert '_' to '/'
		return (base64) ;
	},

	safeBase64decode: function (base64) {
		// Add removed at end '='
		base64 +=Array (5 - base64.length % 4).join('=') ;
		base64 =base64
			.replace (/\-/g, '+')   // Convert '-' to '+'
			.replace (/\_/g, '/') ; // Convert '_' to '/'
		return (new Buffer (base64, 'base64').toString ()) ;
	},

	readdir: function (pathname) {
		return (new Promise (function (fulfill, reject) {
			fs.readdir (pathname, function (err, files) {
				if ( err )
					reject (err) ;
				else
					fulfill (files) ;
			}) ;
		})) ;
	},

	rimraf: function (pathname) {
		return (new Promise (function (fulfill, reject) {
			rimraf (pathname, function (err) {
				if ( err )
					reject (err) ;
				else
					fulfill (pathname) ;
			}) ;
		})) ;
	},

	mkdirp: function (pathname) {
		return (new Promise (function (fulfill, reject) {
			mkdirp (pathname, function (err) {
				if ( err )
					reject (err) ;
				else
					fulfill (pathname) ;
			}) ;
		})) ;
	},

	checkHost: function (req, domain) {
		//return ( domain === '' || req.headers.referer === domain ) ;
		return (true) ;
	},

	returnResponseError: function (res, err) {
		var msg =err.message || err.statusMessage || 'Internal Failure' ;
		var code =err.code || err.statusCode || 500 ;
		if ( code === 'ENOENT' ) {
			code =404 ;
			msg ='Not Found' ;
		}
		res
		 	.status (code)
		 	.end (msg) ;
	},

	accepts: function (req) {
		if ( req.header ('x-no-compression') !== undefined )
			return ('') ;
		var type =req.header ('Accept-Encoding') ;
		if ( /(gzip)/g.test (type) )
			return ('gzip') ;
		if ( /(deflate)/g.test (type) )
			return ('deflate') ;
		return ('') ;
	},

	authorization: function (req) {
		var bearer =req.header ('Authorization') ;
		if ( bearer === undefined )
			return (null) ;
		var result =bearer.match (/^Bearer\s(.*)$/) ;
		if ( result )
			return (result [1]) ;
		return (null) ;
	},

	csv: function (st) {
		var dbIds =st.split (',') ; // csv format
		dbIds =dbIds.map (function (elt) {
			var r =elt.match (/^(\d+)-(\d+)$/) ;
			if ( r === null ) {
				if ( elt === '*' )
					return (elt) ;
				return (parseInt (elt)) ;
			}
			var t =[] ;
			for ( var i =parseInt (r [1]) ; i <= parseInt (r [2]) ; i++ )
				t.push (i) ;
			return (t) ;
		}) ;
		//return (dbIds) ;
		return ([].concat.apply ([], dbIds)) ;
	},

	logTimeStamp: function (msg) {
		msg =msg || '' ;
		var date =new Date () ;
		var hour =date.getHours () ;
		hour =(hour < 10 ? '0' : '') + hour ;
		var min =date.getMinutes () ;
		min =(min < 10 ? '0' : '') + min ;
		var sec =date.getSeconds () ;
		sec =(sec < 10 ? '0' : '') + sec ;
		var msec =date.getMilliseconds () ;
		console.log (hour + ':' + min + ':' + sec + ':' + msec + ' - ' + msg) ;
	}

} ;

// Array.prototype.flatMap =function (lambda) {
//  	return (Array.prototype.concat.apply ([], this.map (lambda))) ;
// } ;

module.exports =utils ;
