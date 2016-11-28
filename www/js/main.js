/** Defining the endpoint**/
var endpoint = "http://vontell-highlights-ironchefpython.c9users.io/api/";
var home = "/Highlights"

/** CORS **/
allowCrossDomain = function(req, res, next) {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, Content-Length, X-Requested-With');
    if ('OPTIONS' === req.method) {
        res.send(200);
    } else {
        next();
    }
};

/** Utility function to send data **/
function post(route, data, $http, callback) {
    $http({
            method: 'POST',
            url: endpoint + route,
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            transformRequest: function(obj) {
                var str = [];
                for (var p in obj)
                    str.push(encodeURIComponent(p) + "=" + encodeURIComponent(obj[p]));
                return str.join("&");
            },
            data: data
        }).success(function(data, status, headers, config) {
            callback(data);
        })
        .error(function(data, status, header, config) {

            console.log("Error:" + data);
        });
}

/** Utility function to get data **/
function get(route, params, $http, callback) {
    var config = {
        params: params
    };

    $http.get(endpoint + route, config)
        .success(function(data, status, headers, config) {
            callback(data);
        })
        .error(function(data, status, header, config) {
            console.log(header);
            console.log("Error:" + data);
        });
}

/** Utility function for trimming title **/
function trimTitle(string, length) {
    return string.length > length ?
        string.substring(0, length - 3) + "..." :
        string;
}

/** Look inside array of dicts **/
function findVideo(arr, vid_id) {
    for (i = 0; i < arr.length; i++) {
        if (arr[i]["video_id"] == vid_id)
            return true;
    }
    return false;
}

/** Shuffle an array **/
function shuffle(a) {
    for (let i = a.length; i; i--) {
        let j = Math.floor(Math.random() * i);
        [a[i - 1], a[j]] = [a[j], a[i - 1]];
    }
}

/** Calculate the dimensions of the boxes **/
function getStyle() {
    container_width = $('.list_highlights').width();
    box_width = 0;
    if (container_width / 4 <= 100)
        box_width = (container_width / 2 - 7) + 'px';
    else {
        div_coeff = 4;
        while (container_width / div_coeff > 150)
            div_coeff++;
        box_width = (container_width / div_coeff - 7) + 'px';
    }
    return {
        'width': box_width
    }
}
var player;

function onYouTubeIframeAPIReady() {
    player = new YT.Player('player', {
        width: '100%',
        videoId: 'M7lc1UVf-VE',
        playerVars: {
            controls: 0,
            disablekb: 1,
            showinfo: 0
        },
        events: {
            'onReady': onPlayerReady
        }
    });
}

// 4. The API will call this function when the video player is ready.
function onPlayerReady(event) {
    angular.element(document.getElementById('youtube_player')).scope().play();
}

