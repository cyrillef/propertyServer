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

var oAuth2TwoLegged =null ;
var refreshToken =function (credentials) {
	credentials =credentials || config.credentials ;
	if ( oAuth2TwoLegged === null )
		oAuth2TwoLegged =new ForgeSDK.AuthClientTwoLegged (credentials.client_id, credentials.client_secret, credentials.scope) ;
	oAuth2TwoLegged.authenticate ()
		.then (function (response) {
			console.log ('Token: ' + response.access_token) ;
			oAuth2TwoLegged.setCredentials (response) ;
			setTimeout (refreshToken, (response.expires_in - 300) * 1000) ; // - 5 minutes
		})
		.catch (function (error) {
			setTimeout (refreshToken, 2000) ; // Try again
			console.error ('Token: ERROR! ', error) ;
		})
	;
	return (oAuth2TwoLegged) ;
} ;

module.exports =refreshToken () ;
