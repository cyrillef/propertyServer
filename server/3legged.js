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
'use strict' ; // http://www.w3schools.com/js/js_strict.asp

var express =require ('express') ;
var request =require ('request') ;
var url =require ('url') ;
var querystring =require ('querystring') ;
var config =require ('./config') ;
var forgeToken3 =require ('./forge-token3') ;

var router =express.Router () ;

router.get ('/3legged', function (req, res) {
	res.redirect (forgeToken3.authorizeUrl ()) ;
}) ;

var q =url.parse (config.callback, true) ;
router.get (q.pathname, function (req, res) {
	var qs =querystring.parse (req._parsedUrl.query) ;
	//console.log (qs) ;
	var code =qs.code ;
	forgeToken3.getToken (code)
		.then (function (response) {
			console.log (JSON.stringify (response.credentials)) ;
			res.json (response.credentials) ;
		})
		.catch (function (error) {
			console.error ('Getting token failed! ' + error) ;
		}) ;
}) ;

module.exports =router ;