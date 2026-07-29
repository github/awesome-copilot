/************************************************************************
 * Geocoder - Talks to the OpenStreetMap Nominatim API in both          *
 * directions.                                                          *
 *                                                                      *
 * update() reverse geocodes the camera's latitude/longitude into a     *
 * human-readable location label ("City, State, Country"), falling back *
 * to "Rural <state>, <country>" when the position is not within a      *
 * city/town/village boundary. Requests are throttled by time and by    *
 * minimum movement to respect the Nominatim usage policy (absolute     *
 * maximum of 1 request per second).                                    *
 *                                                                      *
 * search() forward geocodes a typed state/city/country into a list of  *
 * candidate destinations for the destination input dialog.             *
 ***********************************************************************/
var Geocoder = (function () {

    var NOMINATIM = 'https://nominatim.openstreetmap.org/';

    var MIN_INTERVAL_MS = 5000;  // Minimum time between lookups
    var MIN_MOVE_DEG = 0.005;    // Minimum movement (~500m) before a new lookup
    var SEARCH_LIMIT = 10;       // Candidates shown in the results list

    var lastLat = null;
    var lastLng = null;
    var lastRequestTime = 0;
    var lastLabel = '';
    var pending = false;

    /**
     * Builds a display label from a Nominatim address object.
     * Within a city boundary: "City, State, Country".
     * Outside one: "Rural State, Country" (e.g. "Rural New York, United States").
     */
    function buildLabel(address) {
        // Only city/town count as being "within a city"; villages, hamlets,
        // and US civil townships ("Town of X" -> village) read as rural
        var city = address.city || address.town;
        var state = address.state || address.province || address.region ||
                    address.county;
        var country = address.country;
        var parts = [];

        if (city) {
            parts.push(city);
            if (state) parts.push(state);
            if (country) parts.push(country);
        } else {
            var area = state || country;
            if (!area) return '';
            parts.push('Rural ' + area);
            if (state && country) parts.push(country);
        }

        return parts.join(', ');
    }

    /**
     * Requests a label for the given position. Throttled internally,
     * so it is safe to call every frame. Invokes callback(label) only
     * when the label has changed.
     */
    function update(lat, lng, callback) {
        var now = performance.now();
        if (pending || now - lastRequestTime < MIN_INTERVAL_MS) return;
        if (lastLat !== null &&
            Math.abs(lat - lastLat) < MIN_MOVE_DEG &&
            Math.abs(lng - lastLng) < MIN_MOVE_DEG) return;

        pending = true;
        lastRequestTime = now;

        var url = NOMINATIM + 'reverse?format=jsonv2&zoom=10' +
                  '&lat=' + encodeURIComponent(lat) +
                  '&lon=' + encodeURIComponent(lng);

        var xhr = new XMLHttpRequest();
        xhr.open('GET', url, true);
        xhr.onreadystatechange = function () {
            if (xhr.readyState !== 4) return;
            pending = false;
            if (xhr.status !== 200) return; // Keep the last label on failure

            try {
                var data = JSON.parse(xhr.responseText);
                var label = buildLabel(data.address || {});
                lastLat = lat;
                lastLng = lng;
                if (label && label !== lastLabel) {
                    lastLabel = label;
                    callback(label);
                }
            } catch (e) {
                // Malformed response: keep the last label
            }
        };
        xhr.send();
    }

    /**
     * Clears cached state when switching capitals so the next lookup
     * runs immediately for the new location.
     */
    function reset() {
        lastLat = null;
        lastLng = null;
        lastRequestTime = 0;
        lastLabel = '';
        pending = false;
    }

    /**
     * Builds the label shown for one search result:
     * "State, City, CC" (e.g. "New York, New York City, US").
     *
     * Nominatim omits whichever administrative levels a place does not
     * have, so the parts that exist are joined and the raw display_name
     * covers a result that carries no structured address at all.
     */
    function buildResultLabel(item) {
        var address = item.address || {};
        var city = address.city || address.town || address.village ||
                   address.municipality || address.hamlet;
        var state = address.state || address.province || address.region ||
                    address.county;
        var code = address.country_code ? address.country_code.toUpperCase() : '';
        var parts = [];

        if (state) parts.push(state);
        if (city && city !== state) parts.push(city);
        if (code) parts.push(code);

        if (!parts.length) return item.display_name || 'Unknown location';
        return parts.join(', ');
    }

    /**
     * Forward geocodes a destination typed into the input dialog.
     *
     * Fields are optional individually but at least one must be filled;
     * they are sent as Nominatim's structured query parameters rather
     * than concatenated into a free-text string, which keeps a city name
     * that also exists in another country from outranking the match.
     *
     * Calls callback(error, results), where each result is
     * { label, lat, lng, city, country } ready for loadCapital().
     */
    function search(fields, callback) {
        var params = [];
        var keys = ['state', 'city', 'country'];

        for (var i = 0; i < keys.length; i++) {
            var value = (fields[keys[i]] || '').trim();
            if (value) params.push(keys[i] + '=' + encodeURIComponent(value));
        }

        if (!params.length) {
            callback('Enter a state/region, a city, or a country to search.', []);
            return;
        }

        var url = NOMINATIM + 'search?format=jsonv2&addressdetails=1' +
                  '&limit=' + SEARCH_LIMIT + '&' + params.join('&');

        var xhr = new XMLHttpRequest();
        xhr.open('GET', url, true);
        xhr.onreadystatechange = function () {
            if (xhr.readyState !== 4) return;

            if (xhr.status !== 200) {
                callback('Search failed (' + (xhr.status || 'no response') + ').', []);
                return;
            }

            var data;
            try {
                data = JSON.parse(xhr.responseText);
            } catch (e) {
                callback('Search returned a malformed response.', []);
                return;
            }

            if (!data || !data.length) {
                callback(null, []);
                return;
            }

            var results = [];
            for (var i = 0; i < data.length; i++) {
                var item = data[i];
                var lat = parseFloat(item.lat);
                var lng = parseFloat(item.lon);
                if (isNaN(lat) || isNaN(lng)) continue;

                var address = item.address || {};
                results.push({
                    label: buildResultLabel(item),
                    lat: lat,
                    lng: lng,
                    city: address.city || address.town || address.village ||
                          item.name || 'Destination',
                    country: address.country || ''
                });
            }

            callback(null, results);
        };
        xhr.onerror = function () {
            callback('Search could not reach the geocoding service.', []);
        };
        xhr.send();
    }

    return {
        update: update,
        reset: reset,
        search: search
    };
})();
