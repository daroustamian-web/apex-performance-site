/* Apex Performance & Recovery — Boulevard self-booking overlay. */
(function (doc, win) {
  'use strict';

  var BUSINESS_ID = '4bfca922-761f-4393-92d2-40acc43e96ac';
  var LOCATION_ID = '71529583-1475-4cac-9ddd-40ba388ddc41';
  var DEFAULT_PATH = '/cart/menu';
  var CONFIG_TIMEOUT_MS = 1000;
  var SERVICE_PATHS = {};
  var pendingBooking = null;
  var ready = false;
  var loadFailed = false;

  function bookingClient() {
    /* Support injector versions that expose the global binding differently. */
    if (typeof blvd !== 'undefined') return blvd;
    return win.blvd;
  }

  function applyConfiguration(config) {
    var uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

    if (uuid.test(config.boulevardBusinessId || '')) {
      BUSINESS_ID = config.boulevardBusinessId;
    }
    if (uuid.test(config.boulevardLocationId || '')) {
      LOCATION_ID = config.boulevardLocationId;
    }
    if (typeof config.defaultBookingPath === 'string' && config.defaultBookingPath.indexOf('/cart/') === 0) {
      DEFAULT_PATH = config.defaultBookingPath;
    }
    if (config.serviceBookingPaths && typeof config.serviceBookingPaths === 'object') {
      SERVICE_PATHS = config.serviceBookingPaths;
    }
  }

  function openFallback(bookingPath) {
    win.location.assign(
      'https://www.joinblvd.com/b/' + BUSINESS_ID + '/widget' +
      '?locationId=' + encodeURIComponent(LOCATION_ID) +
      '&path=' + encodeURIComponent(bookingPath) +
      '&visitType=SELF_VISIT',
    );
  }

  function resolveBookingPath(bookingPath, service) {
    return (service && SERVICE_PATHS[service]) || bookingPath || DEFAULT_PATH;
  }

  function flushPendingFallback() {
    if (pendingBooking === null) return;

    var booking = pendingBooking;
    pendingBooking = null;
    openFallback(resolveBookingPath(booking.path, booking.service));
  }

  function openBooking(bookingPath, service) {
    if (!ready && !loadFailed) {
      pendingBooking = { path: bookingPath, service: service };
      return;
    }

    bookingPath = resolveBookingPath(bookingPath, service);

    if (loadFailed) {
      openFallback(bookingPath);
      return;
    }

    var client = bookingClient();
    if (!client || typeof client.openBookingWidget !== 'function') {
      openFallback(bookingPath);
      return;
    }

    try {
      client.openBookingWidget({
        newWindow: false,
        urlParams: {
          locationId: LOCATION_ID,
          path: bookingPath,
          visitType: 'SELF_VISIT',
        },
      });
    } catch (error) {
      openFallback(bookingPath);
    }
  }

  doc.addEventListener('click', function (event) {
    var trigger = event.target.closest && event.target.closest('a[href="#book-now"]');
    if (!trigger) return;

    event.preventDefault();
    // Boulevard also delegates #book-now clicks and opens a new mobile tab.
    // This handler is registered first, so stop its duplicate click handler.
    event.stopImmediatePropagation();
    var service = trigger.getAttribute('data-boulevard-service');
    openBooking(trigger.getAttribute('data-boulevard-path'), service);
  });

  function startInjector() {
    var loader = doc.createElement('script');
    loader.src = 'https://static.joinboulevard.com/injector.min.js';
    loader.async = true;
    loader.onload = function () {
      var client = bookingClient();
      if (!client || typeof client.init !== 'function') {
        loadFailed = true;
        flushPendingFallback();
        return;
      }

      try {
        client.init({ businessId: BUSINESS_ID });
      } catch (error) {
        loadFailed = true;
        flushPendingFallback();
        return;
      }

      // The injector waits up to 500 ms for Google Analytics before mounting.
      var initDelay = typeof win.gtag === 'function' ? 550 : 0;
      win.setTimeout(function () {
        ready = true;
        if (pendingBooking === null) return;

        var booking = pendingBooking;
        pendingBooking = null;
        openBooking(booking.path, booking.service);
      }, initDelay);
    };
    loader.onerror = function () {
      loadFailed = true;
      flushPendingFallback();
    };

    var firstScript = doc.querySelector('script');
    if (firstScript && firstScript.parentNode) {
      firstScript.parentNode.insertBefore(loader, firstScript);
    } else {
      doc.head.appendChild(loader);
    }
  }

  if (typeof win.fetch === 'function') {
    var configurationRequest = win.fetch('/site-config.json', { credentials: 'same-origin' })
      .then(function (response) {
        if (!response.ok) throw new Error('Booking configuration unavailable');
        return response.json();
      });
    var configurationTimeout = new Promise(function (resolve) {
      win.setTimeout(function () { resolve(null); }, CONFIG_TIMEOUT_MS);
    });

    Promise.race([configurationRequest, configurationTimeout])
      .then(function (config) {
        if (config) applyConfiguration(config);
      })
      .catch(function () {})
      .then(startInjector);
  } else {
    startInjector();
  }
})(document, window);
