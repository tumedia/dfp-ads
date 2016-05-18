(function (factory) {
    if (typeof define === 'function' && define.amd) {
        // AMD. Register as an anonymous module.
        define([], factory);
    } 
    else if (typeof exports === 'object') {
        // Node/CommonJS
        factory(require());
    } 
    else {
        // Browser globals
        factory();
    }
}(function () {
    var document = window.document;
    var ads = {};
    var scriptLoaded = false;

    var hasClass = function(el, className) {
        return !!~el.className.indexOf(className);
    };

    var addClass = function(el, className) {
        if (!hasClass(el, className))
            el.className += " " + className;
    };

    var removeClass = function(el, className) {
        if (hasClass(el, className)) {
            var regex = new RegExp(className, "g");
            el.className = el.className.replace(regex, "").trim();
        }
    };

    var later = function(fn,t) {
        return setTimeout(fn, t||0);
    };

    var getOffset = function(el,offset) {
        if (!el)
            return;
        offset = offset || {top:0,left:0};
        offset.top += el.offsetTop;
        offset.left += el.offsetLeft;
        getOffset(el.offsetParent, offset);
        offset.right = offset.left + el.clientWidth;
        offset.bottom = offset.top + el.clientHeight;
        return offset;
    };

    var isOnScreen = function(el) {
        if (el.offsetParent === null) {
            return false;
        }
        var viewport = {
            top: (window.pageYOffset !== "undefined") ? window.pageYOffset : (document.documentElement || document.body.parentNode || document.body).scrollTop,
            left: (window.pageXOffset !== "undefined") ? window.pageXOffset : (document.documentElement || document.body.parentNode || document.body).scrollLeft
        };
        viewport.right = viewport.left + window.innerWidth;
        viewport.bottom = viewport.top + window.innerHeight;
        var bounds = getOffset(el);
        return (!(viewport.right < bounds.left || viewport.left > bounds.right || viewport.bottom < bounds.top || viewport.top > bounds.bottom));
    };

    ads.placements = {
        ids: [],
        load: [],
        lazy: []
    };

    ads.selector = ".ad-placeholder";

    ads.config = {
        dfpID: null,
        enableSingleRequest: true,
        refreshExisting: true,
        setCategoryExclusion: '',
        setLocation: '',
        setTargeting: {},
        sizeMapping: {},
        disableInitialLoad: false,
        disablePublisherConsole: false,
        namespace: undefined,
        collapseEmptyDivs: true,
        afterEachAdLoaded: null,
        afterAllAdsLoaded: null
    };

    ads.setConfig = function(config) {
        for (var i in config) {
            this.config[i] = config[i];
        };
    };

    ads.initConfig = function() {
        var googletag = window.googletag;
        var self = this;
        googletag.cmd.push(function() {
            var pubadsService = googletag.pubads();
            
            if (self.config.enableSingleRequest) {
                pubadsService.enableSingleRequest();
            }
            
            for (var i in self.config.setTargeting) {
                pubadsService.setTargeting(i, self.config.setTargeting[i]);
            }

            if (self.config.collapseEmptyDivs) {
                pubadsService.collapseEmptyDivs();
            }

            if (self.config.disablePublisherConsole) {
                pubadsService.disablePublisherConsole();
            }

            if (self.config.companionAds) {
                googletag.companionAds().setRefreshUnfilledSlots(true);

                if (!self.config.disableInitialLoad) {
                    pubadsService.enableVideoAds();
                }
            }

            if (self.config.disableInitialLoad) {
                pubadsService.disableInitialLoad();
            }

            if (self.config.noFetch) {
                pubadsService.noFetch();
            }

            // Setup event listener to listen for renderEnded event and fire callbacks.
            pubadsService.addEventListener('slotRenderEnded', function (event) {                
                var placementId = event.slot.getSlotId().getDomId(),
                    placement;
                for (i=0; i < self.placements['load'].length; i++) {
                    var p = self.placements['load'][i];
                    if (p.adContainerId == placementId) {
                        var placement = p;
                        break;
                    }
                }
                var display = event.isEmpty ? 'none' : 'block';

                removeClass(placement.el, 'display-none');
                addClass(placement.el, 'display-'+display);
                addClass(placement.el, 'ad-loaded');

                // Excute afterEachAdLoaded callback if provided
                if (typeof self.config.afterEachAdLoaded === 'function') {
                    self.config.afterEachAdLoaded.call(this, placement, event);
                }

                // Excute afterAllAdsLoaded callback if provided
                if (typeof self.config.afterAllAdsLoaded === 'function' && rendered === count) {
                    self.config.afterAllAdsLoaded.call(this, self.placements);
                }

            });

            googletag.enableServices();
        });
    };

    ads.init = function(config, selector) {
        this.loadScript();
        this.setConfig(config);
        if (selector) {
            this.selector = selector;
        }
    };

    ads.loadScript = function() {
        scriptLoaded = scriptLoaded || document.querySelectorAll('script[src*="googletagservices.com/tag/js/gpt.js"]').length;
        if (scriptLoaded) {
            return;
        }

        window.googletag = window.googletag || {};
        window.googletag.cmd = window.googletag.cmd || [];

        var script = document.createElement('script');
        script.async = true;
        script.type = 'text/javascript';
        var useSSL = 'https:' == document.location.protocol;
        script.src = (useSSL ? 'https:' : 'http:') + '//www.googletagservices.com/tag/js/gpt.js';
        var node = document.getElementsByTagName('script')[0];
        script.onreadystatechange=script.onload=function() {
            if (!script.readyState||/loaded|complete/.test(script.readyState)) {
                scriptLoaded = true;
                script.onreadystatechange=script.onload=null;
            }
        };
        node.parentNode.insertBefore(script, node);
    };

    ads.loadAd = function(placement) {
        placement.el.innerHTML = "";        
        var googletag = window.googletag;
        var self = this;
        googletag.cmd.push(function() {
            if (self.config.refreshExisting && hasClass(placement.el, 'ad-loaded')) {
                googletag.pubads().refresh([placement.googleAdSlot]);
            }
            else {
                googletag.display(placement.adContainerId);
            }
        });
    };

    ads.addPlacement = function(placement, list) {
        if (this.placements.ids[placement.placement]) {
            return;
        }
        if (list == "lazy") {
            this.placements.lazy.push(placement);
        }
        else {
            this.placements.load.push(placement);
        }
        this.placements.ids[placement.placement] = list;
    };

    ads.fetchAdElement = function(el) {
        if (!el || this.placements.ids[el.id]) {
            return;
        }
        var width = window.innerWidth || document.documentElement.clientWidth;
        if (el.dataset.minWidth || el.dataset.maxWidth) {
            var minWidth = parseInt(el.dataset.minWidth),
                maxWidth = parseInt(el.dataset.maxWidth);
            if (width < minWidth || width > maxWidth) {
                el.style.display = "none";
                return;
            }
        }

        var self = this;
        var googletag = window.googletag;

        googletag.cmd.push(function() {
            el.id = el.id || "ad-" + el.dataset.name;
            placement = {};
            placement.placement = el.id;
            placement.adContainerId = el.id;          

            var dimensions = [];
            if (el.dataset.dimensions) {
                var dimensionGroups = el.dataset.dimensions.split(',');
                for (var i in dimensionGroups) {
                    var dimensionSet = dimensionGroups[i].split('x');
                    dimensions.push([parseInt(dimensionSet[0], 10), parseInt(dimensionSet[1], 10)]);
                }
            }
            else {
                dimensions.push([el.clientWidth, el.clientHeight]);
            }
            
            if (el.dataset.outofpage) {
                var googleAdSlot = googletag.defineOutOfPageSlot('/' + self.config.dfpID + '/' + el.dataset.name, el.id);
            }
            else {
                var googleAdSlot = googletag.defineSlot('/' + self.config.dfpID + '/' + el.dataset.name, dimensions, el.id);
                if (el.dataset.companion) {
                    googleAdSlot = googleAdSlot.addService(googletag.companionAds());
                }
            }
            googleAdSlot = googleAdSlot.addService(googletag.pubads());

            if (el.dataset.targeting) {
                for (var i in el.dataset.targeting) {
                    googleAdSlot.setTargeting(i, el.dataset.targeting[i]);
                }
            }

            if (el.dataset.exclusions) {
                var exclusionsGroup = el.dataset.exclusions.split(',');
                var valueTrimmed;
                for (var i in exclusionsGroup) {
                    valueTrimmed = exclusionsGroup[i].trim();
                    if (valueTrimmed.length > 0) {
                        googleAdSlot.setCategoryExclusion(valueTrimmed);
                    }
                }
            }

            if (el.dataset.sizeMapping) {
                var mapping = el.dataset.sizeMapping;
                if (self.config.sizeMapping[mapping]) {
                    var map = googletag.sizeMapping();
                    for (var i in self.config.sizeMapping[mapping]) {
                        map.addSize(self.config.sizeMapping[mapping][i].browser, self.config.sizeMapping[mapping][i].ad_sizes);
                    }
                    googleAdSlot.defineSizeMapping(map.build());
                }
            }

            placement.googleAdSlot = googleAdSlot;
            placement.el = el;

            if (typeof self.config.beforeEachAdLoaded === 'function') {
                self.config.beforeEachAdLoaded.call(this, placement);
            }
            var method = el.dataset.method && self.placements[el.dataset.method] ? el.dataset.method : "lazy";
            self.addPlacement(placement, method);
        });
    };

    ads.fetchAdElements = function() {
        var containers = document.querySelectorAll(this.selector);        
        for (var i=0, length=containers.length; i<length; i++) {
            var el = containers[i];
            if (el.dataset.name && !hasClass(el,'ad-loaded')) {
                this.fetchAdElement(el);
            }
        }
    };

    ads.lazyLoad = function() {
        var that = this;
        function scroll() {
            if (that.placements.lazy.length) {
                var lazy = [];
                for (var i in that.placements.lazy) {
                    var placement = that.placements.lazy[i];
                    if (placement.el && isOnScreen(placement.el)) {
                        that.loadAd(placement);
                        that.placements.load.push(placement);
                    }
                    else {
                        lazy.push(placement);
                    }
                }
                that.placements.lazy = lazy;
            }
            else {
                window.removeEventListener('scroll', scroll);
            }
        }
        window.addEventListener('scroll', scroll);
        scroll();
    };

    ads.reloadAd = function(placementName) {
        for (var method in this.placements) {
            if (method.length) {
                for (var i in this.placements[method]) {
                    var placement = this.placements[method][i];
                    if (placement.placement == placementName && document.getElementById(placement.adContainerId)) {
                        this.loadAd(placement);
                        break;
                    }
                }
            }
        }
    };

    ads.requestAds = function() {
        if (this.placements.load.length) {
            for (var i in this.placements.load) {
                if (document.getElementById(this.placements.load[i].adContainerId))
                    this.loadAd(this.placements.load[i]);
            }
        }
        if (this.placements.lazy.length) {
            this.lazyLoad();
        }
    };

    ads.pageLoad = function() {
        var self = this;
        var googletag = window.googletag;
        googletag.cmd.push(function() {
            self.fetchAdElements();
            self.initConfig();
            self.requestAds();
        });
    };

    return ads;

}));
