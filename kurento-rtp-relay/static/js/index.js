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

var ws = null; 
var videoInput;
var videoOutput;
var webRtcPeer;
var state = null;
var destinationIp;
var destinationPort;
var rtpSdp;

const I_CAN_START = 0;
const I_CAN_STOP = 1;
const I_AM_STARTING = 2;


try {
	var ws = new WebSocket('wss://localhost:8443/ws');
}
catch(ex) {
	console.log( ex );
}


window.onload = function() {
	console = new Console();
	console.log('Page loaded ...');
	videoInput = document.getElementById('videoInput');
	videoOutput = document.getElementById('videoOutput');
	setState(I_CAN_START);
	destinationIp = document.getElementById('destinationIp')
	destinationPort = document.getElementById('destinationPort')
	rtpSdp = document.getElementById('rtpSdp');
	destinationIp.oninput = updateRtpSdp;
	destinationPort.oninput = updateRtpSdp;
	updateRtpSdp();
}

window.onbeforeunload = function() {
	ws.close();
}

ws.onmessage = function(message) {
	var parsedMessage = JSON.parse(message.data);
	console.info('Received message: ' + message.data);

	switch (parsedMessage.id) {
	case 'startResponse':
		startResponse(parsedMessage);
		break;
	case 'error':
		if (state == I_AM_STARTING) {
			setState(I_CAN_START);
		}
		onError('Error message from server: ' + parsedMessage.message);
		break;
	case 'iceCandidate':
		webRtcPeer.addIceCandidate(parsedMessage.candidate)
		break;
	default:
		if (state == I_AM_STARTING) {
			setState(I_CAN_START);
		}
		onError('Unrecognized message', parsedMessage);
	}
}

function start() {
	console.log('Starting video call ...')

	// Disable start button
	setState(I_AM_STARTING);
	showSpinner(videoInput);

	console.log('Creating WebRtcPeer and generating local sdp offer ...');

    var options = {
      localVideo: videoInput,
      onicecandidate : onIceCandidate
    }

    webRtcPeer = kurentoUtils.WebRtcPeer.WebRtcPeerSendrecv(options, function(error) {
        if(error) return onError(error);
        this.generateOffer(onOffer);
    });
}

function onIceCandidate(candidate) {
	   console.log('Local candidate' + JSON.stringify(candidate));

	   var message = {
	      id : 'onIceCandidate',
	      candidate : candidate
	   };
	   sendMessage(message);
}

function onOffer(error, offerSdp) {
	if(error) return onError(error);

	console.info('Invoking SDP offer callback function ' + location.host);
	var message = {
		id : 'start',
		sdpOffer : offerSdp,
		rtpSdp : rtpSdp.value
	}
	console.log("This is the offer sdp:");
	console.log(offerSdp);
	sendMessage(message);
}

function onError(error) {
	console.error(error);
}

function startResponse(message) {
	setState(I_CAN_STOP);
	console.log('SDP answer received from server. Processing ...');
	webRtcPeer.processAnswer(message.sdpAnswer);
}

function stop() {
	console.log('Stopping video call ...');
	setState(I_CAN_START);
	if (webRtcPeer) {
		webRtcPeer.dispose();
		webRtcPeer = null;

		var message = {
			id : 'stop'
		}
		sendMessage(message);
	}
	hideSpinner(videoInput, videoOutput);
}

function setState(nextState) {
	switch (nextState) {
	case I_CAN_START:
		$('#start').attr('disabled', false);
		$('#start').attr('onclick', 'start()');
		$('#stop').attr('disabled', true);
		$('#stop').removeAttr('onclick');
		break;

	case I_CAN_STOP:
		$('#start').attr('disabled', true);
		$('#stop').attr('disabled', false);
		$('#stop').attr('onclick', 'stop()');
		break;

	case I_AM_STARTING:
		$('#start').attr('disabled', true);
		$('#start').removeAttr('onclick');
		$('#stop').attr('disabled', true);
		$('#stop').removeAttr('onclick');
		break;

	default:
		onError('Unknown state ' + nextState);
		return;
	}
	state = nextState;
}

function sendMessage(message) {
	var jsonMessage = JSON.stringify(message);
	console.log('Senging message: ' + jsonMessage);
	ws.send(jsonMessage);
}

function showSpinner() {
	for (var i = 0; i < arguments.length; i++) {
		arguments[i].poster = './img/transparent-1px.png';
		arguments[i].style.background = 'center transparent url("./img/spinner.gif") no-repeat';
	}
}

function hideSpinner() {
	for (var i = 0; i < arguments.length; i++) {
		arguments[i].src = '';
		arguments[i].poster = './img/webrtc.png';
		arguments[i].style.background = '';
	}
}

function forceEvenRtpPort(rtpPort) {
	if ((rtpPort > 0) && (rtpPort % 2 != 0))
		return rtpPort - 1;
	else return rtpPort;
}

function updateRtpSdp() {
	var destination_ip;
	var destination_port;

	if (!destinationIp.value)
		destination_ip="127.0.0.1";
	else
		destination_ip = destinationIp.value.trim();

	if (!destinationPort.value)
		destination_port="33124";
	else
		destination_port = forceEvenRtpPort(destinationPort.value.trim());

	rtpSdp.value = 'v=0\n'
	+ 'o=- 0 0 IN IP4 ' + destination_ip + '\n'
	+ 's=livestream\n'
	+ 'c=IN IP4 ' + destination_ip + '\n'
	+ 't=0 0\n'
	+ 'm=video ' + destination_port + ' RTP/AVP 100\n'
	+ 'a=rtpmap:100 H264/90000\n';



// 	rtpSdp.value = `v=0
// m=video ${destination_port} RTP/AVP 96
// c=IN IP4 ${destination_ip}
// a=rtpmap:96 H264/90000`
}
