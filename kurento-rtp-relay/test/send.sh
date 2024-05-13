# PEER_V=9004 PEER_IP=121.137.228.240 \
# bash -c 'gst-launch-1.0 -e \
#     videotestsrc pattern=smpte pattern=snow \
#         ! videoconvert ! x264enc tune=zerolatency \
#         ! rtph264pay \
#         ! "application/x-rtp,payload=(int)103,clock-rate=(int)90000" \
#         ! udpsink host=$PEER_IP port=$PEER_V'

#   127.0.0.1
#   121.137.228.240
#   3.38.59.191


PEER_V=9004 \
PEER_IP=127.0.0.1 \
SELF_V=5004 SELF_VSSRC=112233 \
bash -c 'gst-launch-1.0 -e \
    rtpsession name=r sdes="application/x-rtp-source-sdes,cname=(string)\"user\@example.com\"" \
    videotestsrc pattern=smpte pattern=snow \
        ! videoconvert ! x264enc tune=zerolatency \
        ! rtph264pay mtu=2048 \
        ! queue min-threshold-bytes=2048 \
        ! "application/x-rtp,payload=(int)96,clock-rate=(int)90000,ssrc=(uint)$SELF_VSSRC" \
        ! r.send_rtp_sink \
    r.send_rtp_src \
        ! queue min-threshold-bytes=2048 \
        ! udpsink host=$PEER_IP port=$PEER_V auto-multicast=true \
    udpsrc port=$((SELF_V+1)) \
        ! r.recv_rtcp_sink'        