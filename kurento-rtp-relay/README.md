[![License badge](https://img.shields.io/badge/license-LGPL-blue.svg)](http://www.gnu.org/licenses/lgpl-2.1.html)
[![Documentation badge](https://readthedocs.org/projects/fiware-orion/badge/?version=latest)](http://doc-kurento.readthedocs.org/en/latest/)
[![Docker badge](https://img.shields.io/docker/pulls/fiware/orion.svg)](https://hub.docker.com/r/fiware/stream-oriented-kurento/)
[![Support badge]( https://img.shields.io/badge/support-sof-yellowgreen.svg)](http://stackoverflow.com/questions/tagged/kurento)

[![][KurentoImage]][Kurento]

Copyright © 2013-2017 [Kurento]. Licensed under [LGPL v2.1 License].

kurento-rtp-relay
===================

A simple RTP Video Relay example for Kurento Media Server.
This example is based on kurento-hello-world example, and connects and WebRtcEndpoint
to a RtpEndpoint, which acts like a bridge to any destination capable of processing
RTP video.

This was tested in a scenario where kurento media server and kurent-rtp-relay app
both run in the same machine. Also, the destination machine
(the one which the RTP video flow is sent to) was in the same network.
