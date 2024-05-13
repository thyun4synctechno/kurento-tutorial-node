# RTP

// SDP로 성공한 명령 
gst-launch-1.0 \
    videotestsrc pattern=smpte pattern=snow \
    ! videoconvert ! x264enc tune=zerolatency \
    ! rtph264pay \
    ! udpsink host=127.0.0.1  port=5000 


gst-launch-1.0 \
    videotestsrc pattern=smpte pattern=snow \
    ! videoconvert ! x264enc tune=zerolatency \
    ! rtph264pay \
    ! udpsink  port=15000 



data.iotocean.org 121.137.228.240
localhost 127.0.0.1
KMA 3.38.59.191
macbook 172.16.16.10





gst-launch-1.0 \
    videotestsrc pattern=smpte pattern=snow \
    ! rtph264pay \
    ! udpsink host=127.0.0.1 port=5000 


udpsrc port=5000 ! "application/x-rtp, media=(string)video, clock-rate=(int)90000, encoding-name=(string)H264, payload=(int)96"

// SDP로 성공한 명령 
gst-launch-1.0 \
    udpsrc port=5000 ! "application/x-rtp, media=(string)video, clock-rate=(int)90000, encoding-name=(string)H264, payload=(int)96" \
    ! rtph264pay \
    ! udpsink host=127.0.0.1 port=5000 

gst-launch-1.0 \
    udpsrc port=5001 ! "application/x-rtp, media=(string)video, clock-rate=(int)90000, encoding-name=(string)H264, payload=(int)96" \
    ! udpsink host=127.0.0.1 port=5000 



## 테스트 영상을 만들어서 RTP 페이로드로 만들고, 
#   avdec_h264 : h264 데이터를 디코딩해서 video/x-raw 데이터로 변환
#   ! decodebin ! videoconvert ! autovideosink => raw data를 decode해서 재생 
gst-launch-1.0 \
    videotestsrc pattern=smpte pattern=snow \
    ! videoconvert ! x264enc tune=zerolatency \
    ! rtph264pay \
    ! decodebin ! videoconvert ! autovideosink


## 테스트 영상을 만들어서 RTP 페이로드로 만들고, UDP로 전송
gst-launch-1.0 \
    videotestsrc pattern=smpte pattern=snow \
    ! videoconvert ! x264enc tune=zerolatency \
    ! rtph264pay \
    ! udpsink host=121.137.228.240 port=5000 

## UDP RTP 스트림을 받아서 재생 
gst-launch-1.0 -v  udpsrc port=5000 \
    ! application/x-rtp,encoding-name=H264,payload=26 \
    ! rtph264depay \
    ! decodebin ! videoconvert ! autovideosink

## UDP RTP 스트림을 받아서(5000), RTP Server(5500)로 동작
gst-launch-1.0 -v udpsrc port=5000 \
    ! queue \
    ! udpsink host=172.16.16.10 port=5500 

gst-launch-1.0 -v udpsrc port=5500 \
    ! queue \
    ! udpsink host=127.0.0.1 port=5000 

gst-launch-1.0 -v  udpsrc port=5100 \
    ! application/x-rtp,encoding-name=H264,payload=26 \
    ! rtph264depay \
    ! decodebin ! videoconvert ! autovideosink



# linux send h264 rtp stream:
gst-launch-1.0 -v ximagesrc ! video/x-raw,framerate=20/1 ! videoscale ! videoconvert ! x264enc tune=zerolatency bitrate=500 speed-preset=superfast ! rtph264pay ! udpsink host=127.0.0.1 port=5000

# Macos send h264 rtp stream:
gst-launch-1.0 -v avfvideosrc capture-screen=true ! video/x-raw,framerate=20/1 ! videoscale ! videoconvert ! x264enc tune=zerolatency bitrate=500 speed-preset=superfast ! rtph264pay ! udpsink host=127.0.0.1 port=5000

# receive h264 rtp stream:
gst-launch-1.0 -v  udpsrc port=5000 \
    ! application/x-rtp,encoding-name=H264,payload=26 \
    ! rtph264depay \
    ! decodebin ! videoconvert ! autovideosink


gst-launch-1.0 -v  udpsrc port=5000 address=172.16.16.10 \
    ! application/x-rtp,encoding-name=H264,payload=26 \
    ! rtph264depay \
    ! decodebin ! videoconvert ! autovideosink



gst-launch-1.0 udpsrc port=5000 \
    ! application/x-rtp, encoding-name=H264, payload=96 \
    ! queue \
    ! rtph264depay  \
    ! decodebin ! videoconvert ! autovideosink



gst-launch-1.0 udpsrc port=5000 \
    ! application/x-rtp, encoding-name=H264, payload=96 \
    ! queue \
    ! udpsink host=127.0.0.1 port=5000 




