var TiltOpen = (function() {
  var polyAddEventListener = function polyAddEventListener(element, event, callback) {
    var attachEventFn = element.addEventListener ? 'addEventListener' : 'attachEvent';
    element[attachEventFn](attachEventFn === 'attachEvent' ? 'on' + event : event, callback, false);
  }

  function getURLParameter(name) {
    return decodeURIComponent((new RegExp('[?|&]' + name + '=' + '([^&;]+?)(&|#|;|$)').exec(location.search) || [,""])[1].replace(/\+/g, '%20')) || null;
  }
  function removeCssClass(el, classToRemove) {
    if (el && el.className && classToRemove) {
      el.className = el.className.replace(new RegExp('(?:^|\\s)' + classToRemove + '(?!\\S)', 'g'), '');
    }
    return el;
  }
  function addCssClass(el, classToAdd) {
    if (el && classToAdd) {
      el.className = el.className + ' ' + classToAdd;
    }
    return el;
  }
  function readCookie(name){
    try {
      return(document.cookie.match('(^|; )'+name+'=([^;]*)')||0)[2]
    }catch(e){
      console.log('no cookie support')
    }
  }
  function writeCookie(name, value){
    var date = new Date()
    date = new Date(date.setMonth(date.getMonth()+1)).toString()

    var domain = '.'+location.hostname.split('.').slice(1).join('.');
    try {
      document.cookie = name + '=' + value + ';path=/;domain=' + domain + ';expires=' + date;
    }catch(e){
      console.log('no cookie support')
    }
  }
  var _internals = {},
      _iframes = {};
  var _this = TiltOpen = {};
  TiltOpen.init = function() {
    _internals.scrollTouches = {};
    var parsedButtons = _this.findAndParseAllButtons();

    if (!parsedButtons.length) {
      console.log('Missing data-ct-checkout. Please confirm that the checkout.js script is located before the closing body tag');
      return;
    }

    if (getURLParameter('modal') === 'true') {
      parsedButtons[0].openiFrameOnLoad = true;
    }

    _this.storeReferrer();
    _this.storeQueryString();
    _this.bindButtons(parsedButtons);
    _this.injectLoader();
    _this.injectiFrames(parsedButtons);
    _this.injectCss();
    _this.bindCloseMessage();
  };
  TiltOpen.storeQueryString = function() {
    var qs = encodeURIComponent(window.location.search.slice(1))

    if (qs === ""){
      return;
    }
    writeCookie("ck_query_string", qs);
  };
  TiltOpen.storeReferrer = function() {
    if(!document.referrer){
      return;
    }
    if (document.referrer.indexOf(location.protocol + "//" + location.host) === 0){
      return;
    }
    if (document.referrer  ===  "" || document.referrer === null){
      return;
    }
    var referrer = encodeURIComponent(document.referrer)
    writeCookie("ck_document_referrer", referrer);
  };
  TiltOpen.injectiFrames = function(parsedButtons) {
    for (var i = 0, len = parsedButtons.length; i < len; i++) {
      _this.injectiFrame(parsedButtons[i]);
    }
  };
  TiltOpen.injectiFrame = function(parsedButton) {
    if (_iframes[parsedButton.key] === undefined) {
      var iframe = _this.generateiFrame(parsedButton);
      _iframes[parsedButton.key] = {
        iframe: iframe,
        iframeLoaded: false,
        openiFrameOnLoad: !!parsedButton.openiFrameOnLoad
      };
      document.body.appendChild(iframe);
    }
  };
  TiltOpen.bindCloseMessage = function() {
    polyAddEventListener(window, 'message', function(e) {
      if (e.data == "closeCTiFrame") {
        _this.hideiFrames();
      }else if(e.data == "closeSSlWarning"){
        writeCookie("hide_ssl_warning", "1");
      }
    });
  };
  TiltOpen.bindButtons = function(parsedButtons) {
    for (var i = 0; i < parsedButtons.length; i++) {
      var handler = _this.genButtonClickHandler(parsedButtons[i]);
      polyAddEventListener(parsedButtons[i].button, 'click', handler);
      polyAddEventListener(parsedButtons[i].button, 'touchmove', function(e) {
        for (var j = 0; j < e.changedTouches.length; j++) {
          _internals.scrollTouches[e.changedTouches[j].identifier] = true;
        }
      });
      polyAddEventListener(parsedButtons[i].button, 'touchend', function(e) {
        for (var j = 0; j < e.changedTouches.length; j++) {
          var currentTouch = e.changedTouches[i];
          var isStaticTouch = !(_internals.scrollTouches[currentTouch.identifier]);
          delete _internals[currentTouch.identifier];
          if (isStaticTouch) {
            handler(e);
          }
        }
      });
      polyAddEventListener(parsedButtons[i].button, 'touchcancel', function(e) {
        for (var j = 0; j < e.changedTouches.length; j++) {
          delete _internals[e.changedTouches[i].identifier];
        }
      });
    }
  };
  TiltOpen.geniFrameLoadHandler = function(checkoutString) {
    return function() {
      var iframeObj = _iframes[checkoutString];
      if (iframeObj && iframeObj.iframe) {
        iframeObj.iframeLoaded = true;
        if (iframeObj.openiFrameOnLoad) {
          _this.showiFrame(checkoutString);
        }
      }
    };
  };
  TiltOpen.genButtonClickHandler = function(parsedButton) {
    return function(e) {
      e.preventDefault();
      if (parsedButton.rewardId) {
        _this.selectedRewardId = parsedButton.rewardId;
      }
      if (parsedButton.attributes) {
        _this.selectedAttributes = parsedButton.attributes;
      }
      var iframeObj = _iframes[parsedButton.key];
      if (iframeObj) {
        if (iframeObj.iframeLoaded) {
          _this.showiFrame(parsedButton.key);
        } else {
          iframeObj.openiFrameOnLoad = true;
        }
      } else {
        console.log('No iframe for checkoutString:', parsedButton.key);
      }
    };
  };
  TiltOpen.injectLoader = function() {
    var loaderBg = document.createElement('div');
    loaderBg.setAttribute('id', 'cto-checkout-loading');
    loaderBg.setAttribute('style', 'width: 100%; height: 100%; position: fixed; background-color: rgba(0,0,0,0.7); top: 0; z-index: 9998; display: none');

    var loaderImage = document.createElement('img');
    loaderImage.setAttribute('id', 'tilt-loader-img');
    loaderImage.setAttribute('src', 'https://s3.amazonaws.com/crowdtiltopen/CrowdtiltOpen/assets/tilt_loader.gif');
    loaderImage.setAttribute('style', 'width: 40px; height: 40px; position: absolute; top: 50%; left: 50%;');

    loaderBg.appendChild(loaderImage);

    _internals.loaderBg = loaderBg;
    _internals.loaderImage = loaderImage;

    document.body.appendChild(loaderBg);
  };
  TiltOpen.generateiFrame = function(parsedButton) {
    var subdomain = parsedButton.subdomain,
        campaign = parsedButton.campaign,
        urlParams = parsedButton.urlParams;

    if(parsedButton.type && parsedButton.type === "manage_orders"){
        var url = `https://${subdomain}.tilt.com/${campaign}/manage-order`;
    } else {
        var url = `https://${subdomain}.tilt.com/${campaign}/checkout/payment`;
    }

    var iframe = document.createElement('iframe');
    url += (url.indexOf('?') > -1 ? '&' : '?') + 'utmr='+encodeURI(document.referrer);

    if (typeof(urlParams) === 'object') {
      for (var key in urlParams) {
        if (urlParams.hasOwnProperty(key) && urlParams[key]) {
          url += '&'+key+'='+urlParams[key];
        }
      }
    }

    iframe.setAttribute('src', url);
    iframe.setAttribute('frameborder', 0);
    iframe.setAttribute('allowTransparency', true);
    iframe.setAttribute('class', 'ctopen_checkout');
    iframe.setAttribute('style', 'z-index: 9999; display: none; background-color: transparent; border: 0px none transparent; overflow-x: hidden; overflow-y: auto; visibility: visible; margin: 0px; padding: 0px; -webkit-tap-highlight-color: transparent; position: absolute; left: 0px; width: 100%; height: 100%; top: 0; ' + 'margin-top: ' + _this.getCurrentTop() + 'px;');
    polyAddEventListener(iframe, 'load', _this.geniFrameLoadHandler(parsedButton.key));

    return iframe;
  };
  TiltOpen.showLoader = function() {
    _internals.loaderBg.style.display = 'block';
    _internals.loaderImage.style.display = 'block';
  };
  TiltOpen.showiFrame = function(checkoutString) {
    var iframeObj = _iframes[checkoutString];
    if (iframeObj && iframeObj.iframe) {
      _this.hideiFrames();

      if (_this.selectedRewardId) {
        iframeObj.iframe.contentWindow.postMessage(['select reward', parseInt(_this.selectedRewardId)], '*');
      }
      if (_this.selectedAttributes) {
        console.log('posting', encodeURI(_this.selectedAttributes));
        iframeObj.iframe.contentWindow.postMessage(['select attributes', encodeURI(_this.selectedAttributes)], '*');
      }
      if(readCookie('hide_ssl_warning') !== "1"){
        iframeObj.iframe.contentWindow.postMessage(['send current url', {protocol: document.location.protocol, url:document.location.href}], '*');
      }
      _internals.loaderBg.style.display = 'block';
      _internals.loaderImage.style.display = 'none';
      iframeObj.iframe.contentWindow.postMessage('show iframe', '*');
      iframeObj.iframe.contentWindow.postMessage(['send referrer', {qs: readCookie('ck_query_string')||"", referrer: readCookie('ck_document_referrer')||""}], '*');
      iframeObj.iframe.style.marginTop = _this.getCurrentTop() + 'px';
      iframeObj.iframe.style.display = 'block';
      iframeObj.iframe.focus();
      addCssClass(document.body, 'tilt-hide-overflow');
    }
  };
  TiltOpen.hideiFrames = function() {
    _internals.loaderBg.style.display = 'none';
    for (var checkoutString in _iframes) {
      if (_iframes.hasOwnProperty(checkoutString)) {
        _this.hideiFrame(checkoutString);
      }
    }
    removeCssClass(document.body, 'tilt-hide-overflow');
  };
  TiltOpen.hideiFrame = function(checkoutString) {
    var iframeObj = _iframes[checkoutString];
    if (iframeObj && iframeObj.iframe) {
      iframeObj.iframe.style.display = 'none';
    }
  };
  TiltOpen.getCurrentTop = function() {
    if (window.pageYOffset !== undefined) {
      return window.pageYOffset;
    } else {
      return (document.documentElement || document.body.parentNode || document.body).scrollTop;
    }
  };
  TiltOpen.injectCss = function() {
    var css = '.tilt-hide-overflow { overflow: hidden; position: static; }',
        head = document.head || document.getElementsByTagName('head')[0],
        style = document.createElement('style');
    style.type = 'text/css';
    if (style.styleSheet){
      style.styleSheet.cssText = css;
    } else {
      style.appendChild(document.createTextNode(css));
    }
    head.appendChild(style);
  };
  TiltOpen.findAndParseAllButtons = function() {
    var buttons = document.querySelectorAll('[data-ct-checkout]');
    var parsedButtons = [];
    for (var i = 0, len = buttons.length; i < len; i++) {
      var parsedButton = _this.parseButtonData(buttons[i]);
      if (parsedButton) {
        parsedButtons.push(parsedButton);
      }
    }
    return parsedButtons;
  };
  TiltOpen.parseButtonData = function(button) {
    var checkoutString = button.getAttribute('data-ct-checkout'),
        rewardId       = button.getAttribute('data-ct-reward'),
        attributes     = button.getAttribute('data-ct-attributes'),
        quantity       = button.getAttribute('data-ct-quantity'),
        type           = button.getAttribute('data-ct-type') || "";

    if (!checkoutString) {
      console.log('Expected to have data-ct-checkout for element:', button);
      return undefined;
    }

    var path = checkoutString.split('.'),
        subdomain = path[0],
        campaign = path[1];

    if (!subdomain || !campaign) {
      console.log('Malformed data-ct-checkout for element:', button);
      return undefined;
    }
    var urlParams = {};

    urlParams.code = button.getAttribute('data-ct-referral-code');
    var urlReferral = getURLParameter('ct-referral-code');
    if (urlReferral) { urlParams.code = urlReferral; }

    urlParams.custom_meta = button.getAttribute('data-ct-custom-meta');

    urlParams.promo_code = button.getAttribute('data-ct-promo-code');
    var urlPromo = getURLParameter('ct-promo-code');
    if (urlPromo) { urlParams.promo_code = urlPromo; }

    if (quantity) {
      urlParams.quantity = quantity;
      checkoutString += '.' + quantity;
    }

    var gaObj;
    if (window.ga && typeof(window.ga) === 'function') {
      gaObj = ga;
    } else if (window.__gaTracker && typeof(window.__gaTracker) === 'function') {
      gaObj = __gaTracker;
    }

    if (gaObj) {
      gaObj(function(tracker) {
        if (typeof(tracker) === 'undefined' && typeof(gaObj.getAll) === 'function') {
          tracker = gaObj.getAll()[0];
        }

        if (tracker && tracker.get('linkerParam')) {
          var linkerParts = tracker.get('linkerParam').split('=');
          if (linkerParts.length === 2) { urlParams._ga = linkerParts[1]; }
        }
      });
    }

    return {
      button: button,
      checkoutString: checkoutString,
      campaign: campaign,
      subdomain: subdomain,
      urlParams: urlParams,
      rewardId: rewardId,
      attributes : attributes,
      type : type,
      key : checkoutString + type
    };
  };
  return _this;
})();
setTimeout(function() {
  TiltOpen.init();
}, 100);