/** The app starts here **/
var app = angular.module('spotlight', ['ngRoute']).config(function($httpProvider, $routeProvider) {
    $httpProvider.defaults.withCredentials = true;
    $routeProvider
    // .when('/', {
    //     templateUrl: 'highlights.html',
    //     controller: 'HighlightsCtrl'
    // })
        .when('/', {
            templateUrl: 'player.html',
            controller: 'PlayerCtrl'
        }).otherwise({ redirectTo: '/' });

}).run(function($rootScope, $http, $window) {

    /** root scope **/
    $rootScope.Play = function(channel_id, video_id) {
        url = home + "/#v=" + ((video_id) ? video_id : "") + "&c=" + ((channel_id) ? channel_id : "");
        $rootScope.current_vid = video_id;
        $rootScope.current_cid = channel_id;
        $window.location.assign(url);
    }

    /** List of subscriptions **/
    $rootScope.subscriptions = [];
    $rootScope.getSubscriptions = function(subscriptions) {
        temp = []
        for (i = 0; i < subscriptions["items"].length; i++) {
            subscription = subscriptions["items"][i]["snippet"];
            temp.push({
                title: subscription["title"],
                channel_id: subscription['resourceId']["channelId"],
                channel_image: subscription["thumbnails"]["default"]["url"],
                short_title: trimTitle(subscription["title"], 17)
            });
        }
        $rootScope.subscriptions = temp;
    }
    get('subscriptions', {}, $http, $rootScope.getSubscriptions);

}).controller('ChannelBarCtrl', function($scope, $http, $window) {
    $scope.smallScreen = ($window.innerWidth <= 600);
    $(window).resize(function() {
        $scope.$apply(function() {
            $scope.smallScreen = ($window.innerWidth <= 600);
        });
    });

}).controller('HighlightsCtrl', function($scope, $http, $rootScope, $window) {
    /** Asjust the width of the items **/
    $scope.highlight_style = getStyle();

    /** List of highlights **/
    $scope.highlights = [];
    $scope.newVideos = [];
    $scope.fetchingHighlights = false;
    $scope.videos = [];
    $scope.getHighlights = function() {
        if ($scope.highlights.length == 0 && !$scope.fetchingHighlights) {
            $scope.fetchingHighlights = true;
            for (i = 0; i < Math.min(8, $rootScope.subscriptions.length); i++) {
                channel_id = $rootScope.subscriptions[i]["channel_id"];
                get('channels/' + channel_id + '/videos', {}, $http, function(data) {
                    channel = {
                        channel_id: '',
                        channel_title: '',
                        channel_short_title: '',
                        channel_image: '',
                        n_highlights: 0
                    };

                    if (data["items"]) {
                        for (j = 0; j < data["items"].length * 0.3; j++) {

                            video = data["items"][j];
                            if (!findVideo($scope.videos, video.id.videoId)) {
                                $scope.videos.push({
                                    video_id: video.id.videoId,
                                    video_title: video.snippet.title,
                                    video_image: video.snippet.thumbnails.high.url,
                                    channel_id: video.snippet.channelId,
                                    video_short_title: trimTitle(video.snippet.title, 20)
                                });
                                shuffle($scope.videos);
                                $scope.newVideos = $scope.videos.slice(0, 10);

                            }

                            if (channel['channel_id'] == '') {
                                channel['channel_id'] = video['snippet']['channelId'];
                                channel['channel_title'] = video['snippet']['channelTitle'];
                                channel['channel_short_title'] = trimTitle(channel['channel_title'], 20);
                            }
                            if (channel["channel_image"] == '')
                                channel["channel_image"] = video["snippet"]["thumbnails"]["high"]["url"];

                            channel["n_highlights"]++;
                        }
                        if (channel["n_highlights"] > 0)
                            $scope.highlights.push(channel);
                    }

                });
            }
        }
    }

    /** Load the highlights **/
    $scope.$watch(function() {
        return $rootScope.subscriptions;
    }, function() {
        if ($rootScope.subscriptions.length > 0)
            $scope.getHighlights();
    }, true);

    /** On resize **/
    $(window).resize(function() {
        $scope.$apply(function() {
            $scope.highlight_style = getStyle();
        });
    });

}).controller('PlayerCtrl', function($scope, $http, $rootScope, $window) {
    /** List of highlights **/
    $scope.highlights = [{
        "highlights": [{
            "avrg_bspeed": 0.1090141620096071,
            "end": 27.94458333333333,
            "start_frame": 225,
            "max_brightness": 69.12764362373737,
            "end_frame": 335,
            "max_bspeed": 0.13837594696969696,
            "start": 18.768749999999997,
            "position": 0,
            "duration": 9.175833333333333,
            "avrg_brightness": 12.775965697082768
        }, {
            "avrg_bspeed": 0.13864113585213375,
            "end": 48.79875,
            "start_frame": 495,
            "max_brightness": 88.64654356060606,
            "end_frame": 585,
            "max_bspeed": 0.19689078282828282,
            "start": 41.29125,
            "position": 0,
            "duration": 7.507499999999999,
            "avrg_brightness": 10.641848169191919
        }, {
            "avrg_bspeed": 0.1435274879537729,
            "end": 57.97458333333333,
            "start_frame": 605,
            "max_brightness": 96.94227430555556,
            "end_frame": 695,
            "max_bspeed": 0.17956912878787878,
            "start": 50.46708333333333,
            "position": 0,
            "duration": 7.507499999999999,
            "avrg_brightness": 8.868122831280427
        }, {
            "avrg_bspeed": 0.18570046850026417,
            "end": 78.82875,
            "start_frame": 865,
            "max_brightness": 125.73532196969697,
            "end_frame": 945,
            "max_bspeed": 0.42830650252525254,
            "start": 72.15541666666667,
            "position": 0,
            "duration": 6.673333333333333,
            "avrg_brightness": 8.402713686133824
        }],
        "video_id": "7QpJ_VDbIPA",
        "image_url": "http://img.youtube.com/vi/7QpJ_VDbIPA/mqdefault.jpg",
        "video_url": "https://www.youtube.com/watch?v=7QpJ_VDbIPA",
        "title": "MacBook Pro with TOUCHBAR Review"
    }, {
        "highlights": [{
            "avrg_bspeed": 0.03967590456551022,
            "end": 31.281249999999996,
            "start_frame": 265,
            "max_brightness": 79.31668244949495,
            "end_frame": 375,
            "max_bspeed": 0.04758522727272727,
            "start": 22.105416666666667,
            "position": 0,
            "duration": 9.175833333333333,
            "avrg_brightness": 11.492917718855217
        }, {
            "avrg_bspeed": 0.06252047107965895,
            "end": 42.125416666666666,
            "start_frame": 375,
            "max_brightness": 107.90194917929293,
            "end_frame": 505,
            "max_bspeed": 0.49656723484848486,
            "start": 31.281249999999996,
            "position": 0,
            "duration": 10.844166666666666,
            "avrg_brightness": 27.394093706245624
        }, {
            "avrg_bspeed": 0.08078807126304974,
            "end": 67.98458333333333,
            "start_frame": 505,
            "max_brightness": 90.55366161616162,
            "end_frame": 815,
            "max_bspeed": 0.42787247474747475,
            "start": 42.125416666666666,
            "position": 0,
            "duration": 25.859166666666663,
            "avrg_brightness": 32.133965711563484
        }],
        "video_id": "l-yrXB95qDo",
        "image_url": "http://img.youtube.com/vi/l-yrXB95qDo/mqdefault.jpg",
        "video_url": "https://www.youtube.com/watch?v=l-yrXB95qDo",
        "title": "i'm ending the vlog"
    }, {
        "highlights": [{
            "avrg_bspeed": 0.06467741478553118,
            "end": 16.26625,
            "start_frame": 115,
            "max_brightness": 44.33672664141414,
            "end_frame": 195,
            "max_bspeed": 0.4356455176767677,
            "start": 9.592916666666666,
            "position": 0,
            "duration": 6.673333333333333,
            "avrg_brightness": 10.9510185994561
        }, {
            "avrg_bspeed": 0.1602871661148806,
            "end": 69.65291666666666,
            "start_frame": 495,
            "max_brightness": 66.84777462121212,
            "end_frame": 835,
            "max_bspeed": 0.36158459595959597,
            "start": 41.29125,
            "position": 0,
            "duration": 28.361666666666665,
            "avrg_brightness": 25.5874576604367
        }],
        "video_id": "lJAwaLNnVBs",
        "image_url": "http://img.youtube.com/vi/lJAwaLNnVBs/mqdefault.jpg",
        "video_url": "https://www.youtube.com/watch?v=lJAwaLNnVBs",
        "title": "Oscar's NASTY FALL"
    }, {
        "highlights": [{
            "avrg_bspeed": 0.033998927193720656,
            "end": 17.934583333333332,
            "start_frame": 125,
            "max_brightness": 113.42321654040404,
            "end_frame": 215,
            "max_bspeed": 0.04703282828282828,
            "start": 10.427083333333332,
            "position": 0,
            "duration": 7.507499999999999,
            "avrg_brightness": 34.37492934431525
        }, {
            "avrg_bspeed": 0.043974850131979354,
            "end": 31.281249999999996,
            "start_frame": 225,
            "max_brightness": 59.65617108585859,
            "end_frame": 375,
            "max_bspeed": 0.22072285353535354,
            "start": 18.768749999999997,
            "position": 0,
            "duration": 12.5125,
            "avrg_brightness": 23.187435290404043
        }, {
            "avrg_bspeed": 0.07053781861932196,
            "end": 47.96458333333333,
            "start_frame": 435,
            "max_brightness": 80.95797821969697,
            "end_frame": 575,
            "max_bspeed": 0.25919349747474746,
            "start": 36.286249999999995,
            "position": 0,
            "duration": 11.678333333333333,
            "avrg_brightness": 17.33495210254721
        }],
        "video_id": "tFH6zuT-yPI",
        "image_url": "http://img.youtube.com/vi/tFH6zuT-yPI/mqdefault.jpg",
        "video_url": "https://www.youtube.com/watch?v=tFH6zuT-yPI",
        "title": "Trump won"
    }, {
        "highlights": [{
            "avrg_bspeed": 0.1926170872252397,
            "end": 98.84875,
            "start_frame": 945,
            "max_brightness": 135.32279829545453,
            "end_frame": 1185,
            "max_bspeed": 0.35175978535353536,
            "start": 78.82875,
            "position": 0,
            "duration": 20.02,
            "avrg_brightness": 16.927639395004903
        }, {
            "avrg_bspeed": 0.20280048261598085,
            "end": 126.37624999999998,
            "start_frame": 1205,
            "max_brightness": 82.78353851010101,
            "end_frame": 1515,
            "max_bspeed": 0.22770675505050506,
            "start": 100.51708333333333,
            "position": 0,
            "duration": 25.859166666666663,
            "avrg_brightness": 13.507747259100912
        }],
        "video_id": "mXwQbrstb38",
        "image_url": "http://img.youtube.com/vi/mXwQbrstb38/mqdefault.jpg",
        "video_url": "https://www.youtube.com/watch?v=mXwQbrstb38",
        "title": "leaving new york city"
    }];

    $scope.suggestions = [{
        "images": [
            "images/h1.jpg",
            "images/h2.jpg"
        ],
        "guid": "59930cc5-c271-4266-af6a-d0419395712c",
        "title": "labore eiusmod adipisicing proident pariatur sint",
        "_id": "583140e81566a658200e06cf"
    }, {
        "images": [
            "images/h1.jpg",
            "images/h2.jpg"
        ],
        "guid": "a9084082-a7ee-4233-96e0-19252971a7b7",
        "title": "laboris do voluptate quis aliqua reprehenderit",
        "_id": "583140e8acc626a5f8553b06"
    }, {
        "images": [
            "images/h1.jpg",
            "images/h2.jpg",
            "images/h3.jpg",
            "images/h4.jpg"
        ],
        "guid": "f65911af-6dca-47ce-83aa-044b86e4295f",
        "title": "fugiat aliquip ex in ipsum fugiat",
        "_id": "583140e8f860cd03cb12335b"
    }, {
        "images": [
            "images/h1.jpg",
            "images/h2.jpg",
            "images/h3.jpg",
            "images/h4.jpg"
        ],
        "guid": "5fc18670-e120-4be9-b64d-f288a8027c69",
        "title": "et cillum eu aute minim incididunt",
        "_id": "583140e896557c50fa889932"
    }, {
        "images": [
            "images/h1.jpg",
            "images/h2.jpg"
        ],
        "guid": "9e5d4996-afae-4ac7-9fc9-c14d7ecfbedd",
        "title": "amet minim consequat sit fugiat proident",
        "_id": "583140e8249089444f7987c5"
    }, {
        "images": [
            "images/h1.jpg",
            "images/h2.jpg",
            "images/h3.jpg",
            "images/h4.jpg",
            "images/h5.jpg"
        ],
        "guid": "337bf80d-ae31-4f33-bc41-ae9d1c63c173",
        "title": "labore cupidatat minim est ipsum laborum",
        "_id": "583140e85bc36fba36ee6ce3"
    }, {
        "images": [
            "images/h1.jpg",
            "images/h2.jpg",
            "images/h3.jpg",
            "images/h4.jpg",
            "images/h5.jpg",
            "images/h6.jpg"
        ],
        "guid": "1f9bedf7-8ffe-41a2-9a71-cd6381874f7a",
        "title": "ut cupidatat ut magna officia eu",
        "_id": "583140e853b1b6e30379ee63"
    }, {
        "images": [
            "images/h1.jpg",
            "images/h2.jpg"
        ],
        "guid": "94504971-6dcc-4074-bf7b-f6c85a24aa2d",
        "title": "magna aute quis officia nostrud nostrud",
        "_id": "583140e8e469379c3afb28c8"
    }];

    for (i = 0; i < $scope.highlights.length; i++) {
        $scope.highlights[i]["short_title"] = trimTitle($scope.highlights[i]["title"], 40);
    }
    for (i = 0; i < $scope.suggestions.length; i++) {
        $scope.suggestions[i]["short_title"] = trimTitle($scope.suggestions[i]["title"], 40);
    }


    $scope.playing = true;
    $scope.currentHighlightIndex = 0;
    $scope.currentVideoIndex = 0;
    $scope.play = function() {
        channel_id = $rootScope.current_cid;
        video_id = $rootScope.current_vid;

        //console.log("Player is now playing video " + $rootScope.current_vid + " on channel " + $rootScope.current_cid);
        if ($rootScope.current_vid == undefined &&
            $rootScope.current_cid == undefined) {
            $window.location.assign(home);
        }

        if ($rootScope.current_vid == undefined) {
            get('channels/' + channel_id + '/videos', {}, $http, function(data) {
                $scope.suggestions = data;
            });
        }


        get('video/' + channel_id + '/video', {}, $http, function(data) {
            $scope.suggestions = data;
        });

        /** Play the first video **/
        $scope.playVideo(0, 0);

        /** Waiting for highlight to finish **/
        setInterval($scope.pollVideos, 1000);
    }

    $scope.pollVideos = function() {
        tot_videos = $scope.highlights.length;
        tot_highlights = $scope.highlights[$scope.currentVideoIndex]["highlights"].length;
        highlight = $scope.highlights[$scope.currentVideoIndex]["highlights"][$scope.currentHighlightIndex];
        start_time = highlight["start"];
        end_time = highlight["end"];
        current_time = player.getCurrentTime();
        finish = current_time - start_time > highlight["duration"];

        if (finish) {

            if ($scope.currentHighlightIndex + 1 < tot_highlights) {
                $scope.currentHighlightIndex++;
                $scope.playVideo($scope.currentVideoIndex, $scope.currentHighlightIndex);
            } else {
                $scope.currentVideoIndex++;
                $scope.currentHighlightIndex = 0;
                if ($scope.currentVideoIndex < tot_videos)
                    $scope.playVideo($scope.currentVideoIndex, $scope.currentHighlightIndex);
                else
                    player.stopVideo();
            }
        }
    }

    $scope.playVideo = function(j, i) {
        highlight = $scope.highlights[j]["highlights"][i];
        start_time = highlight["start"];
        player.loadVideoById($scope.highlights[j]["video_id"], start_time, undefined);
        player.playVideo();
    }

    $scope.getRelatedVideos = function(){
        get('videos/'+$rootScope)
    }

    if ($('.player_container') != undefined) {
        var tag = document.createElement('script');
        tag.src = "https://www.youtube.com/iframe_api";
        var firstScriptTag = document.getElementsByTagName('script')[0];
        firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
    }
});
