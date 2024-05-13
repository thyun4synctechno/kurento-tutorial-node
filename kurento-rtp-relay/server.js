/*
 * (C) Copyright 2014-2015 Kurento (http://kurento.org/)
 *
 * All rights reserved. This program and the accompanying materials
 * are made available under the terms of the GNU Lesser General Public License
 * (LGPL) version 2.1 which accompanies this distribution, and is available at
 * http://www.gnu.org/licenses/lgpl-2.1.html
 *
 * This library is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNU
 * Lesser General Public License for more details.
 *
 */

var path = require('path');
var cors = require('cors');
var url = require('url');
var cookieParser = require('cookie-parser')
var express = require('express');
var session = require('express-session')
var minimist = require('minimist');
var ws = require('ws');
var kurento = require('kurento-client');
var fs    = require('fs');
var https = require('https');

var argv = minimist(process.argv.slice(2), {
    default: {
        as_uri: 'https://localhost:8443/',
        ws_uri2: 'ws://data.iotocean.org:8888/kurento',
        ws_uri: 'ws://127.0.0.1:8888/kurento'
    }
});

var options =
{
  key:  fs.readFileSync('keys/key.pem'),
  cert: fs.readFileSync('keys/cert.pem')
};

var app = express();

/*
 * Management of sessions
 */
app.use(cors());
app.use(cookieParser());

var sessionParser = session({
    secret : 'secret',
    // rolling : true,
    resave : true,
    noServer: true,
    saveUninitialized : true
});

app.use(sessionParser);

/*
 * Definition of global variables.
 */
var sessions = {};
var candidatesQueue = {};
var kurentoClient = null;

/*
 * Server startup
 */
var asUrl = url.parse(argv.as_uri);
var port = asUrl.port;
var server = https.createServer(options, app);


function onSocketError(err) {
    console.error(err);
}



var wss = new ws.Server({
    server : server,
    path : '/ws'
});


var ttt = 0;

server.on('upgrade', function (request, socket, head) {
    socket.on('error', onSocketError);

    console.log('Parsing session from request...');

    request['sessionID'] = 'randomsessionid'

    // sessionParser(request, {}, () => {
    //     if (!request.session.id) {
    //         socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
    //         socket.destroy();
    //         console.log( 'Socket destroied: session.id is undefined ' )
    //         return;
    //     }

    //     console.log('Session is parsed!');

    //     socket.removeListener('error', onSocketError);

    //     console.log( '----------------------------', ++ttt)

    //     wss.handleUpgrade(request, socket, head, function (ws) {
    //         wss.emit('connection', ws, request);
    //     });
    // });


});






/*
 * Management of WebSocket messages
 */



wss.on('connection', function(socket, request) {
    var sessionId = request.sessionID || 'randomsessionid';
    console.log( "SESSION ID:", sessionId)
    // var response = {
    //     writeHead : {}
    // };

    // console.log('sessionParser: ', socket.request, socket.upgradeReq);


    // sessionParser(request, response, function(err) {


    //     sessionId = request.session.id;
    //     console.log('Connection received with sessionId ' + sessionId);
    // });

    socket.on('error', function(error) {
        console.log('Connection ' + sessionId + ' error');
        stop(sessionId);
    });

    socket.on('close', function() {
        console.log('Connection ' + sessionId + ' closed');
        stop(sessionId);
    });

    socket.on('message', function(_message) {
        var message = JSON.parse(_message);
        console.log('Connection ' + sessionId + ' received message ', message);

        switch (message.id) {
        case 'start':
console.log( 'start: ', sessionId);            
            // sessionId = request.sessionID;
            start(sessionId, ws, message.sdpOffer, message.rtpSdp, function(error, sdpAnswer) {
                if (error) {
                    return socket.send(JSON.stringify({
                        id : 'error',
                        message : error
                    }));
                }
                socket.send(JSON.stringify({
                    id : 'startResponse',
                    sdpAnswer : sdpAnswer
                }));
            });
            break;

        case 'stop':
            console.log( 'stop');            
            stop(sessionId);
            break;

        case 'onIceCandidate':
            console.log( 'onIceCandidate');            
            onIceCandidate(sessionId, message.candidate);
            break;

        default:
            socket.send(JSON.stringify({
                id : 'error',
                message : 'Invalid message ' + message
            }));
            break;
        }

    });
});

/*
 * Definition of functions
 */