PEER_A=5006 PEER_ASSRC=445566 PEER_V=5004 PEER_VSSRC=112233 PEER_IP=127.0.0.1 \
SELF_A=9006 SELF_V=9004 \
CAPS_A="media=(string)audio,clock-rate=(int)48000,encoding-name=(string)OPUS,payload=(int)96" \
CAPS_V="media=(string)video,clock-rate=(int)90000,encoding-name=(string)H264,payload=(int)103" \
bash -c 'gst-launch-1.0 -e \
    rtpbin name=r sdes="application/x-rtp-source-sdes,cname=(string)\"user\@example.com\"" \
    udpsrc port=$SELF_A \
        ! "application/x-rtp,$CAPS_A" \
        ! r.recv_rtp_sink_0 \
    r.recv_rtp_src_0_${PEER_ASSRC}_96 \
        ! rtpopusdepay \
        ! decodebin \
        ! autoaudiosink \
    udpsrc port=$((SELF_A+1)) \
        ! r.recv_rtcp_sink_0 \
    r.send_rtcp_src_0 \
        ! udpsink host=$PEER_IP port=$((PEER_A+1)) bind-port=$((SELF_A+1)) sync=false async=false \
    udpsrc port=$SELF_V \
        ! "application/x-rtp,$CAPS_V" \
        ! r.recv_rtp_sink_1 \
    r.recv_rtp_src_1_${PEER_VSSRC}_103 \
        ! rtph264depay \
        ! decodebin \
        ! autovideosink \
    udpsrc port=$((SELF_V+1)) \
        ! tee name=t \
        t. ! queue ! r.recv_rtcp_sink_1 \
        t. ! queue ! fakesink dump=true async=false \
    r.send_rtcp_src_1 \
        ! udpsink host=$PEER_IP port=$((PEER_V+1)) bind-port=$((SELF_V+1)) sync=false async=false'




PEER_V=5004 PEER_IP=121.137.228.240 \
SELF_V=9004 \
CAPS_V="media=(string)video,clock-rate=(int)90000,encoding-name=(string)H264,payload=(int)103" \
bash -c 'gst-launch-1.0 -e \
    rtpsession name=r sdes="application/x-rtp-source-sdes,cname=(string)\"user\@example.com\"" \
    udpsrc port=$SELF_V \
        ! "application/x-rtp,$CAPS_V" \
        ! r.recv_rtp_sink \
    r.recv_rtp_src \
        ! udpsink port=5000 \
        ! rtph264depay \
        ! decodebin \
        ! autovideosink \
    udpsrc port=$((SELF_V+1)) \
        ! r.recv_rtcp_sink \
    r.send_rtcp_src \
        ! udpsink host=$PEER_IP port=$((PEER_V+1)) sync=false async=false'




## RTP SENDER
PEER_V=9004 PEER_IP=121.137.228.240 \
SELF_PATH="$PWD/video.mp4" \
bash -c 'gst-launch-1.0 -e \
    videotestsrc pattern=smpte pattern=snow \
        ! videoconvert ! x264enc tune=zerolatency \
        ! rtph264pay \
        ! "application/x-rtp,payload=(int)103,clock-rate=(int)90000" \
        ! udpsink host=$PEER_IP port=$PEER_V'




## RTP Receiver at server

PEER_V=5004 PEER_IP=127.0.0.1 \
SELF_V=9004 \
CAPS_V="media=(string)video,clock-rate=(int)90000,encoding-name=(string)H264,payload=(int)103" \
bash -c 'gst-launch-1.0 -e \
    rtpsession name=r sdes="application/x-rtp-source-sdes,cname=(string)\"user\@example.com\"" \
    udpsrc port=$SELF_V \
        ! "application/x-rtp,$CAPS_V" \
        ! r.recv_rtp_sink \
    r.recv_rtp_src \
        ! udpsink port=5000 \
    udpsrc port=$((SELF_V+1)) \
        ! r.recv_rtcp_sink \
    r.send_rtcp_src \
        ! udpsink host=$PEER_IP port=$((PEER_V+1)) sync=true async=false'



PEER_V=5004 PEER_IP=127.0.0.1 \
SELF_V=9004 \
CAPS_V="media=(string)video,clock-rate=(int)90000,encoding-name=(string)H264,payload=(int)103" \
bash -c 'gst-launch-1.0 -e \
    rtpsession name=r sdes="application/x-rtp-source-sdes,cname=(string)\"user\@example.com\"" \
    udpsrc port=$SELF_V \
        ! "application/x-rtp,$CAPS_V" \
        ! r.recv_rtp_sink \
    r.recv_rtp_src \
        ! rtph264depay \
        ! decodebin \
        ! autovideosink \
    udpsrc port=$((SELF_V+1)) \
        ! r.recv_rtcp_sink \
    r.send_rtcp_src \
        ! udpsink host=$PEER_IP port=$((PEER_V+1)) sync=false async=false'



gst-launch-1.0 videotestsrc ! x265enc option-string="keyint=30:min-keyint=30:repeat-headers=1" ! video/x-h265, mapping=/stream1 ! rtspsink service=5000





docker run --rm \-p 8888:8888/tcp \-p 5000-5050:5000-5050/udp \-e KMS_MIN_PORT=5000 \-e KMS_MAX_PORT=5050 \kurento/kurento-media-server:latest