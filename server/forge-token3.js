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
'use strict';

var fs =require ('fs') ;
var ForgeSDK =require ('forge-apis') ;
var config =require ('./config') ;
var utils =require ('./utils') ;

var oAuth2ThreeLegged =null ;
function getOauthClient (credentials) {
	credentials =credentials || config.credentials ;
	if ( oAuth2ThreeLegged === null )
		oAuth2ThreeLegged =new ForgeSDK.AuthClientThreeLegged (credentials.client_id, credentials.client_secret, config.callback, credentials.scope) ;
	return (oAuth2ThreeLegged) ;
}

function getCredentials () {
	var localOauthClient =getOauthClient () ;
	return (localOauthClient.credentials) ;
}

var authorizeUrl =function (credentials) {
	var localOauthClient =getOauthClient (credentials) ;
	return (localOauthClient.generateAuthUrl ()) ;
} ;

var getToken =function (code, credentials) {
	return (new Promise (function (fulfill, reject) {
		var localOauthClient =getOauthClient (credentials) ;
		localOauthClient.getToken (code)
			.then (function (response) {
				console.log ('Token: ' + response.access_token) ;
				localOauthClient.credentials =response ;
				setTimeout (function () { refreshToken (response) ; }, (response.expires_in - 300) * 1000) ; // - 5 minutes
				fulfill (localOauthClient) ;
			})
			.catch (function (error) {
				console.error ('GetToken: ERROR! ', error) ;
				reject (error) ;
			}) ;
	})) ;
} ;

var refreshToken =function (credentials) {
	var localOauthClient =getOauthClient () ;
	localOauthClient.refreshToken (credentials)
		.then (function (response) {
			console.log ('3legged Token: ' + response.access_token) ;
			localOauthClient.credentials =response ;
			setTimeout (function () { refreshToken (response) ; }, (response.expires_in - 300) * 1000) ; // - 5 minutes
		})
		.catch (function (error) {
			//setTimeout (refreshToken, 2000) ; // Try again
			console.error ('Refresh 3legged Token: ERROR! ', error) ;
		})
	;
	return (localOauthClient) ;
} ;

module.exports = {
	authorizeUrl: authorizeUrl,
	getToken: getToken,
	refreshToken: refreshToken,
	getCredentials: getCredentials
} ;
