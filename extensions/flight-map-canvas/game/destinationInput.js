/***********************************************************************
 * DestinationInput - Keyboard entry for destinations that are not one  *
 * of the built-in capitals.                                            *
 *                                                                      *
 * Opened from the "Input Destination" entry at the top of the          *
 * destination menu. The dialog runs in two stages:                     *
 *                                                                      *
 *   1. Form    - state/region and city are typed, country is picked    *
 *                from the menu. Any one of the three is enough.        *
 *   2. Results - the matches the geocoder returned, one per row.       *
 *                Picking one and pressing Select flies there.          *
 *                                                                      *
 * The dialog owns the keyboard while it is open: flight input already  *
 * ignores events from form fields, and the shortcuts below stop at     *
 * the dialog so a typed letter never reaches the simulator.            *
 ***********************************************************************/
var DestinationInput = (function () {

    var dialog, formStage, resultsStage;
    var stateInput, cityInput, countrySelect;
    var formMessage, resultsMessage, resultList;
    var searchBtn, selectBtn;

    var onSelect = null;
    var onOpen = null;
    var onClose = null;

    var results = [];
    var activeIndex = -1;
    var searching = false;
    var isOpen = false;

    /* ------------------------------------------------------------
       Country menu
       ------------------------------------------------------------ */

    /**
     * Fills the country menu from the capitals dataset, which is the
     * only list of country names the page ships with. Leaving the menu
     * on its first entry searches without a country filter.
     */
    function populateCountries() {
        if (typeof CAPITALS_BY_REGION === 'undefined') return;

        var seen = {};
        var names = [];

        for (var i = 0; i < CAPITALS_BY_REGION.length; i++) {
            var capitals = CAPITALS_BY_REGION[i].capitals;
            for (var j = 0; j < capitals.length; j++) {
                var country = capitals[j].country;
                if (seen[country]) continue;
                seen[country] = true;
                names.push(country);
            }
        }

        names.sort();

        for (var k = 0; k < names.length; k++) {
            var option = document.createElement('option');
            option.value = names[k];
            option.textContent = names[k];
            countrySelect.appendChild(option);
        }
    }

    /* ------------------------------------------------------------
       Stage switching
       ------------------------------------------------------------ */

    function showForm() {
        formStage.classList.remove('hidden');
        resultsStage.classList.add('hidden');
        resultsMessage.textContent = '';
    }

    function showResults() {
        formStage.classList.add('hidden');
        resultsStage.classList.remove('hidden');
        formMessage.textContent = '';
    }

    function setSearching(active) {
        searching = active;
        searchBtn.disabled = active;
        searchBtn.textContent = active ? 'Searching...' : 'Search';
    }

    /* ------------------------------------------------------------
       Results list
       ------------------------------------------------------------ */

    function renderResults() {
        resultList.innerHTML = '';

        for (var i = 0; i < results.length; i++) {
            var row = document.createElement('li');
            row.className = 'dest-result';
            // Focus stays on the listbox, so each option needs an id for
            // the list's aria-activedescendant to point a reader at it
            row.id = 'dest-result-' + i;
            row.setAttribute('role', 'option');
            row.setAttribute('aria-selected', 'false');
            row.dataset.index = String(i);
            row.textContent = results[i].label;
            resultList.appendChild(row);
        }

        setActiveIndex(results.length ? 0 : -1);
    }

    function setActiveIndex(index) {
        activeIndex = index;
        var rows = resultList.children;

        for (var i = 0; i < rows.length; i++) {
            var active = i === index;
            rows[i].classList.toggle('active', active);
            rows[i].setAttribute('aria-selected', active ? 'true' : 'false');
        }

        selectBtn.disabled = index < 0;

        // Point the listbox at the option the arrow keys landed on, and
        // drop the reference entirely when nothing is active
        if (index >= 0 && rows[index]) {
            resultList.setAttribute('aria-activedescendant', rows[index].id);
            if (rows[index].scrollIntoView) {
                rows[index].scrollIntoView({ block: 'nearest' });
            }
        } else {
            resultList.removeAttribute('aria-activedescendant');
        }
    }

    function moveActive(step) {
        if (!results.length) return;
        var next = activeIndex + step;
        if (next < 0) next = 0;
        if (next > results.length - 1) next = results.length - 1;
        setActiveIndex(next);
    }

    /* ------------------------------------------------------------
       Actions
       ------------------------------------------------------------ */

    function runSearch() {
        if (searching) return;

        formMessage.textContent = '';
        setSearching(true);

        Geocoder.search({
            state: stateInput.value,
            city: cityInput.value,
            country: countrySelect.value
        }, function (error, found) {
            setSearching(false);

            if (error) {
                formMessage.textContent = error;
                return;
            }

            results = found;
            renderResults();
            showResults();

            resultsMessage.textContent = found.length
                ? ''
                : 'No matching destination was found. Cancel to adjust the search.';

            if (found.length) resultList.focus();
        });
    }

    function commitSelection() {
        if (activeIndex < 0 || !results[activeIndex]) return;
        var chosen = results[activeIndex];
        close();
        if (onSelect) onSelect(chosen);
    }

    /* ------------------------------------------------------------
       Open / close
       ------------------------------------------------------------ */

    function open() {
        if (isOpen) return;
        isOpen = true;

        results = [];
        activeIndex = -1;
        // Rows from the previous search are stale the moment the form
        // reopens, so nothing should still be pointing at one of them
        resultList.removeAttribute('aria-activedescendant');
        formMessage.textContent = '';
        setSearching(false);
        showForm();

        dialog.classList.remove('hidden');
        if (onOpen) onOpen();
        stateInput.focus();
        stateInput.select();
    }

    function close() {
        if (!isOpen) return;
        isOpen = false;

        dialog.classList.add('hidden');
        if (onClose) onClose();
    }

    /* ------------------------------------------------------------
       Wiring
       ------------------------------------------------------------ */

    /**
     * Binds the dialog. options:
     *   onSelect(destination) - a result the user picked
     *   onOpen()              - the dialog became visible
     *   onClose()             - the dialog was dismissed or committed
     */
    function init(options) {
        options = options || {};
        onSelect = options.onSelect || null;
        onOpen = options.onOpen || null;
        onClose = options.onClose || null;

        dialog = document.getElementById('destination-dialog');
        if (!dialog) return;

        formStage = document.getElementById('destination-form');
        resultsStage = document.getElementById('destination-results');
        stateInput = document.getElementById('dest-state');
        cityInput = document.getElementById('dest-city');
        countrySelect = document.getElementById('dest-country');
        formMessage = document.getElementById('dest-form-message');
        resultsMessage = document.getElementById('dest-results-message');
        resultList = document.getElementById('dest-result-list');
        searchBtn = document.getElementById('dest-search');
        selectBtn = document.getElementById('dest-select');

        populateCountries();

        searchBtn.addEventListener('click', runSearch);
        selectBtn.addEventListener('click', commitSelection);
        document.getElementById('dest-cancel').addEventListener('click', close);
        document.getElementById('dest-results-cancel').addEventListener('click', close);

        // Enter submits from any field in the form stage
        formStage.addEventListener('keydown', function (e) {
            if (e.key === 'Enter') {
                e.preventDefault();
                runSearch();
            }
        });

        // Click a row to highlight it, double click to fly straight there
        resultList.addEventListener('click', function (e) {
            var row = e.target.closest ? e.target.closest('.dest-result') : null;
            if (!row) return;
            setActiveIndex(parseInt(row.dataset.index, 10));
        });

        resultList.addEventListener('dblclick', function (e) {
            var row = e.target.closest ? e.target.closest('.dest-result') : null;
            if (!row) return;
            setActiveIndex(parseInt(row.dataset.index, 10));
            commitSelection();
        });

        resultList.addEventListener('keydown', function (e) {
            if (e.key === 'ArrowDown') {
                e.preventDefault();
                moveActive(1);
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                moveActive(-1);
            } else if (e.key === 'Enter') {
                e.preventDefault();
                commitSelection();
            }
        });

        // Escape closes from anywhere inside the dialog, and clicking the
        // backdrop outside the card does the same
        dialog.addEventListener('keydown', function (e) {
            if (e.key === 'Escape') {
                e.preventDefault();
                e.stopPropagation();
                close();
            }
        });

        dialog.addEventListener('mousedown', function (e) {
            if (e.target === dialog) close();
        });
    }

    return {
        init: init,
        open: open,
        close: close,
        isOpen: function () { return isOpen; }
    };
})();