// Recover kurentoClient for the first time.
function getKurentoClient(callback) {
    if (kurentoClient !== null) {
        return callback(null, kurentoClient);
    }

    kurento(argv.ws_uri, function(error, _kurentoClient) {
        if (error) {
            console.log("Could not find media server at address " + argv.ws_uri);
            return callback("Could not find media server at address" + argv.ws_uri
                    + ". Exiting with error " + error);
        }

        kurentoClient = _kurentoClient;
        callback(null, kurentoClient);
    });
}

function start(sessionId, ws, sdpOffer, rtpSdp, callback) {
    if (!sessionId) {
        return callback('Cannot use undefined sessionId');
    }

    getKurentoClient(function(error, kurentoClient) {
        if (error) {
            return callback(error);
        }

        kurentoClient.create('MediaPipeline', function(error, pipeline) {
            if (error) {
                return callback(error);
            }

            createMediaElements(pipeline, ws, function(error, webRtcEndpoint, rtpEndpoint) {
                if (error) {
                    pipeline.release();
                    return callback(error);
                }

                if (candidatesQueue[sessionId]) {
                    while(candidatesQueue[sessionId].length) {
                        var candidate = candidatesQueue[sessionId].shift();
                        webRtcEndpoint.addIceCandidate(candidate);
                    }
                }

                connectMediaElements(webRtcEndpoint, rtpEndpoint, function(error) {
                    if (error) {
                        pipeline.release();
                        return callback(error);
                    }

                    // webRtcEndpoint.on('OnIceCandidate', function(event) {
                    //     var candidate = kurento.register.complexTypes.IceCandidate(event.candidate);
                    //     socket.send(JSON.stringify({
                    //         id : 'iceCandidate',
                    //         candidate : candidate
                    //     }));
                    // });

                    webRtcEndpoint.processOffer(sdpOffer, function(error, sdpAnswer) {
                        if (error) {
                            pipeline.release();
                            return callback(error);
                        }

                        sessions[sessionId] = {
                            'pipeline' : pipeline,
                            'webRtcEndpoint' : webRtcEndpoint
                        }

                        console.info("Ready to process RtpEndpoint offer");
                        rtpEndpoint.processOffer(rtpSdp, function(error, rtpSdpAnswer) {
                            if (error){
                               return callback(error);
                            }

                            console.info("This is the RTP Sdp Offer: ");
                            console.info(rtpSdp);
                            console.info("This is the RTP Sdp Answer: ");
                            console.info(rtpSdpAnswer);
                        });

                        return callback(null, sdpAnswer);
                    });

                    webRtcEndpoint.gatherCandidates(function(error) {
                        if (error) {
                            return callback(error);
                        }
                    });
                });
            });
        });
    });
}

function createMediaElements(pipeline, ws, callback) {
    pipeline.create('WebRtcEndpoint', function(error, webRtcEndpoint) {
        if (error) {
            return callback(error);
        }

        pipeline.create('RtpEndpoint', function(error, rtpEndpoint){
            if (error) {
                return callback(error);
            }

            return callback(null, webRtcEndpoint, rtpEndpoint);
        });
    });
}

function connectMediaElements(webRtcEndpoint, rtpEndpoint, callback) {
    webRtcEndpoint.connect(rtpEndpoint, function(error) {
        if (error) {
            return callback(error);
        }

        console.info("WebRtcEndpoint connected to the RtpEndpoint");
        return callback(null);
    });
}

function stop(sessionId) {
    if (sessions[sessionId]) {
        var pipeline = sessions[sessionId].pipeline;
        console.info('Releasing pipeline');
        pipeline.release();

        delete sessions[sessionId];
        delete candidatesQueue[sessionId];
    }
}

function onIceCandidate(sessionId, _candidate) {
    var candidate = kurento.register.complexTypes.IceCandidate(_candidate);

    if (sessions[sessionId]) {
        console.info('Sending candidate');
        var webRtcEndpoint = sessions[sessionId].webRtcEndpoint;
        webRtcEndpoint.addIceCandidate(candidate);
    }
    else {
        console.info('Queueing candidate');
        if (!candidatesQueue[sessionId]) {
            candidatesQueue[sessionId] = [];
        }
        candidatesQueue[sessionId].push(candidate);
    }
}

app.use(express.static(path.join(__dirname, 'static')));

server.listen(port, '0.0.0.0', function() {
    console.log('Kurento Tutorial started');
    console.log('Open ' + url.format(asUrl) + ' with a WebRTC capable browser');
});
